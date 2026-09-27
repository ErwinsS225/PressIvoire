import { notFound } from "next/navigation";
import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { Avatar } from "@/components/mobile/avatar";
import { PaymentBadge } from "@/components/mobile/status-badge";
import { OrderActions } from "@/components/mobile/order-actions";
import { getContext, getOrderDetail } from "@/lib/supabase/queries";
import { ORDER_STATUS_LABELS, WASH_TYPE_LABELS, toOrderStatus, type OrderStatus } from "@/lib/constants";
import { formatAmount, formatElapsed } from "@/lib/utils";

/** Titre d'onglet = numero de commande. */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const { db } = await getContext();
  const { data } = await db
    .from("orders")
    .select("order_number")
    .eq("id", params.id)
    .maybeSingle();
  return { title: data?.order_number ?? "Commande" };
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const { pressing } = await getContext();
  const order = await getOrderDetail(params.id);

  // Le pressing est verifie explicitement : une commande d'un autre pressing
  // ne doit pas etre accessible, meme si l'UUID est connu.
  if (!order || !pressing || order.pressing_id !== pressing.id) notFound();

  const clientName = order.client?.full_name ?? "Client supprimé";
  const status = toOrderStatus(order.status);

  return (
    <Screen>
      <ScreenHeader
        title={order.order_number}
        subtitle={`Créée ${formatElapsed(order.created_at)}`}
        backHref="/commandes"
      />

      <div className="space-y-4 px-5">
        <StatusBanner
          status={status}
          estimatedReadyAt={order.estimated_ready_at}
        />

        <section>
          <SectionTitle>Client</SectionTitle>
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
            <Avatar name={clientName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{clientName}</p>
              {order.client?.phone ? (
                <a
                  href={`tel:${order.client.phone}`}
                  className="text-xs text-slate-500 underline-offset-2 hover:underline"
                >
                  {order.client.phone}
                </a>
              ) : (
                <p className="text-xs text-slate-400">Aucun téléphone</p>
              )}
            </div>
            {order.client?.phone ? (
              <a
                href={`tel:${order.client.phone}`}
                aria-label={`Appeler ${clientName}`}
                className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
              >
                <span className="text-sm" aria-hidden>
                  &#9742;
                </span>
              </a>
            ) : null}
          </div>
        </section>

        <section>
          <SectionTitle>Articles ({order.items.length})</SectionTitle>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3">
                <span className="text-lg" aria-hidden>
                  {ITEM_ICONS[item.wash_type] ?? "👕"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.article_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {WASH_TYPE_LABELS[item.wash_type as keyof typeof WASH_TYPE_LABELS] ??
                      item.wash_type}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">
                    {formatAmount(item.total_price ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex animate-slide-up items-center justify-between rounded-2xl bg-slate-900 p-4 text-white">
          <div>
            <p className="text-xs font-medium text-slate-400">Total à payer</p>
            <p className="mt-0.5 text-2xl font-black">
              {formatAmount(order.total)}
              <span className="text-sm font-bold text-slate-400"> FCFA</span>
            </p>
            {order.amount_paid > 0 ? (
              <p className="mt-1 text-xs text-slate-400">
                Déjà réglé : {formatAmount(order.amount_paid)} FCFA
              </p>
            ) : null}
          </div>
          <PaymentBadge
            paymentStatus={order.payment_status}
            amountPaid={order.amount_paid}
            total={order.total}
            className="self-start"
          />
        </div>

        <OrderActions
          orderId={order.id}
          pressingId={pressing.id}
          status={order.status}
          total={order.total}
          amountPaid={order.amount_paid}
          currency="FCFA"
        />
      </div>
    </Screen>
  );
}

/** Bandeau vert degrade plein largeur, avec l'icone du statut. */
function StatusBanner({
  status,
  estimatedReadyAt,
}: {
  status: OrderStatus;
  estimatedReadyAt: string | null;
}) {
  return (
    <div
      className="animate-scale-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white"
      role="status"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl animate-pulse-soft">
          <span aria-hidden>{STATUS_ICONS[status]}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-green-100">Statut actuel</p>
          <p className="truncate text-lg font-black">{ORDER_STATUS_LABELS[status]}</p>
        </div>
      </div>

      {estimatedReadyAt ? (
        <div className="relative mt-3 flex items-center gap-2 border-t border-white/20 pt-3 text-xs text-green-100">
          <span aria-hidden>🕐</span>
          <span>
            Prêt estimé le{" "}
            {new Date(estimatedReadyAt).toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: "📥",
  pickup_scheduled: "🗓️",
  picked_up: "🚚",
  in_processing: "🧺",
  ready: "✅",
  out_for_delivery: "🛵",
  delivered: "🎉",
  cancelled: "❌",
  disputed: "⚠️",
};

const ITEM_ICONS: Record<string, string> = {
  sec: "👔",
  eau: "👕",
  repassage_seul: "♨️",
  detachage: "🧴",
};

