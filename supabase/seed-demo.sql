-- =============================================================================
--  PressingPro — JEU DE DEMONSTRATION (clients + commandes)
--  Optionnel : s'applique APRES 001_init.sql et seed.sql.
--  Remplit le pressing de demo avec des donnees ivoiriennes realistes afin de
--  valider l'interface : dashboard, listes, detail, encaissement.
--
--  Appliquer :  node scripts/db-apply.mjs --file supabase/seed-demo.sql
--  ou        :  SQL Editor du dashboard
--
--  ⚠ Donnees fictives, reservees au developpement. En production ce fichier
--    n'est pas charge : les clients reels arrivent par l'onboarding.
--  ⚠ Idempotent : peut etre rejoue sans dupliquer.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. CLIENTS (8 clients ivoiriens)
--    Les numeros respectent le CHECK ^\+225[0-9]{8,10}$ et l'unicite par
--    pressing (clients_pressing_phone_uk).
-- -----------------------------------------------------------------------------
insert into public.clients
  (id, pressing_id, full_name, phone, commune, address, loyalty_points, total_orders, total_spent)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000002',
   'Awa Koné',         '+2250708091011', 'Cocody',      'Angré 8e tranche',  120, 7, 48500),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000002',
   'Yao Brou',         '+2250102030405', 'Yopougon',    'Siporex',            60, 4, 27000),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000002',
   'Fatou Diallo',     '+2250505060708', 'Marcory',     'Zone 4',             30, 2, 11000),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000002',
   'Kouassi Bamba',    '+2250707080910', 'Cocody',      'Riviera 2',           0, 1,  2500),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000002',
   'Mariam Traoré',    '+2250909091012', 'Treichville', 'Bloc 5',              90, 5, 38000),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000002',
   'Jean-Marc Yao',    '+2250103040506', 'Plateau',     'Rue du Commerce',     15, 1,  7500),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000002',
   'Adjoua N’Guessan', '+2250507080913', 'Cocody',      'Deux Plateaux',       45, 3, 19500),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000002',
   'Siaka Ouattara',   '+2250703040507', 'Yopougon',    'Kennedy',              0, 0,     0)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. COMMANDES
--    Contrainte de coherence imposee par la base :
--    total = subtotal + delivery_fee + express_fee - discount.
--    created_at est volontairement proche de now() : le dashboard n'affiche
--    que la journee en cours.
-- -----------------------------------------------------------------------------
insert into public.orders
  (id, pressing_id, client_id, order_number, status, delivery_type,
   subtotal, delivery_fee, express_fee, discount, total,
   payment_status, amount_paid, payment_method, created_at)
values
  -- prete, encaissee par Wave
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000101', 'PR-2026-0001', 'ready', 'in_store',
   6500, 0, 0, 0, 6500, 'paid', 6500, 'wave', now() - interval '2 hours'),
  -- en traitement, non payee
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000102', 'PR-2026-0002', 'in_processing', 'in_store',
   14800, 0, 0, 0, 14800, 'unpaid', 0, null, now() - interval '3 hours'),
  -- recue, non payee
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000103', 'PR-2026-0003', 'pending', 'in_store',
   5000, 0, 0, 0, 5000, 'unpaid', 0, null, now() - interval '1 hour'),
  -- en livraison, paiement partiel (frais de livraison 1000 inclus)
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000105', 'PR-2026-0004', 'out_for_delivery', 'home_delivery',
   12400, 1000, 0, 0, 13400, 'partial', 10000, 'cash', now() - interval '5 hours'),
  -- livree et payee, hier
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000104', 'PR-2026-0005', 'delivered', 'in_store',
   2500, 0, 0, 0, 2500, 'paid', 2500, 'cash', now() - interval '1 day'),
  -- livree et payee, avant-hier
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000106', 'PR-2026-0006', 'delivered', 'in_store',
   7000, 0, 0, 0, 7000, 'paid', 7000, 'orange', now() - interval '2 days')
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 3. LIGNES DE COMMANDE
--    article_name est un instantane recopie du catalogue, article_id pointe
--    vers la ligne du catalogue. total_price est genere (quantity*unit_price).
--    La jointure se fait sur "nom - lavage" : lisible et idempotente.
--
--    order_items n'a AUCUNE contrainte d'unicite : sans le nettoyage ci-dessous,
--    un rejeu du fichier insererait chaque ligne une seconde fois. On supprime
--    donc les lignes des commandes de demonstration avant de les recrire — le
--    resultat est identique a chaque execution.
-- -----------------------------------------------------------------------------
delete from public.order_items i
 where i.order_id in (
   select o.id
     from public.orders o
    where o.id::text like '00000000-0000-4000-8000-0000000002%'
 );

