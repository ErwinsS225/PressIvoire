-- =============================================================================
--  PressingPro — Migration 010 : le plan n'appartient qu'a la plateforme
--
--  PROBLEME MESURE
--  La policy « pressings: mise a jour par le proprietaire ou l'admin du
--  pressing » porte sur la LIGNE, pas sur les COLONNES. Un gerant pouvait donc
--  ecrire `subscription_plan` et `subscription_expires_at` comme il ecrivait
--  son nom ou son horaires. Verifie par un test d'ecriture reel, avec une
--  session de proprietaire :
--
--      PATCH /pressings?id=eq.<son pressing>
--      { "subscription_plan": "pro",
--        "subscription_expires_at": "+1 an" }
--      -> HTTP 200, plan passe a `pro`
--
--  Autrement dit : n'importe quel gerant pouvait s'attribuer le plan payant,
--  gratuit et pour un an, en un appel HTTP. C'est une perte de revenu
--  directe, et elle s'ouvre des la premiere vente.
--
--  CE QUE FAIT CETTE MIGRATION
--  1. Un trigger BEFORE UPDATE interdit la modification de ces deux colonnes,
--     SAUF depuis un chemin privilegie (la plateforme).
--  2. `set_pressing_subscription()` fournit ce chemin legitime : c'est elle
--     qui sera appelee quand CinetPay confirmera un paiement. Elle est
--     accessible au seul `service_role` (l'API d'administration), pas aux
--     utilisateurs connects.
--
--  CE QUE CETTE MIGRATION NE FAIT PAS
--  Elle ne touche pas a `pressings.owner_id`, qui reste modifiable par le
--  proprietaire (cf. migration 011 a prevoir si le besoin se fait sentir).
--
--  Appliquer : node scripts/db-apply.mjs --file supabase/migrations/010_*.sql
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. GARDES SUR LES COLONNES DE PLAN
--
--    `current_user` et non `session_user` : PostgREST se connecte avec
--    `authenticator` puis fait un SET ROLE, donc `session_user` vaut
--    toujours `authenticator` et ne distinguerait personne. C'est
--    `current_user` qui vaut `authenticated` pour un appel utilisateur et
--    `service_role` pour un appel d'administration.
--
--    `postgres` est ajoute parce que c'est le role du SQL Editor et des
--    migrations : sans lui, on ne pourrait plus corriger un plan a la main.
-- -----------------------------------------------------------------------------
create or replace function public.pressings_guard_subscription()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_plan is distinct from old.subscription_plan
     or new.subscription_expires_at is distinct from old.subscription_expires_at
  then
    if current_user not in ('postgres', 'service_role', 'supabase_admin') then
      raise exception
        'Le plan et sa date d''expiration sont geres par PressingPro et ne peuvent pas etre modifies depuis un compte.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pressings_guard_subscription on public.pressings;
create trigger pressings_guard_subscription
  before update on public.pressings
  for each row
  execute function public.pressings_guard_subscription();

-- -----------------------------------------------------------------------------
-- 2. LE CHEMIN LEGITIME — activation / renouvellement
--
--    C'est cette fonction que l'appelera la confirmation de paiement. Elle
--    ecrit les deux tables concernees dans UNE transaction : un abonnement
--    actif sans ligne d'historique, ou l'inverse, fausseraient le
--    rapprochement comptable.
--
--    `SECURITY DEFINER` : elle doit ecrire des lignes qu'aucun RLS ne
--    laisse passer a un tiers. Son proprietaire (postgres) est donc le
--    `current_user` vu par le trigger de la section 1, qui l'autorise.
--
--    Exécution restreinte a `service_role` : c'est l'API d'administration
--    (le futur back-office, ou un script de reconciliation). Un utilisateur
--    connecte ne peut donc pas appeler cette fonction, meme en connaissant
--    son nom — c'est le sens du `revoke all` suivi du `grant`.
-- -----------------------------------------------------------------------------
create or replace function public.set_pressing_subscription(
  p_pressing_id      uuid,
  p_plan             text,
  p_expires_at       timestamptz,
  p_price            integer default 0,
  p_billing_cycle    text    default 'monthly',
  p_transaction_id   text    default null,
  p_payment_method   text    default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if p_plan not in ('free', 'pro', 'business', 'enterprise') then
    raise exception 'Plan inconnu : %', p_plan;
  end if;

  if p_plan <> 'free' and (p_expires_at is null or p_expires_at <= now()) then
    raise exception
      'Un plan payant exige une date d''expiration future (recu : %)', p_expires_at;
  end if;

  select exists (
    select 1 from public.pressings pr where pr.id = p_pressing_id
  )
  into v_exists;

  if not v_exists then
    raise exception 'Pressing introuvable : %', p_pressing_id;
  end if;

  -- Ligne d'historique. `unique` sur transaction_id empeche qu'un meme
  -- encaissement ne soit enregistre deux fois.
  insert into public.saas_subscriptions
    (pressing_id, plan, price, billing_cycle, status,
     started_at, expires_at, payment_method, transaction_id, auto_renew)
  values
    (p_pressing_id, p_plan, greatest(coalesce(p_price, 0), 0), p_billing_cycle,
     case when p_plan = 'free' then 'cancelled' else 'active' end,
     now(), p_expires_at, p_payment_method, p_transaction_id, false);

  -- Application effective du plan.
  update public.pressings
     set subscription_plan = p_plan,
         subscription_expires_at = p_expires_at,
         updated_at = now()
   where id = p_pressing_id;
end;
$$;

alter function public.set_pressing_subscription(uuid, text, timestamptz, integer, text, text, text)
  owner to postgres;

-- `PUBLIC` herite par defaut le droit d'execution : sans ce `revoke`, la
-- fonction serait appelable par `anon` et `authenticated`, et la restriction
-- ci-dessous ne servirait a rien.
revoke all on function public.set_pressing_subscription(
  uuid, text, timestamptz, integer, text, text, text
) from public, anon, authenticated;

grant execute on function public.set_pressing_subscription(
  uuid, text, timestamptz, integer, text, text, text
) to service_role;

-- -----------------------------------------------------------------------------
-- 3. DROITS SUR LE TRIGGER
--    Un trigger s'execute avec les droits de celui qui ecrit : il n'a pas de
--    privilege propre a accorder. Seule la fonction est restreinte.
-- -----------------------------------------------------------------------------
revoke all on function public.pressings_guard_subscription() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Neutralisation du commentaire de la colonne : le prestataire de paiement
-- n'est pas fige dans le schema. `transaction_id` porte l'identifiant de
-- l'evenement recu du prestataire (Wave aujourd'hui, CinetPay possiblement).
--
-- Quel que soit le prestataire, l'identite du paiement est stockee dans
-- MIEUX que dans le presse-papiers du developpeur : c'est ce qui rend le
-- rapprochement comptable possible, et ce qui empeche un encaissement d'etre
-- enregistre deux fois (contrainte d'unicite).
-- -----------------------------------------------------------------------------
comment on column public.saas_subscriptions.transaction_id is
  'Identifiant de l''evenement de paiement chez le prestataire (Wave, CinetPay). Unique : garantit qu''un encaissement n''est enregistre qu''une fois.';

-- -----------------------------------------------------------------------------
-- 2. CONTROLE
-- -----------------------------------------------------------------------------
select tgname
  from pg_trigger
 where tgrelid = 'public.pressings'::regclass
   and not tgisinternal;
