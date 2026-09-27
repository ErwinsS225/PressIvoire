-- =============================================================================
--  PressingPro — Migration 001 : schema initial (multi-tenant + RLS)
--  SaaS de gestion de pressing — Cote d'Ivoire
--  Appliquer : supabase db push   OU   SQL Editor du dashboard Supabase.
--
--  Regle centrale : un utilisateur ne voit que les donnees de SON pressing_id,
--  et un client ne voit que SES propres commandes (RLS sur toutes les tables).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- Les helpers RLS de la section 1 referencent public.profiles, qui n'est cree
-- qu'en section 2. Sans ce reglage, Postgres refuse de les creer ("relation
-- public.profiles does not exist") alors qu'elles ne sont appelees qu'apres.
set check_function_bodies = off;

-- -----------------------------------------------------------------------------
-- 1. FONCTIONS UTILITAIRES (helpers RLS)
--    SECURITY DEFINER : elles lisent public.profiles en court-circuitant le RLS,
--    ce qui evite la recursion de policies (une policy sur profiles qui lit
--    profiles = "infinite recursion detected"). STABLE = evaluees une fois.
-- -----------------------------------------------------------------------------

-- pressing_id de l'utilisateur courant (NULL pour un client non rattache)
create or replace function public.app_current_pressing_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select p.pressing_id from public.profiles p where p.id = auth.uid();
$$;

alter function public.app_current_pressing_id() owner to postgres;
revoke all on function public.app_current_pressing_id() from public;
grant execute on function public.app_current_pressing_id() to anon, authenticated, service_role;

-- role de l'utilisateur courant
create or replace function public.app_current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

alter function public.app_current_role() owner to postgres;
revoke all on function public.app_current_role() from public;
grant execute on function public.app_current_role() to anon, authenticated, service_role;

-- l'utilisateur courant est-il un employe actif (owner/manager/cashier/driver) ?
create or replace function public.app_is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.deleted_at is null
      and p.role in ('owner','manager','cashier','driver')
  );
$$;

alter function public.app_is_staff() owner to postgres;
revoke all on function public.app_is_staff() from public;
grant execute on function public.app_is_staff() to anon, authenticated, service_role;

-- l'utilisateur courant est-il administrateur de son pressing (owner/manager) ?
create or replace function public.app_is_pressing_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.deleted_at is null
      and p.role in ('owner','manager')
  );
$$;


-- -----------------------------------------------------------------------------
-- 2. TABLES TENANT
--    pressings est cree avant profiles car profiles.pressing_id pointe dessus
--    (FK circulaire resolue avec un ALTER TABLE ulterieur).
-- -----------------------------------------------------------------------------