insert into public.order_items
  (order_id, article_id, article_name, quantity, unit_price, wash_type)
select o.id, a.id, a.name, oi.quantity, oi.price, oi.wash
from (values
  -- commande,                 article,                 qte, prix, lavage
  ('00000000-0000-4000-8000-000000000201', 'Chemise - sec',           2, 1000, 'sec'),
  ('00000000-0000-4000-8000-000000000201', 'Costume 2 pieces - sec',  1, 3000, 'sec'),
  ('00000000-0000-4000-8000-000000000201', 'Robe simple - sec',       1, 1500, 'sec'),
  ('00000000-0000-4000-8000-000000000202', 'Pantalon - sec',          4, 1200, 'sec'),
  ('00000000-0000-4000-8000-000000000202', 'Chemise - sec',           4, 1000, 'sec'),
  ('00000000-0000-4000-8000-000000000202', 'Costume 2 pieces - sec',  2, 3000, 'sec'),
  ('00000000-0000-4000-8000-000000000203', 'Robe simple - eau',       5, 1000, 'eau'),
  ('00000000-0000-4000-8000-000000000204', 'Costume 2 pieces - sec',  2, 3000, 'sec'),
  ('00000000-0000-4000-8000-000000000204', 'Pantalon - eau',          4,  700, 'eau'),
  ('00000000-0000-4000-8000-000000000204', 'Chemise - eau',           4,  500, 'eau'),
  ('00000000-0000-4000-8000-000000000204', 'Chemise - repassage_seul',4,  400, 'repassage_seul'),
  ('00000000-0000-4000-8000-000000000205', 'Chemise - eau',           5,  500, 'eau'),
  ('00000000-0000-4000-8000-000000000206', 'Jean - eau',              5, 1000, 'eau'),
  ('00000000-0000-4000-8000-000000000206', 'T-shirt - eau',           5,  400, 'eau')
) as oi(order_id, article, quantity, price, wash)
join public.orders o on o.id = oi.order_id::uuid
join public.articles a
  on a.pressing_id = o.pressing_id
 and a.name || ' - ' || a.wash_type = oi.article;

-- Recalcule les totaux a partir des lignes reellement inserees et resynchronise
-- l'encaissement. Garantit subtotal = somme des lignes, meme si les montants
-- du bloc 2 ont ete saisis a la main ou qu'un prix de catalogue a bouge.
update orders o
   set subtotal = s.total_lignes,
       total    = s.total_lignes + o.delivery_fee + o.express_fee - o.discount,
       amount_paid = least(o.amount_paid,
                          s.total_lignes + o.delivery_fee + o.express_fee - o.discount)
  from (
    select i.order_id, sum(i.quantity * i.unit_price)::int as total_lignes
      from order_items i
     group by i.order_id
  ) s
 where s.order_id = o.id
   and o.id::text like '00000000-0000-4000-8000-0000000002%'
   and (o.subtotal, o.total)
       is distinct from (s.total_lignes,
                         s.total_lignes + o.delivery_fee + o.express_fee - o.discount);

commit;

-- -----------------------------------------------------------------------------
-- 4. CONTROLE : la somme des lignes doit egaler le sous-total de chaque
--    commande. Toute ligne renvoyee ici signale un prix de catalogue perime.
--    (Resultat attendu : aucune ligne.)
-- -----------------------------------------------------------------------------
select o.order_number,
       o.subtotal                     as total_a_payer,
       sum(i.quantity * i.unit_price) as total_lignes
  from public.orders o
  join public.order_items i on i.order_id = o.id
 where o.id::text like '00000000-0000-4000-8000-0000000002%'
 group by o.order_number, o.subtotal
having o.subtotal <> sum(i.quantity * i.unit_price);

