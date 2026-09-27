import { Suspense } from "react";
import { Screen, ScreenHeader } from "@/components/mobile/screen";
import { OrderFilters, SearchInput } from "@/components/mobile/filters";
import { OrderCard, EmptyState } from "@/components/mobile/order-card";
import { getContext, getMonthlyOrderCount, getOrders } from "@/lib/supabase/queries";
import { isOrderStatus, type OrderStatus } from "@/lib/constants";

/**
 * Liste des commandes du pressing : filtres par statut + recherche.
 * Les filtres vivent dans l'URL, donc la page reste partageable et le
 * navigateur gere le retour arriere.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { statut?: string; q?: string };
}) {
  const { pressing } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Commandes" />
      </Screen>
    );
  }

  const status: OrderStatus | "all" =
    searchParams.statut && isOrderStatus(searchParams.statut) ? searchParams.statut : "all";
  const search = searchParams.q ?? "";

  const [orders, monthlyCount] = await Promise.all([
    getOrders(pressing.id, { status, search }),
    getMonthlyOrderCount(pressing.id),
  ]);

  return (
    <Screen>
      <ScreenHeader
        title="Commandes"
        subtitle={`${monthlyCount} commande${monthlyCount > 1 ? "s" : ""} ce mois-ci`}
      />

      <div className="space-y-4 px-5">
        <Suspense fallback={<div className="h-10" />}>
          <OrderFilters />
        </Suspense>

        <Suspense fallback={<div className="h-12" />}>
          <SearchInput placeholder="Rechercher un client ou n° de commande..." />
        </Suspense>

        {orders.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Aucune commande"
            hint={
              search
                ? `Aucun resultat pour « ${search} ».`
                : "Les commandes creees apparaitront ici."
            }
          />
        ) : (
          <div className="space-y-2">
            {orders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}
              />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
