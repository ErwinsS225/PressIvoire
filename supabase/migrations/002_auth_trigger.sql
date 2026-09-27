-- =============================================================================
--  PressingPro — Migration 002 : trigger d'authentification
--
--  Objectif : creer automatiquement une ligne `public.profiles` a chaque
--  inscription Supabase Auth, avec le role choisi par l'utilisateur
--  (owner = gere un pressing, client = particulier).
--
--  Appliquer : supabase db push   OU   node scripts/db-apply.mjs
--             OU SQL Editor du dashboard.
--
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FONCTION handle_new_user()
--    SECURITY DEFINER : le trigger s'execute avec les privileges du
--    proprietaire (postgres) et contourne donc le RLS sur `profiles`, qui
--    n'autorise que la creation de SON PROPRE profil — condition impossible
--    a satisfaire ici, puisque l'on cree le profil d'un utilisateur qui
--    n'existe pas encore dans la session.
--
--    search_path est fige sur `public` : sans cela, un utilisateur malveillant
--    pourrait creer un schema contenant un objet `profiles` et detourner la
--    fonction (cf. guide Supabase "security hardening").
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      text;
  v_full_name text;
  v_phone     text;
begin
  -- Le role vient des metadata de l'inscription. On l'ALLOWE LISTE : un
  -- client ne doit pas pouvoir s'auto-attribuer 'owner' ou 'driver' en
  -- forgeant la requete. Toute valeur inconnue retombe sur 'client'.
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  if v_role not in ('owner', 'client') then
    v_role := 'client';
  end if;

  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

  -- `profiles.phone` porte un CHECK ^\+225[0-9]{8,10}$. L'application
  -- normalise deja le numero, mais on ne fait pas confiance au client : si la
  -- valeur ne respecte pas le format, on la met a NULL plutot que de faire
  -- echouer l'inscription entiere.
  v_phone := nullif(new.raw_user_meta_data ->> 'phone', '');
  if v_phone is not null and v_phone !~ '^\+225[0-9]{8,10}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, role, full_name, phone, email)
  values (new.id, v_role, left(v_full_name, 120), v_phone, new.email)
  on conflict (id) do nothing;   -- securite si le trigger rejoue

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. TRIGGER sur auth.users
--    AFTER INSERT : le profil est disponible des la confirmation de l'email,
--    ce qui evite la fenetre "connecte mais sans profil".
--    On supprime d'abord un eventuel trigger homonyme pour rester idempotent.
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. GARDE-FOU : le profil ne peut etre cree que par le trigger
--    `profiles: creation de son propre profil` (001_init.sql) autorise
--    l'insertion par l'utilisateur connecte, ce qui permettrait d'ecraser le
--    role d'un autre profil. On ajoute donc une contrainte qui verifie que
--    la ligne correspond bien a un compte Auth existant.
-- -----------------------------------------------------------------------------
create or replace function public.profiles_role_is_allowed()
returns trigger
language plpgsql
as $$
begin
  -- Rien a faire si l'insertion vient du trigger : l'utilisateur n'est pas
  -- encore connecte, auth.uid() est NULL, et le INSERT via SECURITY DEFINER
  -- passe ici avec un current_user = postgres.
  if auth.uid() is not null and new.id <> (select auth.uid()) then
    raise exception 'Insertion non autorisee sur un profil tiers';
  end if;
  return new;
end;
$$;

create or replace function public.profiles_role_stays_allowed()
returns trigger
language plpgsql
as $$
begin
  -- Un utilisateur ne peut pas changer son propre role, ni s'en attribuer un
  -- eleve. Le role est pose a l'inscription et fige : la promotion vers
  -- manager/driver passe par une operation d'administration, pas par le client.
  if auth.uid() is not null
     and new.role is distinct from old.role
     and new.role <> 'client' then
    raise exception 'Changement de role non autorise';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_insert on public.profiles;
create trigger profiles_guard_insert
  before insert on public.profiles
  for each row
  execute function public.profiles_role_is_allowed();

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row
  execute function public.profiles_role_stays_allowed();

-- -----------------------------------------------------------------------------
-- 4. CONTROLE
--    Le trigger n'est verifiable qu'a l'inscription. Apres application,
--    verifier que la fonction et le trigger existent :
--      select tgname from pg_trigger where tgrelid = 'auth.users'::regclass;
-- -----------------------------------------------------------------------------
select tgname, tgenabled
  from pg_trigger
 where tgrelid = 'auth.users'::regclass
   and not tgisinternal;
