import Link from "next/link";
import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { StatCard } from "@/components/mobile/stat-card";
import { OrderCard, EmptyState } from "@/components/mobile/order-card";
import { getContext, getDeliveryBoard, type OrderWithClient } from "@/lib/supabase/queries";
import { DELIVERY_STATUS_LABELS, DELIVERY_TYPE_LABELS } from "@/lib/constants";
import { formatFCFA, formatRelativeDate, staggerStyle } from "@/lib/utils";

export const metadata = { title: "Tournées" };

/**
 * Tournee du jour : ce qui part, ce qui revient.
 *
 * La table `deliveries` n'est alimentee par aucune action de l'application a ce
 * stade. La tournee est donc DERIVEE du statut des commandes, ce qui la rend
 * juste avec les donnees existantes ; les missions de `deliveries` sont
 * affichees en plus lorsqu'elles existent, pour l'affectation a un livreur.
 */
export default async function DeliveriesPage() {
  const { pressing } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Tournées" />
      </Screen>
    );
  }

  const board = await getDeliveryBoard(pressing.id);
  const homeDeliveries = board.toDeliver.filter((order) => order.delivery_type === "home_delivery");

  return (
    <Screen>
      <ScreenHeader
        title="Tournées"
        subtitle={`${board.toDeliver.length} à livrer · ${board.toCollect.length} à collecter`}
      />

      <div className="grid grid-cols-2 gap-3 px-5">
        <StatCard
          index={0}
          icon="🚚"
          iconClass="bg-violet-50"
          value={board.toDeliver.length}
          label="Commandes à remettre"
          hint={`dont ${homeDeliveries.length} à domicile`}
        />
        <StatCard
          index={1}
          icon="🏠"
          iconClass="bg-sky-50"
          value={board.toCollect.length}
          label="Collectes à effectuer"
        />
      </div>

      {board.lateOrders.length > 0 ? (
        <section className="mt-6 px-5">
          <SectionTitle>En attente depuis plus de 24 h ({board.lateOrders.length})</SectionTitle>
          <div className="space-y-2">
            {board.lateOrders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                className="stagger-item border-amber-200 bg-amber-50/60"
                style={staggerStyle(index)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <ShipmentSection
        title={`À remettre (${board.toDeliver.length})`}
        emptyIcon="✨"
        emptyTitle="Rien à remettre"
        emptyHint="Les commandes prêtes apparaîtront ici."
        orders={board.toDeliver}
      />

      <ShipmentSection
        title={`Collectes à domicile (${board.toCollect.length})`}
        emptyIcon="🏠"
        emptyTitle="Aucune collecte prévue"
        emptyHint="Les collectes à domicile apparaîtront ici."
        orders={board.toCollect}
      />

      <MissionSection missions={board.missions} />

      {board.toDeliver.length === 0 && board.toCollect.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon="🎉"
            title="Tournée terminée"
            hint="Aucune commande en attente de livraison ou de collecte."
            action={
              <Link
                href="/commandes"
                className="btn-press inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
              >
                Voir les commandes
              </Link>
            }
          />
        </div>
      ) : null}
    </Screen>
  );
}

/** Bloc de commandes a remettre ou a collecter. */
function ShipmentSection({
  title,
  emptyIcon,
  emptyTitle,
  emptyHint,
  orders,
}: {
  title: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyHint: string;
  orders: OrderWithClient[];
}) {
  return (
    <section className="mt-6 px-5">
      <SectionTitle>{title}</SectionTitle>

      {orders.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />
      ) : (
        <div className="space-y-2">
          {orders.map((order, index) => (
            <ShipmentRow key={order.id} order={order} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Ligne de tournee.
 *
 * On precise le mode de remise (comptoir ou domicile), le telephone et
 * l'adresse : un livreur doit savoir ou aller sans ouvrir la fiche.
 */
function ShipmentRow({ order, index }: { order: OrderWithClient; index: number }) {
  const name = order.client?.full_name ?? "Client supprimé";
  const isHome = order.delivery_type === "home_delivery";

  return (
    <Link
      href={`/commandes/${order.id}`}
      className="stagger-item card-hover block rounded-xl border border-slate-100 bg-white p-3"
      style={staggerStyle(index)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isHome ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {isHome ? "Domicile" : "Comptoir"}
        </span>
      </div>

      <p className="mt-0.5 truncate text-xs text-slate-500">
        {order.order_number} · {order.client?.phone ?? "sans téléphone"}
      </p>

      {isHome && order.delivery_address ? (
        <p className="mt-0.5 truncate text-xs text-slate-400">📍 {order.delivery_address}</p>
      ) : null}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{formatRelativeDate(order.created_at)}</span>
        <span className="text-xs font-bold text-slate-700">{formatFCFA(order.total)}</span>
      </div>
    </Link>
  );
}

/** Missions de la table `deliveries` (affectation a un livreur). */
function MissionSection({
  missions,
}: {
  missions: {
    id: string;
    order_id: string;
    type: string;
    status: string;
    scheduled_at: string | null;
    order_number: string | null;
    client_name: string | null;
  }[];
}) {
  if (missions.length === 0) return null;

  return (
    <section className="mt-6 px-5">
      <SectionTitle>Missions affectées ({missions.length})</SectionTitle>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
        {missions.map((mission, index) => (
          <Link
            key={mission.id}
            href={`/commandes/${mission.order_id}`}
            className="stagger-item flex items-center gap-3 p-3"
            style={staggerStyle(index)}
          >
            <span className="text-lg" aria-hidden>
              {mission.type === "pickup" ? "🏠" : "🚚"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {mission.client_name ?? "Client supprimé"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {mission.order_number ?? "—"}
                {" · "}
                {DELIVERY_TYPE_LABELS[mission.type] ?? mission.type}
                {mission.scheduled_at ? ` · ${formatRelativeDate(mission.scheduled_at)}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {DELIVERY_STATUS_LABELS[mission.status] ?? mission.status}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