create table if not exists public.pressings (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid,          -- FK -> profiles.id ajoutee apres
  name                     text not null check (char_length(name) between 2 and 120),
  address                  text,
  commune                  text not null default 'Cocody',
  phone                    text check (phone is null or phone ~ '^\+225[0-9]{8,10}$'),
  email                    text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  logo_url                 text,
  opening_hours            jsonb not null default '{}'::jsonb,
  -- + collecte et livraison sont 2 services distincts (onboarding etape 2)
  pickup_enabled           boolean not null default false,
  delivery_enabled         boolean not null default false,
  delivery_fee             integer not null default 1000 check (delivery_fee >= 0),
  -- + frais parametres par commune {"Cocody":1000,"Yopougon":1500}
  delivery_fees_by_commune jsonb not null default '{}'::jsonb,
  -- + livraison offerte a partir de X FCFA d'achat
  free_delivery_from       integer check (free_delivery_from is null or free_delivery_from > 0),
  -- + delai standard par type de lavage {"eau":24,"sec":48}
  default_delays_by_wash   jsonb not null default '{"eau":24,"sec":48,"repassage_seul":4,"detachage":72}'::jsonb,
  subscription_plan        text not null default 'free'
                             check (subscription_plan in ('free','pro','business','enterprise')),
  subscription_expires_at  timestamptz,
  referral_code            text,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  pressing_id  uuid,                    -- FK -> pressings.id ajoutee apres
  role         text not null default 'client'
                 check (role in ('owner','manager','cashier','driver','client')),
  full_name    text not null default '' check (full_name = '' or char_length(full_name) <= 120),
  phone        text check (phone is null or phone ~ '^\+225[0-9]{8,10}$'),
  email        text,
  avatar_url   text,
  is_active    boolean not null default true,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.profiles.phone is
  'Format normalise sans espace : +225 07 00 00 00 00 -> +2250700000000';

-- FK circulaire : pressings.owner_id -> profiles et profiles.pressing_id -> pressings
alter table public.pressings
  add constraint pressings_owner_id_fkey
  foreign key (owner_id) references public.profiles (id) on delete set null;

alter table public.profiles
  add constraint profiles_pressing_id_fkey
  foreign key (pressing_id) references public.pressings (id) on delete set null;

alter function public.app_is_pressing_admin() owner to postgres;
revoke all on function public.app_is_pressing_admin() from public;
grant execute on function public.app_is_pressing_admin() to anon, authenticated, service_role;

-- est-on le proprietaire legal d'un pressing donne ?
create or replace function public.app_is_pressing_owner(p_pressing_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.pressings pr
    where pr.id = p_pressing_id and pr.owner_id = auth.uid()
  );
$$;

alter function public.app_is_pressing_owner(uuid) owner to postgres;
revoke all on function public.app_is_pressing_owner(uuid) from public;
grant execute on function public.app_is_pressing_owner(uuid) to anon, authenticated, service_role;

-- trigger genrique de maintenance de updated_at
create or replace function public.app_touch_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.app_touch_updated_at() owner to postgres;

-- -----------------------------------------------------------------------------
-- 3. CATALOGUE DES ARTICLES (grille tarifaire propre a chaque pressing)
-- -----------------------------------------------------------------------------
create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  pressing_id     uuid not null references public.pressings (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  category        text not null default 'habit'
                    check (category in ('habit','linge_maison','cuir','delicat')),
  wash_type       text not null
                    check (wash_type in ('sec','eau','repassage_seul','detachage')),
  price           integer not null check (price between 0 and 1000000),   -- FCFA
  estimated_hours integer not null default 24 check (estimated_hours between 1 and 336), -- 14 j max
  description     text,
  image_url       text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- + anti-doublon : meme nom + meme type de lavage = meme article
  constraint articles_pressing_name_wash_uk unique (pressing_id, name, wash_type)
);

-- -----------------------------------------------------------------------------
-- 4. CLIENTS (base du pressing)
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  pressing_id    uuid not null references public.pressings (id) on delete cascade,
  -- + lien avec le compte "client" (portail client) — optionnel
  user_id        uuid references public.profiles (id) on delete set null,
  full_name      text not null check (char_length(full_name) between 2 and 120),
  phone          text check (phone is null or phone ~ '^\+225[0-9]{8,10}$'),
  email          text,
  address        text,
  commune        text,
  notes          text,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  total_orders   integer not null default 0 check (total_orders >= 0),
  total_spent    integer not null default 0 check (total_spent >= 0),   -- FCFA
  last_order_at  timestamptz,                                           -- filtre Actif/Inactif
  is_active      boolean not null default true,
  deleted_at     timestamptz,                                           -- soft delete
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- detection de doublon par telephone (les NULL restent distincts en Postgres)
create unique index if not exists clients_pressing_phone_uk
  on public.clients (pressing_id, phone) where phone is not null;

-- -----------------------------------------------------------------------------
-- 5. PACKS CLIENTS (vendus PAR les pressings A leurs clients)
-- -----------------------------------------------------------------------------
create table if not exists public.customer_packs (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients (id) on delete cascade,
  pressing_id         uuid not null references public.pressings (id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 120),
  total_quantity      integer not null check (total_quantity between 1 and 9999),
  used_quantity       integer not null default 0 check (used_quantity >= 0),
  price               integer not null default 0 check (price >= 0),   -- FCFA
  -- + articles couverts par le pack, ex: ["Chemise - eau", "Chemise - sec"]
  eligible_articles   jsonb not null default '[]'::jsonb,
  expires_at          timestamptz,
  status              text not null default 'active'
                        check (status in ('active','exhausted','expired','cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint customer_packs_used_le_total check (used_quantity <= total_quantity)
);

-- -----------------------------------------------------------------------------
-- 6. COMMANDES
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  pressing_id           uuid not null references public.pressings (id) on delete cascade,
  client_id             uuid not null references public.clients (id) on delete restrict,
  order_number          text not null,
  status                text not null default 'pending'
                          check (status in (
                            'pending','pickup_scheduled','picked_up','in_processing',
                            'ready','out_for_delivery','delivered','cancelled','disputed'
                          )),
  pickup_type           text not null default 'in_store'
                          check (pickup_type in ('in_store','home_pickup')),
  delivery_type         text not null default 'in_store'
                          check (delivery_type in ('in_store','home_delivery')),
  pickup_address         text,
  delivery_address       text,
  pickup_scheduled_at    timestamptz,
  delivery_scheduled_at  timestamptz,
  estimated_ready_at     timestamptz,
  subtotal               integer not null default 0 check (subtotal >= 0),
  delivery_fee           integer not null default 0 check (delivery_fee >= 0),
  express_fee            integer not null default 0 check (express_fee >= 0),   -- + Express 6h
  discount               integer not null default 0 check (discount >= 0),
  total                  integer not null check (total >= 0),
  payment_status         text not null default 'unpaid'
                           check (payment_status in ('unpaid','partial','paid')),
  amount_paid            integer not null default 0 check (amount_paid >= 0),
  payment_method         text
                           check (payment_method is null
                                  or payment_method in ('cash','wave','orange','mtn','moov')),
  is_express             boolean not null default false,
  notes                  text,
  cancel_reason          text,
  cancelled_at           timestamptz,
  dispute_reason         text,      -- + litige
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  delivered_at           timestamptz,
  constraint orders_pressing_number_uk unique (pressing_id, order_number),
  constraint orders_amount_balanced
    check (total = subtotal + delivery_fee + express_fee - discount),
  constraint orders_amount_paid_valid check (amount_paid <= total)
);

comment on constraint orders_pressing_number_uk on public.orders is
  'Le numero PR-AAAA-NNNN est unique PAR PRESSING (deux pressings peuvent avoir PR-2026-0001).';

-- -----------------------------------------------------------------------------
-- 7. LIGNES DE COMMANDE
--    customer_packs est deja cree : on peut pointer dessus via used_pack_id.
-- -----------------------------------------------------------------------------
create table if not exists public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id) on delete cascade,
  article_id            uuid references public.articles (id) on delete set null,
  -- + instantane : l'historique survit a la suppression/renommage d'un article
  article_name          text not null,
  quantity              integer not null default 1 check (quantity between 1 and 9999),
  unit_price            integer not null check (unit_price >= 0),
  total_price           integer generated always as (quantity * unit_price) stored,
  wash_type             text not null
                          check (wash_type in ('sec','eau','repassage_seul','detachage')),
  photo_before_url      text,
  photo_after_url       text,
  special_instructions  text,
  used_pack_id          uuid references public.customer_packs (id) on delete set null,
  created_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. PAIEMENTS (commandes clientes + abonnements SaaS)
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  -- + n'est pas forcement rattache a une commande (paiement d'abonnement SaaS)
  order_id       uuid references public.orders (id) on delete cascade,
  -- + pressing_id obligatoire pour que la RLS puisse isoler les abonnements
  pressing_id    uuid not null references public.pressings (id) on delete cascade,
  amount         integer not null check (amount > 0),
  method         text not null
                   check (method in ('cash','wave','orange','mtn','moov','card','transfer')),
  -- + reference CinetPay : 'PRESSING_{id}_{ts}' ou 'SUB_{id}_{ts}'
  transaction_id text unique,
  payment_token  text,
  status         text not null default 'pending'
                   check (status in ('pending','success','failed','refunded')),
  receipt_number text,
  raw_response   jsonb,                     -- + reponse brute de CinetPay
  paid_at        timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint payments_reference_ck check (order_id is not null or transaction_id is not null)
);

