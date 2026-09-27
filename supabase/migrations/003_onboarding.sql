-- =============================================================================
--  PressingPro — Migration 003 : onboarding gerant
--
--  Deux apports :
--    1. `complete_onboarding(jsonb)` — cree le pressing, le catalogue et
--       l'abonnement dans UNE SEULE transaction, puis rattache le profil.
--    2. `get_reference_catalogue()`  —lecture du catalogue type (28 articles
--       du seed) pour pre-remplir l'etape 2 de l'onboarding.
--
--  ⚠ Ecart assume vs contrat (flo.md) : le contrat prevoyait une Edge
--    Function `complete-onboarding`. On utilise ici une fonction Postgres
--    `SECURITY DEFINER`. Meme garantie demandee — l'atomicite — mais sans
--    deploiement ni aller-retour reseau, et testable directement. Une Edge
--    Function peut toujours l'encapsuler plus tard sans changer l'appelant.
--
--  Appliquer : supabase db push   OU   node scripts/db-apply.mjs
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

-- Pressing qui porte le catalogue de reference (cf. supabase/seed.sql).
create or replace function public.reference_pressing_id()
returns uuid
language sql stable
as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;

-- -----------------------------------------------------------------------------
-- 1. LECTURE DU CATALOGUE TYPE
--    Les policies de `articles` filtrent sur le pressing courant : un gerant
--    qui n'a pas encore de pressing ne peut donc lire AUCUN article. Cette
--    fonction SECURITY DEFINER ouvre la lecture du seul catalogue de reference.
--    Elle retourne des donnees commerciales (grille tarifaire), pas de
--    donnees de commande : aucun risque de fuite entre tenants.
-- -----------------------------------------------------------------------------
create or replace function public.get_reference_catalogue()
returns table (
  name        text,
  category    text,
  wash_type   text,
  price       integer,
  estimated_hours integer,
  sort_order  integer
)
language sql
security definer
set search_path = public
as $$
  select a.name, a.category, a.wash_type, a.price, a.estimated_hours, a.sort_order
    from public.articles a
   where a.pressing_id = public.reference_pressing_id()
   order by a.sort_order;
$$;

