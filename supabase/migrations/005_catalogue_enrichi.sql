-- =============================================================================
--  PressingPro — Migration 005 : enrichissement du catalogue type
--
--  Ajoute ~23 articles manquants au catalogue de reference, donc a TOUS les
--  nouveaux pressings crees par l'onboarding (la fonction
--  `get_reference_catalogue()` lit le pressing de reference).
--
--  Les articles deja presents ne sont PAS concernes : "Rideaux", "Draps" et
--  "Couverture" figuraient deja dans le seed 001. Ce complement couvre ce
--  qu'un pressing abidjanais encounters reellement et qui manquait : linge de
--  bain, housses de couette, pyjamas, Articles delicats.
--
--  Idempotent : `on conflict do nothing` sur (pressing_id, name, wash_type).
--  Rejouable sans effet de bord.
-- =============================================================================

-- Appliquer : supabase db push   OU   node scripts/db-apply.mjs
--             OU   SQL Editor du dashboard Supabase.

insert into public.articles
  (pressing_id, name, category, wash_type, price, estimated_hours, sort_order)
select
  p.id, t.name, t.category, t.wash_type, t.price, t.hours, t.ord
from public.pressings p
cross join (values
  -- VETEMENTS COURANTS (ce qui manquait autour du t-shirt et du jean)
  ('Gilet (pull)',            'habit',       'eau',              800,  24, 40),
  ('Cardigan',                'habit',       'eau',              900,  24, 41),
  ('Blazer',                  'habit',       'sec',             2500,  48, 42),
  ('Chemisier',               'habit',       'eau',              800,  24, 43),
  ('Short',                   'habit',       'eau',              500,  24, 44),
  ('Maillot',                 'habit',       'eau',              300,  12, 45),
  ('Cravate',                 'habit',       'sec',              800,  24, 46),
  ('Linge de corps (x3)',     'habit',       'eau',              600,  24, 47),
  ('Chemise de nuit',         'habit',       'eau',             1000,  24, 48),
  ('Pyjama 2 pieces',         'habit',       'eau',             1500,  24, 49),

  -- LINGE DE MAISON : bain et protections
  ('Serviette de bain',       'linge_maison', 'eau',              500,  24, 50),
  ('Serviette de toilette',   'linge_maison', 'eau',              300,  24, 51),
  ('Drap de bain',            'linge_maison', 'eau',              800,  24, 52),
  ('Essuie-mains (lot de 2)', 'linge_maison', 'eau',              400,  24, 53),
  ('Housse de couette',       'linge_maison', 'eau',             1500,  48, 54),
  ('Housse de coussin',       'linge_maison', 'eau',              500,  24, 55),
  ('Housse de canape',        'linge_maison', 'eau',             2000,  72, 56),
  ('Edredon',                 'linge_maison', 'eau',             3000,  72, 57),
  ('Plaid',                   'linge_maison', 'eau',             1200,  48, 58),
  ('Tapis de salle de bain',  'linge_maison', 'eau',              600,  24, 59),
  ('Rideau occultant (m2)',   'linge_maison', 'eau',              900,  72, 60),

  -- CUIR
  ('Ceinture',                'cuir',         'sec',              800,  24, 61),
  ('Sac a dos',               'cuir',         'detachage',       1500,  72, 62)
) as t(name, category, wash_type, price, hours, ord)
on conflict (pressing_id, name, wash_type) do nothing;
