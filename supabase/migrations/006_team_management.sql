-- =============================================================================
--  PressingPro — Migration 006 : gestion de l'equipe
--
--  Les policies RLS de 001 n'autorisent un profil qu'a s'ecrire LUI-MEME
--  (`id = auth.uid()`) : un gerant ne pouvait donc ni inviter un employe, ni
--  changer un role, ni desactiver un compte. Cette migration ouvre ces trois
--  operations, strictement limitees au proprietaire du pressing.
--
--  Pourquoi une fonction SQL plutot qu'une Server Action ?
--  parce que la policy RLS l'interdit au niveau base. Une Server Action
--  s'execute avec la session de l'utilisateur : ses INSERT/UPDATE passent par
--  les memes policies que le navigateur, et seraient refuses. Il faut donc
--  une fonction `SECURITY DEFINER` qui, elle, s'execute avec les privileges du
--  proprietaire — en revalidant elle-meme l'identite de l'appelant.
--
--  Trois operations :
--    1. `add_team_member()`      inviter un employe dans SON pressing
--    2. `update_team_member()`   changer un role, activer/desactiver
--    3. `remove_team_member()`   retirer un employe
--
--  Regles de securite appliquees dans chaque fonction :
--    - l'appelant doit etre proprietaire OU manager du pressing vise
--    - on ne peut pas modifier le proprietaire lui-meme (verrou d'inhibition)
--    - un compte ne peut pas appartenir a deux pressings
--    - `search_path` fige sur `public`
--    - execute accordee a `authenticated` uniquement (pas a anon)
--
--  Appliquer : supabase db push   OU   node scripts/db-apply.mjs
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ADD_TEAM_MEMBER — inviter un employe
-- -----------------------------------------------------------------------------
create or replace function public.add_team_member(
  p_pressing_id uuid,
  p_user_id     uuid,
  p_role        text,
  p_full_name   text default '',
  p_phone       text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  -- 1. L'appelant doit administrer le pressing vise.
  v_is_admin := public.app_is_pressing_admin()
                and public.app_current_pressing_id() = p_pressing_id;
  if not v_is_admin then
    raise exception 'Seul un gerant ou un responsable peut ajouter un employe';
  end if;

  -- 2. Role sur liste blanche STRITE : ni 'client' (ce n'est pas un employe)
  --    ni 'owner' (un gerant ne s'attribue pas le role, il ne pourrait plus
  --    etre retire ensuite).
  if p_role not in ('manager', 'cashier', 'driver') then
    raise exception 'Role invalide pour un employe : %', p_role;
  end if;

  -- 3. Le compte doit exister dans auth.users ET etre deja profil.
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Compte inexistant';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Profil inexistant pour ce compte';
  end if;

  -- 4. Un compte ne peut pas appartenir a deux pressings.
  if exists (
    select 1 from public.profiles
     where id = p_user_id and pressing_id is not null
  ) then
    raise exception 'Ce compte est deja rattache a un pressing';
  end if;

  update public.profiles
     set pressing_id = p_pressing_id,
         role        = p_role,
         full_name   = coalesce(nullif(p_full_name, ''), full_name),
         phone       = p_phone,
         is_active   = true,
         deleted_at  = null
   where id = p_user_id;
end;
$$;
alter function public.add_team_member(uuid, uuid, text, text, text) owner to postgres;
revoke all on function public.add_team_member(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.add_team_member(uuid, uuid, text, text, text) to authenticated;


-- -----------------------------------------------------------------------------
-- 2. UPDATE_TEAM_MEMBER — changer un role, activer/desactiver
-- -----------------------------------------------------------------------------
create or replace function public.update_team_member(
  p_pressing_id uuid,
  p_user_id     uuid,
  p_role        text,
  p_is_active   boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin    boolean;
  v_target_role text;
begin
  v_is_admin := public.app_is_pressing_admin()
                and public.app_current_pressing_id() = p_pressing_id;
  if not v_is_admin then
    raise exception 'Seul un gerant ou un responsable peut modifier un employe';
  end if;

  select role into v_target_role
    from public.profiles
   where id = p_user_id and pressing_id = p_pressing_id;

  if v_target_role is null then
    raise exception 'Employe introuvable dans ce pressing';
  end if;

  -- Le proprietaire ne se retrograde ni ne se desactive lui-meme.
  if v_target_role = 'owner' and (p_role <> 'owner' or not p_is_active) then
    raise exception 'Le proprietaire du pressing ne peut ni etre retrograde ni desactive';
  end if;

  if p_role not in ('owner', 'manager', 'cashier', 'driver') then
    raise exception 'Role invalide : %', p_role;
  end if;

  -- Un compte desactive ne peut pas etre promu : il n'a plus de session.
  if not p_is_active and p_role <> 'owner' then
    raise exception 'Reactivez le compte avant de lui attribuer un role';
  end if;

  update public.profiles
     set role = p_role, is_active = p_is_active, deleted_at = null
   where id = p_user_id and pressing_id = p_pressing_id;
end;
$$;
alter function public.update_team_member(uuid, uuid, text, boolean) owner to postgres;
revoke all on function public.update_team_member(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.update_team_member(uuid, uuid, text, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- 3. REMOVE_TEAM_MEMBER — retirer un employe
-- -----------------------------------------------------------------------------
create or replace function public.remove_team_member(
  p_pressing_id uuid,
  p_user_id     uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role text;
begin
  if not (public.app_is_pressing_admin()
           and public.app_current_pressing_id() = p_pressing_id) then
    raise exception 'Seul un gerant ou un responsable peut retirer un employe';
  end if;

  select role into v_target_role
    from public.profiles
   where id = p_user_id and pressing_id = p_pressing_id;

  if v_target_role is null then
    raise exception 'Employe introuvable dans ce pressing';
  end if;

  -- Verrou d'inhibition : un pressing ne peut pas se retrouver sans gerant,
  -- ce qui le laisserait inaccessible a toute administration.
  if v_target_role = 'owner' then
    raise exception 'Le proprietaire ne peut pas etre retire. Transferez la propriete avant.';
  end if;

  -- On retire le RATTACHEMENT sans supprimer le compte : l'auth user existe
  -- toujours, et l'historique de ses commandes ne doit pas disparaitre.
  update public.profiles
     set pressing_id = null,
         role        = 'client',
         is_active   = true,
         deleted_at  = null
   where id = p_user_id;
end;
$$;
alter function public.remove_team_member(uuid, uuid) owner to postgres;
revoke all on function public.remove_team_member(uuid, uuid) from public, anon;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;

