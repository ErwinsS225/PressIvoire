-- =============================================================================
--  PressingPro — SEED : catalogue ivoirien + pressings de demonstration
--  Appliquer : supabase db reset (dev local) ou SQL Editor (projets lies)
--  Idempotent : peut etre rejoue sans dupliquer de donnees.
-- =============================================================================
--  ⚠ NE CREE AUCUN COMPTE : rien est insere dans auth.users.
--     owner_id reste NULL — les comptes sont crees par l'inscription (Phase 2).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. PRESSINGS DE DEMONSTRATION (uuid fixes = rejeu sans doublon)
--    #1 sert aussi de "catalogue de reference" pour l'onboarding (Phase 2).
-- -----------------------------------------------------------------------------
insert into public.pressings
  (id, name, address, commune, phone, delivery_enabled, pickup_enabled, delivery_fee, is_active)
values
  ('00000000-0000-4000-8000-000000000001',
   'Pressing Demonstration', 'Cocody Angre, 7e tranche', 'Cocody',
   '+2250707070701', true, true, 1000, true),
  ('00000000-0000-4000-8000-000000000002',
   'Pressing Elégance Cocody', 'Bd Latrille, Cocody', 'Cocody',
   '+2250707070702', true, true, 1000, true),
  ('00000000-0000-4000-8000-000000000003',
   'Pressing Vite-Fait', 'Rue du Commerce, Yopougon', 'Yopougon',
   '+2250707070703', true, false, 1000, true),
  ('00000000-0000-4000-8000-000000000004',
   'Pressing Fraicheur Marcory', 'Zone 4, Marcory', 'Marcory',
   '+2250707070704', true, true, 1500, true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. CATALOGUE IVORIEN PRE-REMPLI (28 lignes)
--    Grille standard du marche ivoirien, en FCFA.
--    Reproduit sur CHAQUE pressing de demonstration.
-- -----------------------------------------------------------------------------
insert into public.articles
  (pressing_id, name, category, wash_type, price, estimated_hours, sort_order)
select
  p.id, t.name, t.category, t.wash_type, t.price, t.hours, t.ord
from public.pressings p
cross join (values
  -- habits
  ('Chemise',            'habit',       'eau',             500,  24,  1),
  ('Chemise',            'habit',       'sec',            1000,  48,  2),
  ('Chemise',            'habit',       'repassage_seul',  400,   4,  3),
  ('Pantalon',           'habit',       'eau',             700,  24,  4),
  ('Pantalon',           'habit',       'sec',            1200,  48,  5),
  ('Pantalon',           'habit',       'repassage_seul',  500,   4,  6),
  ('Costume 2 pieces',   'habit',       'eau',            2000,  48,  7),
  ('Costume 2 pieces',   'habit',       'sec',            3000,  72,  8),
  ('Robe simple',        'habit',       'eau',            1000,  24,  9),
  ('Robe simple',        'habit',       'sec',            1500,  48, 10),
  ('Boubou',             'delicat',     'eau',            1500,  48, 11),
  ('Boubou',             'delicat',     'sec',            2500,  72, 12),
  ('T-shirt',            'habit',       'eau',             400,  24, 13),
  ('Jupe',               'habit',       'eau',             800,  24, 14),
  ('Jean',               'habit',       'eau',            1000,  48, 15),
  ('Robe de soiree',     'delicat',     'sec',            3500,  96, 16),
  -- linge de maison
  ('Couverture',         'linge_maison','eau',            2000,  72, 20),
  ('Couverture',         'linge_maison','sec',            3000,  96, 21),
  ('Rideaux (par m2)',   'linge_maison','eau',             500,  72, 22),
  ('Draps',              'linge_maison','eau',            1000,  24, 23),
  ('Draps',              'linge_maison','sec',            1500,  48, 24),
  ('Nappe',              'linge_maison','eau',             700,  48, 25),
  ('Taie d''oreiller',   'linge_maison','eau',             300,  24, 26),
  ('Duvet',              'linge_maison','eau',            4000,  72, 27),
  ('Tapis (par m2)',     'linge_maison','detachage',      1500,  96, 28),
  -- cuir & delicat
  ('Chaussures cuir',    'cuir',        'detachage',      2500,  72, 30),
  ('Sac a main cuir',    'cuir',        'detachage',      3000,  72, 31),
  ('Veste en cuir',      'cuir',        'sec',            5000,  96, 32)
) as t(name, category, wash_type, price, hours, ord)
where p.id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004'
)
on conflict (pressing_id, name, wash_type) do nothing;

-- -----------------------------------------------------------------------------
-- 3. ABONNEMENTS SaaS — plan Free actif pour chaque pressing de demo
-- -----------------------------------------------------------------------------
insert into public.saas_subscriptions
  (pressing_id, plan, price, billing_cycle, status, started_at)
select p.id, 'free', 0, 'none', 'active', now()
from public.pressings p
where p.id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004'
)
  and not exists (
    select 1 from public.saas_subscriptions s where s.pressing_id = p.id
  );

commit;