-- -----------------------------------------------------------------------------
-- 9. LIVRAISONS / TOURNEES
-- -----------------------------------------------------------------------------
create table if not exists public.deliveries (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  pressing_id     uuid not null references public.pressings (id) on delete cascade,
  driver_id       uuid references public.profiles (id) on delete set null,
  type            text not null check (type in ('pickup','delivery')),
  status          text not null default 'assigned'
                    check (status in ('assigned','in_progress','completed','failed')),
  scheduled_at    timestamptz,
  address         text,
  contact_phone   text,
  completed_at    timestamptz,
  failure_reason  text,
  proof_photo_url text,
  signature_url   text,                     -- + Phase 5 : signature tactile
  gps_coordinates text,                     -- + Phase 5 : lat,lng
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 10. ABONNEMENTS SAAS (ce que MES CLIENTS pressings me paient)
-- -----------------------------------------------------------------------------
create table if not exists public.saas_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  pressing_id      uuid not null references public.pressings (id) on delete cascade,
  plan             text not null check (plan in ('free','pro','business','enterprise')),
  price            integer not null default 0 check (price >= 0),   -- FCFA / periode
  billing_cycle    text not null default 'monthly'
                     check (billing_cycle in ('monthly','yearly','daily','none')),
  status           text not null default 'active'
                     check (status in ('pending','trial','active','expired','cancelled','failed')),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  started_at       timestamptz,
  expires_at       timestamptz,
  payment_method   text,
  transaction_id   text unique,             -- transaction CinetPay de l'abonnement
  auto_renew       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 11. NOTIFICATIONS (file d'attente SMS / WhatsApp)
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references public.orders (id) on delete cascade,
  pressing_id   uuid not null references public.pressings (id) on delete cascade,
  client_id     uuid references public.clients (id) on delete set null,
  channel       text not null check (channel in ('sms','whatsapp','email')),
  event         text,      -- order_created / order_ready / out_for_delivery / ...
  recipient     text not null,
  message       text not null,
  status        text not null default 'queued'
                  check (status in ('queued','sending','sent','failed','cancelled')),
  error_message text,
  retries       smallint not null default 0 check (retries >= 0),
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 12. INDEX (performances sur les requetes chaudes)
-- -----------------------------------------------------------------------------
create index if not exists pressings_commune_idx            on public.pressings (commune);
create index if not exists pressings_owner_idx              on public.pressings (owner_id);

create index if not exists profiles_pressing_idx            on public.profiles (pressing_id);
create index if not exists profiles_phone_idx               on public.profiles (phone);

create index if not exists articles_pressing_idx            on public.articles (pressing_id, is_active);
create index if not exists articles_pressing_category_idx   on public.articles (pressing_id, category);

create index if not exists clients_pressing_idx             on public.clients (pressing_id);
create index if not exists clients_pressing_phone_idx     on public.clients (pressing_id, phone);
create index if not exists clients_pressing_created_idx     on public.clients (pressing_id, created_at desc);

create index if not exists orders_pressing_status_idx       on public.orders (pressing_id, status);
create index if not exists orders_pressing_created_idx      on public.orders (pressing_id, created_at desc);
create index if not exists orders_client_idx                on public.orders (client_id);
create index if not exists orders_number_idx                on public.orders (pressing_id, order_number);
create index if not exists orders_pressing_payment_idx      on public.orders (pressing_id, payment_status);
-- recherche du numero en cours (generation PR-2026-0042)
create index if not exists orders_number_year_idx           on public.orders (pressing_id, order_number desc);

create index if not exists order_items_order_idx            on public.order_items (order_id);

create index if not exists payments_order_idx               on public.payments (order_id);
create index if not exists payments_pressing_status_idx     on public.payments (pressing_id, status);

create index if not exists deliveries_pressing_sched_idx    on public.deliveries (pressing_id, scheduled_at);
create index if not exists deliveries_driver_idx            on public.deliveries (driver_id, status);
create index if not exists deliveries_order_idx             on public.deliveries (order_id);

create index if not exists saas_subs_pressing_idx           on public.saas_subscriptions (pressing_id);
create index if not exists saas_subs_expires_idx            on public.saas_subscriptions (expires_at);

create index if not exists customer_packs_client_idx        on public.customer_packs (client_id, status);
create index if not exists customer_packs_pressing_idx      on public.customer_packs (pressing_id, status);
create index if not exists customer_packs_expires_idx       on public.customer_packs (expires_at);

create index if not exists notifications_status_created_idx on public.notifications (status, created_at);
create index if not exists notifications_pressing_idx       on public.notifications (pressing_id);
create index if not exists notifications_order_idx          on public.notifications (order_id);

-- -----------------------------------------------------------------------------
-- 13. TRIGGERS updated_at
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'pressings','profiles','articles','clients','customer_packs',
    'orders','payments','deliveries','saas_subscriptions'
  ] loop
    execute format(
      'create or replace trigger %I_touch_updated_at
         before update on public.%I
         for each row execute function public.app_touch_updated_at();',
      t, t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 14. FONCTIONS HELPER POUR LES POLICIES (evitent les sous-requetes en boucle)
-- -----------------------------------------------------------------------------

-- pressing_id d'une commande donnee
create or replace function public.app_order_pressing_id(p_order_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select o.pressing_id from public.orders o where o.id = p_order_id;
$$;

alter function public.app_order_pressing_id(uuid) owner to postgres;
revoke all on function public.app_order_pressing_id(uuid) from public;
grant execute on function public.app_order_pressing_id(uuid) to anon, authenticated, service_role;

-- l'utilisateur courant est-il LE client proprietaire d'une commande ?
create or replace function public.app_is_order_client(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.clients c on c.id = o.client_id
    where o.id = p_order_id
      and c.user_id = auth.uid()
  );
$$;

alter function public.app_is_order_client(uuid) owner to postgres;
revoke all on function public.app_is_order_client(uuid) from public;
grant execute on function public.app_is_order_client(uuid) to anon, authenticated, service_role;

-- l'utilisateur courant est-il LE client dont on donne le client_id ?
create or replace function public.app_is_record_client(p_client_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.user_id = auth.uid()
  );
$$;

alter function public.app_is_record_client(uuid) owner to postgres;
revoke all on function public.app_is_record_client(uuid) from public;
grant execute on function public.app_is_record_client(uuid) to anon, authenticated, service_role;

-- =============================================================================
--  15. ROW LEVEL SECURITY — ACTIVE SUR LES 11 TABLES
-- =============================================================================
alter table public.profiles         enable row level security;
alter table public.pressings        enable row level security;
alter table public.articles         enable row level security;
alter table public.clients          enable row level security;
alter table public.customer_packs   enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.payments         enable row level security;
alter table public.deliveries       enable row level security;
alter table public.saas_subscriptions enable row level security;
alter table public.notifications    enable row level security;

-- ------------------------------------------------------------- PROFILES
create policy "profiles: lecture soi-meme ou co-equipier"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (pressing_id is not null and pressing_id = public.app_current_pressing_id())
  );

create policy "profiles: creation de son propre profil"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles: mise a jour propre profil"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: suppression propre profil (soft delete attendu)"
  on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

-- ------------------------------------------------------------- PRESSINGS
-- SELECT volontairement ouvert a tout utilisateur connecte :
-- le client doit pouvoir parcourir l'annuaire des pressings de sa commune
-- (onboarding client, Phase 2). Les donnees sont celles d'un commerce, pas
-- d'une personne. Voir README — "Parti pris RLS".
create policy "pressings: annuaire pour utilisateurs connectes"
  on public.pressings for select to authenticated
  using (true);

create policy "pressings: creation par son proprietaire"
  on public.pressings for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "pressings: mise a jour par le proprietaire ou l'admin du pressing"
  on public.pressings for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (id = public.app_current_pressing_id() and public.app_is_pressing_admin())
  )
  with check (
    owner_id = (select auth.uid())
    or (id = public.app_current_pressing_id() and public.app_is_pressing_admin())
  );

create policy "pressings: suppression par le proprietaire"
  on public.pressings for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ------------------------------------------------------------- ARTICLES
create policy "articles: visibles par le personnel du pressing"
  on public.articles for select to authenticated
  using (pressing_id = public.app_current_pressing_id());

create policy "articles: creation par le personnel"
  on public.articles for insert to authenticated
  with check (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_pressing_admin()
  );

create policy "articles: modification par l'admin du pressing"
  on public.articles for update to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_pressing_admin()
  )
  with check (pressing_id = public.app_current_pressing_id());

