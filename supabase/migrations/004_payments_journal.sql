-- =============================================================================
--  PressingPro — Migration 004 : journal des encaissements
--
--  POURQUOI CETTE MIGRATION
--  `recordPayment()` (app/actions/orders.ts) mettait a jour `orders.amount_paid`
--  mais n'inserait JAMAIS de ligne dans `payments`. Consequence : la table
--  `payments` restait vide, et `orders.payment_method` est ecrase a chaque
--  encaissement. Un paiement fractionne (500 F especes puis 500 F Wave) se
--  retrouvait donc integralement attribue a Wave. Une caisse batie la-dessus
--  afficherait une ventilation par moyen de paiement fausse.
--
--  Cette fonction ecrit les deux tables dans UNE transaction, et n'accepte
--  jamais plus que le reste du.
--
--  ⚠ Meme ecart assume que pour l'onboarding : une fonction Postgres
--    SECURITY DEFINER plutot qu'une Edge Function. Atomicite native, testable.
--
--  Appliquer : node scripts/db-apply.mjs   OU   supabase db push
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

create or replace function public.record_payment(
  p_order_id uuid,
  p_amount   integer,
  p_method   text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_pressing  uuid;
  v_total     integer;
  v_paid      integer;
  v_remaining integer;
  v_applied   integer;
  v_new_paid  integer;
  v_status    text;
begin
  -- -- Garde-fous ---------------------------------------------------------
  if v_user is null then
    raise exception 'Authentification requise';
  end if;

  -- La fonction est SECURITY DEFINER : elle contourne le RLS, donc elle
  -- rejoue explicitement le controle de la policy « enregistrement par le
  -- personnel ».
  if not public.app_is_staff() then
    raise exception 'Seul le personnel du pressing peut encaisser';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide';
  end if;

  if p_method is null
     or p_method not in ('cash', 'wave', 'orange', 'mtn', 'moov', 'card', 'transfer') then
    raise exception 'Moyen de paiement inconnu : %', coalesce(p_method, 'null');
  end if;

  -- -- La commande --------------------------------------------------------
  select total, coalesce(amount_paid, 0), pressing_id
    into v_total, v_paid, v_pressing
    from public.orders
   where id = p_order_id;

  if v_pressing is null then
    raise exception 'Commande introuvable';
  end if;

  if v_pressing is distinct from public.app_current_pressing_id() then
    raise exception 'Cette commande appartient a un autre pressing';
  end if;

  v_remaining := v_total - v_paid;
  if v_remaining <= 0 then
    raise exception 'Cette commande est deja entierement payee';
  end if;

  -- On plafonne plutot que de rejeter : l'IHM propose parfois le solde
  -- arrondi, et refuser un encaissement pour 1 FCFA de trop est plus
  -- penalisant pour le caissier que d'accepter le trop-percu.
  v_applied  := least(p_amount, v_remaining);
  v_new_paid := v_paid + v_applied;
  v_status   := case when v_new_paid >= v_total then 'paid' else 'partial' end;

  -- -- 1. La commande -----------------------------------------------------
  update public.orders
     set amount_paid    = v_new_paid,
         payment_status = v_status,
         payment_method = p_method,
         updated_at     = now()
   where id = p_order_id;

  -- -- 2. Le journal ------------------------------------------------------
  -- C'est LA ligne qui manquait : sans elle, aucune ventilation par moyen
  -- de paiement n'est possible a posteriori.
  insert into public.payments (
    order_id, pressing_id, amount, method, status, paid_at, created_by
  )
  values (
    p_order_id, v_pressing, v_applied, p_method, 'success', now(), v_user
  );

  return jsonb_build_object(
    'amount_paid',    v_new_paid,
    'payment_status', v_status,
    'applied',        v_applied,
    'remaining',      greatest(v_total - v_new_paid, 0)
  );
end;
$$;

revoke all on function public.record_payment(uuid, integer, text) from public, anon;
grant execute on function public.record_payment(uuid, integer, text) to authenticated;