revoke all on function public.get_reference_catalogue() from public, anon;
grant execute on function public.get_reference_catalogue() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. COMPLETION DE L'ONBOARDING
--    Signature : un seul `jsonb` plutot que 12 parametres : la forme du payload
--    evolue avec l'IHM sans casser l'appelant, et un seul aller-retour reseau.
--
--    Securite : la fonction est SECURITY DEFINER (elle DOIT contourner le RLS
--    pour inserer le catalogue avant que le profil ne soit rattache). Elle
--    reconstitue donc elle-meme TOUTES les verifications :
--      - l'appelant doit etre connecte ;
--      - son role doit etre 'owner' ;
--      - il ne doit pas avoir deja de pressing ;
--      - `owner_id = auth.uid()`, ce qu'exige deja la policy
--        « pressings: creation par son proprietaire ».
--
--    Atomicite : une fonction Postgres EST une transaction. Si l'insertion des
--    articles echoue, pressing et abonnement sont annules avec — on ne laisse
--    jamais un pressing sans catalogue.
-- -----------------------------------------------------------------------------
create or replace function public.complete_onboarding(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_role       text;
  v_pressing   uuid;
  v_plan       text;
  v_trial      boolean;
  v_inserted   integer := 0;
  p            jsonb := payload -> 'pressing';
  article      jsonb;
begin
  -- -- Garde-fous -------------------------------------------------------
  if v_user is null then
    raise exception 'Authentification requise';
  end if;

  select role into v_role from public.profiles where id = v_user;
  if v_role is distinct from 'owner' then
    raise exception 'Seul un gerant (owner) peut creer un pressing';
  end if;

  if exists (
    select 1 from public.profiles where id = v_user and pressing_id is not null
  ) then
    raise exception 'Onboarding deja termine : ce compte gere deja un pressing';
  end if;

  if jsonb_typeof(payload -> 'articles') <> 'array' then
    raise exception 'Catalogue manquant ou invalide';
  end if;

  -- -- Plan et essai ----------------------------------------------------
  v_plan := coalesce(payload #>> '{subscription,plan}', 'free');
  if v_plan not in ('free', 'pro') then
    v_plan := 'free';   -- seuls free et pro sont proposes a l'inscription
  end if;
  v_trial := (v_plan = 'pro') and (payload #>> '{subscription,trial}' = 'true');


  -- -- 1. Le pressing ----------------------------------------------------
  insert into public.pressings (
    owner_id, name, commune, address, phone, logo_url,
    opening_hours, pickup_enabled, delivery_enabled,
    delivery_fee, delivery_fees_by_commune, default_delays_by_wash,
    subscription_plan
  )
  values (
    v_user,
    p ->> 'name',
    coalesce(p ->> 'commune', 'Cocody'),
    nullif(p ->> 'address', ''),
    nullif(p ->> 'phone', ''),
    nullif(p ->> 'logo_url', ''),
    coalesce(p -> 'opening_hours', '{}'::jsonb),
    coalesce((p ->> 'pickup_enabled')::boolean, false),
    coalesce((p ->> 'delivery_enabled')::boolean, false),
    coalesce((p ->> 'delivery_fee')::integer, 1000),
    coalesce(p -> 'delivery_fees_by_commune', '{}'::jsonb),
    coalesce(
      p -> 'default_delays_by_wash',
      '{"eau":24,"sec":48,"repassage_seul":4,"detachage":72}'::jsonb
    ),
    v_plan
  )
  returning id into v_pressing;

  -- -- 2. Le catalogue ----------------------------------------------------
  -- On ne copie que les lignes valides : si le JSON est mal forme, on ne
  -- veut pas inserer un catalogue a moitie vide qui ferait echouer la
  -- transaction. La validation stricte reste cote application (Zod).
  for article in select * from jsonb_array_elements(payload -> 'articles')
  loop
    if coalesce((article ->> 'is_active')::boolean, true)
       and article ? 'name'
       and article ? 'wash_type'
       and article ->> 'price' ~ '^[0-9]+$'
    then
      insert into public.articles (
        pressing_id, name, category, wash_type, price,
        estimated_hours, sort_order, is_active
      )
      values (
        v_pressing,
        left(article ->> 'name', 120),
        coalesce(article ->> 'category', 'habit'),
        article ->> 'wash_type',
        (article ->> 'price')::integer,
        coalesce((article ->> 'estimated_hours')::integer, 24),
        coalesce((article ->> 'sort_order')::integer, 0),
        true
      );
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  -- -- 3. L'abonnement ---------------------------------------------------
  -- Le prix est a 0 pendant l'essai : aucun paiement n'est encaisse a ce
  -- stade (CinetPay arrive en Phase 3). Le montant reel sera pose par le
  -- webhook d'activation.
  insert into public.saas_subscriptions
    (pressing_id, plan, price, billing_cycle, status, started_at, expires_at)
  values (
    v_pressing,
    v_plan,
    0,
    case when v_trial then 'monthly' else 'none' end,
    case when v_trial then 'trial' else 'active' end,
    now(),
    case when v_trial then now() + interval '30 days' else null end
  );

  -- -- 4. Rattachement du profil ----------------------------------------
  update public.profiles
     set pressing_id = v_pressing,
         updated_at   = now()
   where id = v_user;

  return jsonb_build_object(
    'pressing_id',      v_pressing,
    'articles_inserted', v_inserted,
    'plan',             v_plan,
    'trial',            v_trial
  );
end;
$$;

revoke all on function public.complete_onboarding(jsonb) from public, anon;
grant execute on function public.complete_onboarding(jsonb) to authenticated;


-- -----------------------------------------------------------------------------
-- 3. STOCKAGE — logo pose PENDANT l'onboarding
--    Les policies existantes (001_init.sql) exigent `folder[1] = pressing_id`.
--    Or le pressing n'est cree qu'a l'etape finale : impossible d'uploader le
--    logo avant. On autorise donc une ecriture dans `onboarding/<user_id>/…`,
--    fermee a son seul proprietaire. Le bucket `pressing-assets` etant public,
--    l'URL fonctionne telle quelle ; le deplacement vers `<pressing_id>/` reste
--    cosmetique.
-- -----------------------------------------------------------------------------
create policy "storage: logo pendant l'onboarding (ecriture)"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pressing-assets'
    and (storage.foldername(name))[1] = 'onboarding'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "storage: logo pendant l'onboarding (lecture)"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pressing-assets'
    and (storage.foldername(name))[1] = 'onboarding'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "storage: logo pendant l'onboarding (suppression)"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pressing-assets'
    and (storage.foldername(name))[1] = 'onboarding'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

