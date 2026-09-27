import { Suspense } from "react";
import { Screen, ScreenHeader } from "@/components/mobile/screen";
import { SearchInput } from "@/components/mobile/filters";
import { Avatar } from "@/components/mobile/avatar";
import { EmptyState } from "@/components/mobile/order-card";
import { getClientSummaries, getContext } from "@/lib/supabase/queries";
import { formatAmount, formatFCFA, formatRelativeDate, staggerStyle } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Clients" };

/**
 * Annuaire des clients du pressing.
 *
 * Les totaux (encaisse, reste du, nombre de commandes, derniere visite) sont
 * calcules depuis les commandes : les colonnes denormalisees de `clients` ne
 * sont maintenues par aucun trigger et restaient donc a zero.
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { pressing } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Clients" />
      </Screen>
    );
  }

  const search = searchParams.q ?? "";
  const clients = await getClientSummaries(pressing.id, search);

  const totalOutstanding = clients.reduce((sum, client) => sum + client.outstanding, 0);

  return (
    <Screen>
      <ScreenHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? "s" : ""}${
          totalOutstanding > 0 ? ` · ${formatFCFA(totalOutstanding)} à recouvrer` : ""
        }`}
      />

      <div className="space-y-4 px-5">
        <Suspense fallback={<div className="h-12" />}>
          <SearchInput placeholder="Rechercher un client..." />
        </Suspense>

        {clients.length === 0 ? (
          <EmptyState
            icon="👥"
            title={search ? "Aucun résultat" : "Aucun client"}
            hint={
              search
                ? `Aucun client ne correspond à « ${search} ».`
                : "Vos clients apparaîtront ici après leur première commande."
            }
          />
        ) : (
          <div className="space-y-2">
            {clients.map((client, index) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="stagger-item card-hover flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
                style={staggerStyle(index)}
              >
                <Avatar name={client.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {client.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {client.orders_count} commande{client.orders_count > 1 ? "s" : ""}
                    {client.last_order ? ` · ${formatRelativeDate(client.last_order)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {client.outstanding > 0 ? (
                    <p className="text-[10px] font-bold text-amber-600">
                      {formatAmount(client.outstanding)} dû
                    </p>
                  ) : client.loyalty_points > 0 ? (
                    <p className="text-[10px] font-bold text-orange-500">
                      {client.loyalty_points} pts
                    </p>
                  ) : null}
                  <p className="text-xs font-semibold text-slate-700">
                    {formatAmount(client.revenue)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
