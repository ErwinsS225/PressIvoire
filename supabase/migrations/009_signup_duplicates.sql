-- =============================================================================
--  PressingPro — Migration 009 : detection des inscriptions en double
--
--  Objectif : empecher qu'une meme personne cree un second compte et se
--  retrouve bloquee sur un onboarding vide alors qu'elle en a deja termine un
--  autre. Symptome constate : un gerant ayant configure son pressing qui se
--  connecte avec une autre adresse et se retrouve retenu sur l'ecran
--  d'onboarding, sans aucun moyen de comprendre pourquoi.
--
--  Ce que fait la migration, et pourquoi pas davantage :
--
--  1. Un index UNIQUE PARTIEL sur `profiles.phone` : c'est la seule donnee
--     d'identite physique dont on dispose. Deux comptes distincts ne peuvent
--     pas partager un numero, donc c'est le seul invariant qui detecte
--     reellement un doublon, y compris quand les emails different.
--
--     ⚠ Les comptes de demonstration du seed partagent volontairement le meme
--     numero. L'index est donc PARTIEL : il n'impose l'unicite que sur les
--     profils reels, ce qui permet de l'appliquer SANS nettoyer la base
--     existante.
--
--  2. `account_exists()` : diagnostic consulte par l'action d'inscription
--     AVANT la creation du compte. Elle rend un message exploitable (« cet
--     email a deja un compte », « ce numero porte deja un pressing »), que le
--     trigger seul ne peut pas donner car il ne s'execute qu'apres l'insertion.
--
--  3. Un trigger refuse le doublon cote base : derniere ligne de defense.
--     L'IHM peut mentir et un appel HTTP peut forger une requete ; la base,
--     non. C'est aussi ce qui empeche deux inscriptions simultanees de
--     passer entre les mailles de `account_exists()`.
--
--  Appliquer : node scripts/db-apply.mjs --file supabase/migrations/009_*.sql
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NORMALISATION DU NUMERO
--
--    `profiles.phone` stocke la forme normalisee (+225XXXXXXXXX), imposee par le
--    CHECK de la colonne. La normalisation, elle, vit aujourd'hui en
--    TypeScript (`normalizeIvorianPhone`, lib/utils.ts).
--
--    On en duplique l'equivalent en SQL pour une raison : la comparaison doit
--    se faire DANS la base, entre la valeur saisie et la valeur stockee, sans
--    faire transiter le numero par l'application.
--
--    La regle est volontairement identique a celle de `lib/utils.ts` : on
--    retire tout ce qui n'est pas un chiffre, on retire un eventuel prefixe
--    225 en tete, puis on prefixe par +225. Un nom de fonction distinct de
--    celui du TypeScript aurait invite a les faire diverger.
--
--    ⚠ Le prefixe 225 ne peut PAS etre retire sur n'importe quelle saisie.
--    Un numero ivoirien fait 8 a 10 chiffres (cf. le CHECK de la colonne
--    `profiles.phone`). Si la saisie en fait 11 ou 12, c'est qu'elle portait
--    deja le prefixe 225 : il faut alors le retirer, sinon on obtenait
--    « +22550708091011 » pour « +225 07 08 09 10 11 ». Ce numero etait faux
--    ET invisible : ne correspondant plus a celui stocke, la detection de
--    doublon ne declenchait pas sur le format le plus courant.
-- -----------------------------------------------------------------------------
create or replace function public.normalize_phone(p_input text)
returns text
language sql
immutable
as $$
  select case
    when p_input is null or p_input !~ '[0-9]' then null
    when length(regexp_replace(p_input, '\D', '', 'g')) > 10 then
      -- 11 ou 12 chiffres : le prefixe 225 en fait partie, on l'enleve.
      '+225' || substring(regexp_replace(p_input, '\D', '', 'g') from 4)
    else
      '+225' || regexp_replace(p_input, '\D', '', 'g')
  end;
$$;