create policy "articles: suppression par l'admin du pressing"
  on public.articles for delete to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_pressing_admin()
  );

-- ------------------------------------------------------------- CLIENTS
create policy "clients: lecture par le personnel ou par le client lui-meme"
  on public.clients for select to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    or user_id = (select auth.uid())
  );

create policy "clients: creation par le personnel"
  on public.clients for insert to authenticated
  with check (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
  );

create policy "clients: modification par le personnel ou le client"
  on public.clients for update to authenticated
  using (
    (pressing_id = public.app_current_pressing_id() and public.app_is_staff())
    or user_id = (select auth.uid())
  )
  with check (
    (pressing_id = public.app_current_pressing_id() and public.app_is_staff())
    or user_id = (select auth.uid())
  );

-- Pas de policy DELETE : la suppression est un soft delete via deleted_at
-- (la policy UPDATE ci-dessus couvre le cas).

-- ------------------------------------------------------------- PACKS CLIENTS
create policy "packs: lecture par le personnel ou le client"
  on public.customer_packs for select to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    or public.app_is_record_client(client_id)
  );

create policy "packs: creation par le personnel"
  on public.customer_packs for insert to authenticated
  with check (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_pressing_admin()
  );

create policy "packs: consommation et mise a jour par le personnel"
  on public.customer_packs for update to authenticated
  using (pressing_id = public.app_current_pressing_id() and public.app_is_staff())
  with check (pressing_id = public.app_current_pressing_id());

