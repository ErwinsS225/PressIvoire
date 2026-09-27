import Link from "next/link";
import { notFound } from "next/navigation";
import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { Avatar } from "@/components/mobile/avatar";
import { OrderCard, EmptyState } from "@/components/mobile/order-card";
import { StatCard } from "@/components/mobile/stat-card";
import { getClientDetail, getContext, type OrderWithClient } from "@/lib/supabase/queries";
import { formatAmount, formatElapsed, formatFCFA, staggerStyle } from "@/lib/utils";

/**
 * Fiche client.
 *
 * Avant cet ecran, la liste des clients etait un cul-de-sac : la carte
 * n'etait pas cliquable et l'on ne pouvait consulter ni l'historique, ni le
 * solde, ni les forfaits d'un client.
 *
 * Les totaux viennent de `ClientDetail.stats`, calcules depuis les commandes
 * (les colonnes denormalisees de `clients` ne sont maintenues par aucun
 * trigger — cf. le commentaire de `getClientSummaries`).
 */
export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { pressing } = await getContext();
  if (!pressing) notFound();

  const detail = await getClientDetail(params.id);
  if (!detail) notFound();

  const { client, orders, packs, stats } = detail;
  const phoneDigits = (client.phone ?? "").replace(/\D/g, "");

  return (
    <Screen>
      <ScreenHeader title={client.full_name} subtitle={client.commune ?? undefined} backHref="/clients" />

      {/* Identite + contact direct */}
      <div className="px-5">
        <div className="animate-slide-up flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
          <Avatar name={client.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-slate-900">{client.full_name}</p>
            <p className="truncate text-xs text-slate-500">
              {client.phone ?? "Téléphone non renseigné"}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {stats.lastOrderAt
                ? `Dernière commande ${formatElapsed(stats.lastOrderAt)}`
                : "Aucune commande pour l'instant"}
            </p>
          </div>
        </div>

        {/* Raccourcis : appeler, WhatsApp, commander */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ContactAction
            href={client.phone ? `tel:${client.phone}` : undefined}
            icon="📞"
            label="Appeler"
          />
          <ContactAction
            href={phoneDigits ? `https://wa.me/${phoneDigits}` : undefined}
            icon="💬"
            label="WhatsApp"
            external
          />
          <ContactAction
            href={`/commandes/nouvelle?client=${client.id}`}
            icon="➕"
            label="Commander"
          />
        </div>
      </div>

      {/* Chiffres cles */}
      <div className="mt-5 grid grid-cols-2 gap-3 px-5">
        <StatCard
          index={0}
          variant="solid"
          label="Total encaissé"
          value={formatAmount(stats.revenue)}
          unit="FCFA"
          hint={
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {stats.ordersCount} commande{stats.ordersCount > 1 ? "s" : ""} au total
            </span>
          }
        />
        <StatCard
          index={1}
          icon="⏳"
          iconClass={stats.outstanding > 0 ? "bg-amber-50" : "bg-slate-100"}
          value={formatAmount(stats.outstanding)}
          unit="FCFA"
          label="Reste à encaisser"
          accent={stats.outstanding > 0 ? "text-amber-700" : undefined}
        />
        <StatCard
          index={2}
          icon="🎁"
          iconClass="bg-orange-50"
          value={client.loyalty_points}
          label="Points de fidélité"
        />
      </div>

      {client.notes ? (
        <div className="mt-5 px-5">
          <SectionTitle>Note interne</SectionTitle>
          <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
            {client.notes}
          </p>
        </div>
      ) : null}

      <ClientPacks packs={packs} />
      <ClientOrders orders={orders} />
    </Screen>
  );
}

/**
 * Raccourci de contact.
 *
 * Rendu en `<a>` et non en `<button>` : `tel:` et `https://wa.me` doivent
 * ouvrir l'application native du telephone, ce qu'un bouton gere en
 * JavaScript ne ferait pas de facon fiable.
 */
function ContactAction({
  href,
  icon,
  label,
  external,
}: {
  href?: string;
  icon: string;
  label: string;
  external?: boolean;
}) {
  const classes =
    "btn-press flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-white py-3 text-center transition";

  if (!href) {
    return (
      <span className={`${classes} opacity-40`} aria-disabled>
        <span className="text-lg" aria-hidden>
          {icon}
        </span>
        <span className="text-[11px] font-semibold text-slate-400">{label}</span>
      </span>
    );
  }

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${classes} hover:bg-slate-50`}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="text-[11px] font-semibold text-slate-700">{label}</span>
    </a>
  );
}

/** Forfaits pre-payes du client (table `customer_packs`). */
function ClientPacks({
  packs,
}: {
  packs: {
    id: string;
    name: string;
    total_quantity: number;
    used_quantity: number;
    price: number;
    expires_at: string | null;
    status: string;
  }[];
}) {
  if (packs.length === 0) return null;

  const PACK_STATUS_LABELS: Record<string, string> = {
    active: "Actif",
    exhausted: "Épuisé",
    expired: "Expiré",
    cancelled: "Annulé",
  };

  return (
    <section className="mt-6 px-5">
      <SectionTitle>Forfaits</SectionTitle>
      <div className="space-y-2">
        {packs.map((pack, index) => {
          const remaining = pack.total_quantity - pack.used_quantity;
          const ratio = pack.total_quantity > 0 ? remaining / pack.total_quantity : 0;

          return (
            <div
              key={pack.id}
              className="stagger-item rounded-xl border border-slate-100 bg-white p-3"
              style={staggerStyle(index)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{pack.name}</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {PACK_STATUS_LABELS[pack.status] ?? pack.status}
                </span>
              </div>

              {/* Jauge de consommation : se remplit a l'affichage. */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-700 ease-out"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                {remaining} / {pack.total_quantity} article{pack.total_quantity > 1 ? "s" : ""} restant
                {remaining > 1 ? "s" : ""} · payé {formatFCFA(pack.price)}
                {pack.expires_at
                  ? ` · expire le ${new Date(pack.expires_at).toLocaleDateString("fr-FR")}`
                  : ""}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Historique des commandes du client. */
function ClientOrders({ orders }: { orders: OrderWithClient[] }) {
  return (
    <section className="mt-6 px-5">
      <SectionTitle
        action={
          <Link href="/commandes" className="text-xs font-semibold text-orange-500">
            Toutes &rarr;
          </Link>
        }
      >
        Historique ({orders.length})
      </SectionTitle>

      {orders.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Aucune commande"
          hint="La première commande de ce client apparaîtra ici."
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order, index) => (
            <OrderCard key={order.id} order={order} className="stagger-item" style={staggerStyle(index)} />
          ))}
        </div>
      )}
    </section>
  );
}

