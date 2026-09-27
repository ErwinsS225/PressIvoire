import Link from "next/link";
import { NotificationBell, Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { OrderCard, EmptyState } from "@/components/mobile/order-card";
import { StatCard } from "@/components/mobile/stat-card";
import {
  getContext,
  getDashboardData,
  getNotificationCounts,
} from "@/lib/supabase/queries";
import { formatAmount, staggerStyle } from "@/lib/utils";

/**
 * Tableau de bord du gerant : CA du jour, commandes en cours, acces rapides.
 *
 * Tout est calcule cote serveur : la page ne fait aucun aller-retour client au
 * chargement, ce qui compte sur une connexion 3G. Les deux requetes independantes
 * (indicateurs + compteurs de notification) partent en parallele.
 */
export default async function DashboardPage() {
  const { pressing, profile } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Onboarding requis" />
        <div className="px-5">
          <EmptyState
            icon="🏪"
            title="Votre pressing n'est pas encore configuré"
            hint="Complétez la création de votre pressing pour voir apparaître vos données de gestion."
            action={
              <Link
                href="/onboarding/pressing"
                className="btn-press inline-flex rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Continuer la configuration
              </Link>
            }
          />
        </div>
      </Screen>
    );
  }

  const [data, notifications] = await Promise.all([
    getDashboardData(pressing.id),
    getNotificationCounts(pressing.id),
  ]);

  const firstName = (profile?.full_name ?? "Gérant").split(" ")[0];
  const unread = notifications.queued + notifications.failed;

  return (
    <Screen>
      {/* En-tete */}
      <ScreenHeader
        title={pressing.name}
        subtitle={
          <>
            Bonjour {firstName} 👋 &bull; {pressing.commune}
          </>
        }
        action={<NotificationBell count={unread} />}
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 px-5">
        <StatCard
          index={0}
          variant="solid"
          label="CA du jour"
          value={formatAmount(data.revenueToday)}
          unit="FCFA"
          trend={data.revenueTrend}
          hint={
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              {data.ordersToday} commande{data.ordersToday > 1 ? "s" : ""} aujourd&apos;hui
            </span>
          }
        />
        <StatCard
          index={1}
          icon="🧺"
          iconClass="bg-blue-50"
          value={data.inProcessing}
          label="En traitement"
          href="/commandes?statut=in_processing"
        />
        <StatCard
          index={2}
          icon="✅"
          iconClass="bg-green-50"
          value={data.readyToDeliver}
          label="Prêtes à livrer"
          href="/commandes?statut=ready"
        />
      </div>

      <QuickActions />

      {/* A livrer aujourd'hui */}
      <section className="mt-6 px-5">
        <SectionTitle
          action={
            <Link href="/commandes" className="text-xs font-semibold text-orange-500">
              Tout voir &rarr;
            </Link>
          }
        >
          À livrer aujourd&apos;hui
        </SectionTitle>

        {data.toDeliver.length === 0 ? (
          <EmptyState
            icon="✨"
            title="Rien à livrer"
            hint="Les nouvelles commandes apparaîtront ici."
            action={
              <Link
                href="/commandes/nouvelle"
                className="btn-press inline-flex rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Nouvelle commande
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {data.toDeliver.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                variant="compact"
                className="stagger-item"
                style={staggerStyle(index)}
              />
            ))}
          </div>
        )}
      </section>
    </Screen>
  );
}

/**
 * Acces rapides.
 *
 * Le gerant ouvre l'application pour faire une action precise (encaisser,
 * ajouter un article, verifier une tournee). Les raccourcis evitent de passer
 * par le hub "Plus" a chaque fois.
 */
function QuickActions() {
  const actions = [
    { href: "/caisse", icon: "💰", label: "Caisse", color: "bg-emerald-50" },
    { href: "/catalogue", icon: "🧺", label: "Catalogue", color: "bg-orange-50" },
    { href: "/livraisons", icon: "🚚", label: "Tournées", color: "bg-violet-50" },
    { href: "/rapports", icon: "📊", label: "Rapports", color: "bg-blue-50" },
  ];

  return (
    <section className="mt-6 px-5">
      <SectionTitle>Accès rapides</SectionTitle>

      <div className="grid grid-cols-4 gap-2">
        {actions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className="stagger-item btn-press card-hover flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white py-3 text-center"
            style={staggerStyle(index, 40)}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${action.color}`}
              aria-hidden
            >
              {action.icon}
            </span>
            <span className="text-[10px] font-semibold text-slate-600">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