-- -----------------------------------------------------------------------------
-- 2. NUMERO DE DEMONSTRATION
--    Les comptes de demo partagent tous le meme numero. Les exempter est ce
--    qui rend l'unicite applicable sans detruire la moindre donnee : on
--    n'impose une regle qu'aux lignes qui representent de vrais clients.
-- -----------------------------------------------------------------------------
create or replace function public.demo_phone()
returns text
language sql
immutable
as $$
  select '+2250700000099';
$$;

-- -----------------------------------------------------------------------------
-- 3. INDEX UNIQUE PARTIEL sur `profiles.phone`
--
--    On ne pose pas de contrainte de colonne : `phone` est nullable et
--    plusieurs membres d'equipe invites n'en ont pas. Postgres autorise
--    par ailleurs plusieurs NULL, donc `where phone is not null` suffit.
--
--    L'index sert aussi la RECHERCHE : sans lui, chaque inscription
--    comparerait des chaines sur toute la table `profiles`.
-- -----------------------------------------------------------------------------
create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null
    and phone is distinct from public.demo_phone();

-- -----------------------------------------------------------------------------
-- 4. `account_exists()` — diagnostic avant inscription
--
--    SECURITY DEFINER + `search_path` fige : la fonction doit lire `profiles`
--    alors que l'appelant est anonyme, et RLS ne l'autoriserait pas.
--
--    ⚠ NE REVOLE AUCUNE DONNEE PERSONNELLE : ni nom, ni email existant, ni
--    identifiant. Elle retourne des booleens, ce qui permet d'annoncer
--    « un compte existe deja » sans reveler a QUOI il correspond. C'est le
--    meme arbitrage que `requestPasswordReset`, qui repond de facon
--    identique que l'adresse existe ou non.
--
--    `has_pressing` est un second niveau, lui aussi non nominatif : dire
--    « ce numero est deja rattache a un pressing » suffit a orienter vers la
--    connexion, sans nommer le pressing.
-- -----------------------------------------------------------------------------
create or replace function public.account_exists(
  p_email text,
  p_phone text
)
returns table (
  email_taken   boolean,
  phone_taken   boolean,
  has_pressing  boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
  v_email_taken boolean;
  v_phone_taken boolean;
  v_has_pressing boolean;
begin
  -- Le numero est recherche sous sa forme saisie ET sous sa forme
  -- normalisee : `profiles.phone` stocke le format +225, donc comparer
  -- uniquement a l'identifiant saisi ferait passer pour disponible un
  -- numero deja pris, saisi sous la forme « 07 00 00 00 99 ».
  select exists (
    select 1 from public.profiles p
    where p.email is not null and lower(p.email) = v_email
  )
  into v_email_taken;

  select exists (
    select 1 from public.profiles p
    where p.phone is not null
      and p.phone in (v_phone, public.normalize_phone(v_phone))
  )
  into v_phone_taken;

  -- Numero deja rattache a un pressing : c'est le cas le plus important, car
  -- c'est exactement l'utilisateur qui finira bloque sur l'onboarding en se
  -- connectant avec une autre adresse.
  select exists (
    select 1 from public.profiles p
    where p.phone is not null
      and p.phone in (v_phone, public.normalize_phone(v_phone))
      and p.pressing_id is not null
  )
  into v_has_pressing;

  return query select coalesce(v_email_taken, false),
                      coalesce(v_phone_taken, false),
                      coalesce(v_has_pressing, false);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. TRIGGER de refus des doublons
--
--    `account_exists()` (section 4) est consultative : elle protege l'appel,
--    pas l'ecriture. Ce trigger ferme la porte reellement, en refusant l'INSERT
--    d'un profil dont le numero est deja pris.
--
--    Il porte sur `public.profiles` et non sur `auth.users` : c'est le seul
--    endroit ou l'on peut comparer le nouveau profil a l'existant, et il
--    couvre aussi les creations de membres d'equipe par `add_team_member()`.
--
--    Il est volontairement independant du trigger de la migration 002
--    (`profiles_guard_insert`) : les deux sont `before insert`, et Postgres
--    les execute dans un ordre qu'on ne veut pas dependre d'ici. Chacun
--    verifie sa propre contrainte, quel que soit l'ordre d'arrivee.
--
--    ⚠ `new.phone` est RE-NORMALISE avant d'etre compare. Comparer la valeur
--    brute reviendrait a accepter deux écritures du meme numero
--    (« 07 08 09 10 11 » et « +2250708091011 » passeraient alors pour
--    differentes) — c'est precisement le cas que la detection doit attraper.
--
--    On N'ECRIT PAS la valeur normalisee dans `new.phone` : la colonne impose
--    son CHECK `^\+225[0-9]{8,10}$`, et une forme brute comme
--    « 07 08 09 10 11 » echouerait dessus. La normalisation a toujours lieu
--    en amont, cote application (`normalizeIvorianPhone`) ou par le trigger
--    d'inscription (migration 002) ; cette fonction ne fait que COMPARER.
-- -----------------------------------------------------------------------------
create or replace function public.profiles_reject_duplicate_phone()
returns trigger
language plpgsql
as $$
declare
  v_normalized text := public.normalize_phone(new.phone);
begin
  if v_normalized is not null
     and v_normalized is distinct from public.demo_phone()
     and exists (
       select 1 from public.profiles p
       where p.phone = v_normalized
         and p.id is distinct from new.id
     )
  then
    raise exception 'Ce numero de telephone est deja rattache a un compte.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_duplicate_phone on public.profiles;
create trigger profiles_guard_duplicate_phone
  before insert on public.profiles
  for each row
  execute function public.profiles_reject_duplicate_phone();

/*
 * Le meme controle doit s'appliquer aux UPDATE de `phone`. Sans ce second
 * trigger, la garde ne vaudrait qu'a l'inscription : il suffirait de modifier
 * le numero d'un profil existant pour contourner l'unicite — et c'est
 * exactement ce que fait `add_team_member()` quand le gerant enregistre un
 * membre d'equipe avec un numero deja porte par quelqu'un d'autre.
 */
drop trigger if exists profiles_guard_duplicate_phone_update on public.profiles;
create trigger profiles_guard_duplicate_phone_update
  before update of phone on public.profiles
  for each row
  execute function public.profiles_reject_duplicate_phone();

-- -----------------------------------------------------------------------------
-- 6. DROITS SUR `account_exists()`
--
--    `anon` est accorde volontairement : la fonction est consultee AVANT
--    toute session, depuis le formulaire d'inscription. Sans ce droit,
--    l'appel echouerait et le diagnostic n'apparaitrait jamais.
--
--    Elle ne rend que des booleens (cf. section 4) : l'ouvrir a un visiteur
--    ne revele aucune donnee personnelle.
-- -----------------------------------------------------------------------------
alter function public.account_exists(text, text) owner to postgres;
revoke all on function public.account_exists(text, text) from public;
grant execute on function public.account_exists(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. DROITS SUR LES FONCTIONS D'APPUI
--
--    `normalize_phone` et `demo_phone` sont utilisees par le trigger et par
--    l'index. Elles restent internes : aucun droit d'execution n'est accorde
--    au public, `PUBLIC` n'ayant aucun privilege herite ici puisque le
--    `revoke` ci-dessous porte sur le role implicite.
-- -----------------------------------------------------------------------------
alter function public.normalize_phone(text) owner to postgres;
alter function public.demo_phone() owner to postgres;
revoke all on function public.normalize_phone(text) from public, anon, authenticated;
revoke all on function public.demo_phone() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. CONTROLE
-- -----------------------------------------------------------------------------
select indexname
  from pg_indexes
  where tablename = 'profiles'
    and indexname = 'profiles_phone_unique';