-- ------------------------------------------------------------- COMMANDES
create policy "orders: lecture par le personnel ou par le client"
  on public.orders for select to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    or public.app_is_order_client(id)
  );

create policy "orders: creation par le personnel"
  on public.orders for insert to authenticated
  with check (pressing_id = public.app_current_pressing_id() and public.app_is_staff());

create policy "orders: workflow par le personnel"
  on public.orders for update to authenticated
  using (pressing_id = public.app_current_pressing_id() and public.app_is_staff())
  with check (pressing_id = public.app_current_pressing_id());

-- Pas de policy DELETE : une commande ne se supprime pas, elle s'annule
-- (statut 'cancelled'). Integrite comptable preservee.

-- ------------------------------------------------------------- LIGNES DE COMMANDE
create policy "order_items: lecture par le personnel ou par le client"
  on public.order_items for select to authenticated
  using (
    public.app_order_pressing_id(order_id) = public.app_current_pressing_id()
    or public.app_is_order_client(order_id)
  );

create policy "order_items: creation par le personnel"
  on public.order_items for insert to authenticated
  with check (public.app_order_pressing_id(order_id) = public.app_current_pressing_id());

create policy "order_items: modification par le personnel (photos apres lavage)"
  on public.order_items for update to authenticated
  using (public.app_order_pressing_id(order_id) = public.app_current_pressing_id())
  with check (public.app_order_pressing_id(order_id) = public.app_current_pressing_id());

