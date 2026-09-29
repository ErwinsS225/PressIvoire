-- =============================================================================
--  PressingPro — Migration 008 : vues SQL pour les agrégats
--
--  Remplace les requêtes JavaScript qui calculaient les totaux en mémoire par
--  des vues SQL avec security_invoker, respectant les politiques RLS.
--  Toutes les vues filtre automatiquement sur le pressing courant.
--
--  Appliquer : supabase db push
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Vue 1 : stats_dashboard — KPIs principaux du tableau de bord
-- -----------------------------------------------------------------------------
drop view if exists public.stats_dashboard;
create view public.stats_dashboard with (security_invoker) as
select
  -- Chiffre d'affaires du mois en cours
  (select coalesce(sum(total), 0)
   from public.orders
   where pressing_id = public.app_current_pressing_id()
     and created_at >= date_trunc('month', now())) as current_month_revenue,
  -- Chiffre d'affaires du mois précédent
  (select coalesce(sum(total), 0)
   from public.orders
   where pressing_id = public.app_current_pressing_id()
     and created_at >= date_trunc('month', now() - interval '1 month')
     and created_at < date_trunc('month', now())) as previous_month_revenue,
  -- Commandes en attente (PENDING)
  (select count(*)
   from public.orders
   where pressing_id = public.app_current_pressing_id()
     and status = 'PENDING') as pending_orders_count,
  -- Commandes prêtes (READY)
  (select count(*)
   from public.orders
   where pressing_id = public.app_current_pressing_id()
     and status = 'READY') as ready_orders_count,
  -- Nouveaux clients ce mois-ci
  (select count(*)
   from public.clients
   where pressing_id = public.app_current_pressing_id()
     and created_at >= date_trunc('month', now())) as new_clients_count,
  -- Total commandes du mois
  (select count(*)
   from public.orders
   where pressing_id = public.app_current_pressing_id()
     and created_at >= date_trunc('month', now())) as current_month_orders_count;

-- -----------------------------------------------------------------------------
-- Vue 2 : stats_monthly_revenue — Chiffre d'affaires des 12 derniers mois
-- -----------------------------------------------------------------------------
drop view if exists public.stats_monthly_revenue;
create view public.stats_monthly_revenue with (security_invoker) as
select
  to_char(created_at, 'Mon') as month,
  coalesce(sum(total), 0) as revenue
from public.orders
where pressing_id = public.app_current_pressing_id()
  and created_at >= now() - interval '12 months'
group by date_trunc('month', created_at), to_char(created_at, 'Mon')
order by date_trunc('month', created_at);

-- -----------------------------------------------------------------------------
-- Vue 3 : stats_recent_orders — 5 dernières commandes
-- -----------------------------------------------------------------------------
drop view if exists public.stats_recent_orders;
create view public.stats_recent_orders with (security_invoker) as
select
  o.id,
  o.total,
  o.status,
  o.created_at,
  c.full_name as customer_name
from public.orders o
join public.clients c on o.client_id = c.id
where o.pressing_id = public.app_current_pressing_id()
order by o.created_at desc
limit 5;

-- -----------------------------------------------------------------------------
-- Vue 4 : stats_clients_aggregates — Totaux par client
-- -----------------------------------------------------------------------------
drop view if exists public.stats_clients_aggregates;
create view public.stats_clients_aggregates with (security_invoker) as
select
  c.id as client_id,
  count(o.id) as orders_count,
  coalesce(sum(case when o.payment_status = 'paid' then o.amount_paid else 0 end), 0) as total_revenue,
  coalesce(sum(case when o.payment_status != 'paid' then o.total - coalesce(o.amount_paid, 0) else 0 end), 0) as outstanding,
  max(o.created_at) as last_order_at
from public.clients c
left join public.orders o on c.id = o.client_id
  and o.status != 'CANCELLED'
where c.pressing_id = public.app_current_pressing_id()
  and c.deleted_at is null
group by c.id;

-- -----------------------------------------------------------------------------
-- Vue 5 : stats_weekly_report — Rapport des 7 derniers jours
-- -----------------------------------------------------------------------------
drop view if exists public.stats_weekly_report;
create view public.stats_weekly_report with (security_invoker) as
with date_range as (
  select generate_series(
    date_trunc('day', now() - interval '6 days'),
    date_trunc('day', now()),
    interval '1 day'
  ) as report_date
),
daily_stats as (
  select
    d.report_date,
    count(o.id) as orders_count,
    coalesce(sum(case when o.payment_status = 'paid' then o.amount_paid else 0 end), 0) as daily_revenue
  from date_range d
  left join public.orders o on
    date_trunc('day', o.created_at) = d.report_date
    and o.pressing_id = public.app_current_pressing_id()
    and o.status != 'CANCELLED'
  group by d.report_date
),
totals as (
  select
    coalesce(sum(daily_revenue), 0) as total_revenue,
    sum(orders_count) as total_orders,
    coalesce(sum(case when o.payment_status != 'paid' then o.total - coalesce(o.amount_paid, 0) else 0 end), 0) as total_outstanding
  from public.orders o
  where o.pressing_id = public.app_current_pressing_id()
    and o.created_at >= now() - interval '7 days'
    and o.status != 'CANCELLED'
)
select
  ds.*,
  t.total_revenue,
  t.total_orders,
  t.total_outstanding
from daily_stats ds
cross join totals t
order by ds.report_date;

-- -----------------------------------------------------------------------------
-- Politiques RLS explicites pour les vues (même si security_invoker hérite
-- des politiques des tables sous-jacentes, on les rend explicites)
-- -----------------------------------------------------------------------------
-- Les vues utilisent automatiquement les politiques des tables originelles
-- (orders, clients) qui vérifient déjà app_current_pressing_id() et app_is_staff()
-- Aucune politique supplémentaire nécessaire, l'héritage fonctionne.

-- -----------------------------------------------------------------------------
-- Indexes complémentaires pour optimiser les vues
-- -----------------------------------------------------------------------------
create index if not exists orders_pressing_created_at_status_idx
  on public.orders (pressing_id, created_at, status);

create index if not exists orders_pressing_payment_status_idx
  on public.orders (pressing_id, payment_status);