import { redirect } from "next/navigation";
import { type OrderStatus } from "@/lib/constants";
import {
  CircleDollarSign,
  Clock,
  PackageCheck,
  Users,
  PlusCircle,
} from "lucide-react";

import { getContext, getDashboardData } from "@/lib/supabase/queries";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { formatFCFA } from "@/lib/utils";

export default async function DashboardPage() {
  const { pressing, profile } = await getContext();

  if (!pressing) {
    redirect("/onboarding/pressing");
  }

  const data = await getDashboardData(pressing.id);
  const firstName = (profile?.full_name ?? "Gérant").split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <Header
        title="Tableau de bord"
        subtitle={`Bonjour ${firstName}, bienvenue sur votre espace de gestion.`}
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nouvelle Commande
        </Button>
      </Header>

      <main className="grid gap-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            title="Revenus (30j)"
            value={formatFCFA(data.revenue.total)}
            change={data.revenue.change}
            iconType="revenue"
            description={`${data.orders.count} commandes ce mois-ci`}
            variant="glass"
            linkHref="/rapports"
            linkLabel="Voir les rapports"
          />
          <StatCard
            index={1}
            title="Commandes en attente"
            value={data.pendingOrders}
            change={0}
            iconType="pending"
            description="Commandes non encore traitées"
            variant="sharp"
            linkHref="/orders"
            linkLabel="Traiter les commandes"
          />
          <StatCard
            index={2}
            title="Commandes prêtes"
            value={data.readyOrders}
            change={0}
            iconType="ready"
            description="Prêtes à être récupérées ou livrées"
            variant="soft"
            linkHref="/livraisons"
            linkLabel="Voir les livraisons"
          />
          <StatCard
            index={3}
            title="Nouveaux clients (30j)"
            value={data.newClients}
            change={0}
            iconType="clients"
            description="Clients inscrits ce mois-ci"
            variant="glass"
            linkHref="/clients"
            linkLabel="Voir les clients"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <RevenueChart data={data.monthlyRevenue} />
          </div>
          <div className="lg:col-span-3">
            <RecentOrders orders={data.recentOrders} />
          </div>
        </section>
      </main>
    </div>
  );
}