-- ------------------------------------------------------------- PAIEMENTS
create policy "payments: lecture par le personnel"
  on public.payments for select to authenticated
  using (pressing_id = public.app_current_pressing_id());

create policy "payments: enregistrement par le personnel"
  on public.payments for insert to authenticated
  with check (pressing_id = public.app_current_pressing_id() and public.app_is_staff());

create policy "payments: mise a jour (webhook / caissier)"
  on public.payments for update to authenticated
  using (pressing_id = public.app_current_pressing_id() and public.app_is_staff())
  with check (pressing_id = public.app_current_pressing_id());

-- Pas de policy DELETE : un paiement ne se supprime pas, il se rembourse
-- (status = 'refunded').

-- ------------------------------------------------------------- LIVRAISONS
create policy "deliveries: lecture par le personnel ou par le livreur assigne"
  on public.deliveries for select to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    or driver_id = (select auth.uid())
  );

create policy "deliveries: creation par le personnel"
  on public.deliveries for insert to authenticated
  with check (pressing_id = public.app_current_pressing_id() and public.app_is_pressing_admin());

-- le personnel du pressing peut tout modifier ; le livreur ne peut toucher
-- qu'a SES livraisons (statut, photo preuve, signature, GPS)
create policy "deliveries: mise a jour par le personnel"
  on public.deliveries for update to authenticated
  using (pressing_id = public.app_current_pressing_id() and public.app_is_pressing_admin())
  with check (pressing_id = public.app_current_pressing_id());

