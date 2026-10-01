-- =============================================================================
--  PressingPro — Migration 011 : abonnements aux notifications push
--
--  Distinct de `notifications` (001/007), qui est une FILE D'ENVOI : elle dit
--  quoi envoyer et par quel canal. Cette table dit QUI PEUT RECEVOIR une
--  notification dans son telephone — le `push` de la PWA.
--
--  Separees deliberement : une ligne vit jusqu'a ce que l'utilisateur
--  desinstalle ou se desabonne, pas jusqu'a l'envoi. Les melanger
--  obligerait a distinguer « a echoue » de « n'existe plus », ce qui est la
--  source d'erreur habituelle des files d'envoi.
--
--  Appliquer : supabase db push
--              OU node scripts/db-apply.mjs --file supabase/migrations/011_push_subscriptions.sql
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  profile_id  uuid not null references auth.users (id) on delete cascade,

  -- L'endpoint est fourni par le navigateur et unique au monde : c'est
  -- l'identite de l'appareil. L'unicite est ce qui rend l'abonnement
  -- idempotent, donc `on conflict do update` suffit a reaffirmer un
  -- abonnement sans jamais creer de doublon.
  endpoint    text not null unique,

  -- Cles de chiffrement du Web Push (RFC 8291). Elles ne sont pas secretes au
  -- sens du serveur : sans elles, rien n'est dechiffrable par le
  -- destinataire, et le push service s'en sert pour chiffrer.
  p256dh      text not null,
  auth        text not null,

  -- Journal de l'envoi, utile quand un utilisateur dit « je ne recois rien ».
  last_success_at timestamptz,
  failure_count   smallint not null default 0 check (failure_count >= 0),

  created_at  timestamptz not null default now()
);

-- L'envoi vise un pressing entier : on veut tous ses appareils d'un coup.
-- Cet index est donc sur `pressing_id`, pas sur `profile_id`.
create index if not exists push_subscriptions_pressing_idx
  on public.push_subscriptions (pressing_id);

-- -----------------------------------------------------------------------------
--  RLS
--
--  Meme portee que `notifications` (007) : le personnel du pressing courant, en
--  ecriture comme en lecture. Un compte « client » reste sans acces — il ne
--  doit pas pouvoir lire les abonnements de son pressing, ni s'y inscrire.
--
--  La lecture par `authenticated` est ce qui permet a l'ecran Parametres
--  d'afficher l'etat « active / desactive » sans service_role.
-- -----------------------------------------------------------------------------

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: lecture par le personnel" on public.push_subscriptions;
create policy "push: lecture par le personnel"
  on public.push_subscriptions for select to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
  );

drop policy if exists "push: ecriture par le personnel" on public.push_subscriptions;
create policy "push: ecriture par le personnel"
  on public.push_subscriptions for insert to authenticated
  with check (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
    -- `profile_id` doit etre le sien. Sans ce test, un membre du pressing
    -- pourrait inscrire l'appareil d'un autre : la notification partirait
    -- vers un telephone dont il n'a pas la main.
    and profile_id = auth.uid()
  );

drop policy if exists "push: mise a jour par le personnel" on public.push_subscriptions;
create policy "push: mise a jour par le personnel"
  on public.push_subscriptions for update to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
    and profile_id = auth.uid()
  )
  with check (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
    and profile_id = auth.uid()
  );

-- La desinscription passe par une Server Action qui supprime la ligne : d'ou
-- la necessite du droit `delete`. Il reste borne au meme pressing et au meme
-- profil, donc la policy suffit a interdire toute suppression croisee.
drop policy if exists "push: suppression par le personnel" on public.push_subscriptions;
create policy "push: suppression par le personnel"
  on public.push_subscriptions for delete to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
    and profile_id = auth.uid()
  );

-- Les privileges par defaut ne suffisent pas toujours : on les rend explicites,
-- comme dans 007.
grant select, insert, update, delete on public.push_subscriptions to authenticated;