create policy "deliveries: mise a jour par le livreur assigne"
  on public.deliveries for update to authenticated
  using (driver_id = (select auth.uid()))
  with check (driver_id = (select auth.uid()));

-- ------------------------------------------------------------- ABONNEMENTS SAAS
create policy "saas_subscriptions: lecture par le personnel du pressing"
  on public.saas_subscriptions for select to authenticated
  using (pressing_id = public.app_current_pressing_id());

-- Les INSERT/UPDATE sont faits par les Edge Functions (service_role = bypass RLS)
-- : aucune policy write n'est ouverte aux clients, par securite.

-- ------------------------------------------------------------- NOTIFICATIONS
create policy "notifications: lecture par le personnel"
  on public.notifications for select to authenticated
  using (pressing_id = public.app_current_pressing_id());

-- file d'attente geree par les Edge Functions (service_role)

-- =============================================================================
--  16. STORAGE — buckets + policies (anti-litige : photos avant/apres)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pressing-assets', 'pressing-assets', true,  2097152, array['image/jpeg','image/png','image/webp']),
  ('article-images',  'article-images',  true,  2097152, array['image/jpeg','image/png','image/webp']),
  ('order-photos',    'order-photos',    false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('delivery-proofs', 'delivery-proofs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- chemin conventionnel : <pressing_id>/<...>  → isole chaque tenant
create policy "storage: lecture des photos de commande (tenant)"
  on storage.objects for select to authenticated
  using (bucket_id in ('order-photos','delivery-proofs','pressing-assets','article-images')
         and (storage.foldername(name))[1] = public.app_current_pressing_id()::text);

create policy "storage: ecriture des photos de commande (tenant)"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('order-photos','delivery-proofs','pressing-assets','article-images')
              and (storage.foldername(name))[1] = public.app_current_pressing_id()::text);

create policy "storage: remplacement des photos de commande (tenant)"
  on storage.objects for update to authenticated
  using (bucket_id in ('order-photos','delivery-proofs','pressing-assets','article-images')
         and (storage.foldername(name))[1] = public.app_current_pressing_id()::text);

create policy "storage: suppression des photos de commande (tenant)"
  on storage.objects for delete to authenticated
  using (bucket_id in ('order-photos','delivery-proofs','pressing-assets','article-images')
         and (storage.foldername(name))[1] = public.app_current_pressing_id()::text);

-- toutes les tables existent desormais : on remet la validation du corps des
-- fonctions a son comportement normal pour la suite.
set check_function_bodies = on;








