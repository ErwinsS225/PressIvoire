import Link from "next/link";
import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { StatCard } from "@/components/mobile/stat-card";
import { getContext, getReports, REPORT_WINDOW_DAYS, type ReportDay } from "@/lib/supabase/queries";
import {
  ORDER_STATUS_LABELS,
  paymentMethodLabel,
  paymentMethodStyle,
  toOrderStatus,
} from "@/lib/constants";
import { barStyle, formatAmount, formatFCFA, staggerStyle } from "@/lib/utils";

export const metadata = { title: "Rapports" };

/**
 * Rapports d'activite sur 7 jours.
 *
 * ⚠ Le chiffre d'affaires est rattache au JOUR DE CREATION de la commande,
 * convention deja retenue par le tableau de bord — les deux ecrans affichent
 * donc le meme CA du jour, ce qui ne serait pas le cas si l'un comptait au
 * jour d'encaissement et l'autre au jour de commande.
 */
export default async function ReportsPage() {
  const { pressing } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Rapports" />
      </Screen>
    );
  }

  const report = await getReports(pressing.id);
  const busiestDay = report.days.reduce(
    (best, day) => (day.orders > best.orders ? day : best),
    report.days[0],
  );

  return (
    <Screen>
      <ScreenHeader
        title="Rapports"
        subtitle={`${REPORT_WINDOW_DAYS} derniers jours · ${pressing.name}`}
      />

      <div className="grid grid-cols-2 gap-3 px-5">
        <StatCard
          index={0}
          variant="solid"
          label="Chiffre d'affaires encaissé"
          value={formatAmount(report.totalRevenue)}
          unit="FCFA"
          hint={
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {report.totalOrders} commande{report.totalOrders > 1 ? "s" : ""} sur la période
            </span>
          }
        />
        <StatCard
          index={1}
          icon="🧾"
          iconClass="bg-blue-50"
          value={formatAmount(report.averageBasket)}
          unit="FCFA"
          label="Panier moyen"
        />
        <StatCard
          index={2}
          icon="⏳"
          iconClass={report.outstanding > 0 ? "bg-amber-50" : "bg-slate-100"}
          value={formatAmount(report.outstanding)}
          unit="FCFA"
          label="Reste à encaisser"
          accent={report.outstanding > 0 ? "text-amber-700" : undefined}
        />
      </div>

      <RevenueChart days={report.days} />

      <TopArticles articles={report.topArticles} />

      <TopClients clients={report.topClients} />

      <MethodSplit byMethod={report.byMethod} />

      <StatusSplit byStatus={report.byStatus} busiestDay={busiestDay} />
    </Screen>
  );
}

/**
 * Histogramme du chiffre d'affaires sur 7 jours.
 *
 * Les barres poussent depuis la ligne de base (`.bar-grow`) avec un decalage
 * croissant, ce qui donne une lecture de gauche a droite. La hauteur est
 * relative au meilleur jour de la periode, et non au total : avec 7 barres,
 * une echelle absolue rendrait les journees creuses invisibles.
 */
function RevenueChart({ days }: { days: ReportDay[] }) {
  const peak = Math.max(...days.map((day) => day.revenue), 0);

  return (
    <section className="mt-6 px-5">
      <SectionTitle>Chiffre d&apos;affaires par jour</SectionTitle>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="chart-grid flex h-40 items-end justify-between gap-2 rounded-lg px-1">
          {days.map((day, index) => {
            const ratio = peak > 0 ? day.revenue / peak : 0;
            const isPeak = peak > 0 && day.revenue === peak;

            return (
              <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="text-[9px] font-bold tabular-nums text-slate-500">
                  {day.revenue > 0 ? formatAmount(day.revenue) : ""}
                </span>

                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className={`bar-grow w-full max-w-[26px] rounded-t-md ${
                      isPeak
                        ? "bg-gradient-to-t from-orange-600 to-orange-400"
                        : day.isToday
                          ? "bg-gradient-to-t from-slate-900 to-slate-700"
                          : "bg-slate-200"
                    }`}
                    style={{
                      height: `${Math.max(Math.round(ratio * 100), day.revenue > 0 ? 6 : 2)}%`,
                      ...barStyle(index),
                    }}
                    title={`${day.shortDate} : ${formatFCFA(day.revenue)}`}
                  />
                </div>

                <span
                  className={`text-[10px] font-semibold ${
                    day.isToday ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {day.label}
                </span>
                <span className="text-[9px] text-slate-300">{day.shortDate}</span>
              </div>
            );
          })}
        </div>

        {peak === 0 ? (
          <p className="mt-2 text-center text-xs text-slate-400">
            Aucun encaissement sur la période.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Classement des articles les plus traites sur la periode. */
function TopArticles({
  articles,
}: {
  articles: { name: string; quantity: number; revenue: number }[];
}) {
  return (
    <section className="mt-6 px-5">
      <SectionTitle>Articles les plus traités</SectionTitle>

      {articles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-slate-400">
          Aucun article traité sur la période.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {articles.map((article, index) => (
            <div
              key={article.name}
              className="stagger-item flex items-center gap-3 p-3"
              style={staggerStyle(index)}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  index === 0 ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                }`}
                aria-hidden
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{article.name}</p>
                <p className="text-xs text-slate-500">
                  {article.quantity} pièce{article.quantity > 1 ? "s" : ""}
                </p>
              </div>

              <p className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                {formatAmount(article.revenue)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


/** Meilleurs clients de la periode, cliquables vers leur fiche. */
function TopClients({
  clients,
}: {
  clients: { id: string; full_name: string; revenue: number; orders: number }[];
}) {
  return (
    <section className="mt-6 px-5">
      <SectionTitle>Meilleurs clients</SectionTitle>

      {clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-slate-400">
          Aucun client facturé sur la période.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {clients.map((client, index) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="stagger-item flex items-center gap-3 p-3"
              style={staggerStyle(index)}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  index === 0 ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                }`}
                aria-hidden
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{client.full_name}</p>
                <p className="text-xs text-slate-500">
                  {client.orders} commande{client.orders > 1 ? "s" : ""}
                </p>
              </div>

              <p className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                {formatAmount(client.revenue)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** Repartition des encaissements par moyen de paiement. */
function MethodSplit({
  byMethod,
}: {
  byMethod: { method: string; total: number; count: number }[];
}) {
  if (byMethod.length === 0) return null;

  const total = byMethod.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <section className="mt-6 px-5">
      <SectionTitle>Moyens de paiement</SectionTitle>

      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4">
        {byMethod.map((entry, index) => {
          const style = paymentMethodStyle(entry.method);
          const share = total > 0 ? Math.round((entry.total / total) * 100) : 0;

          return (
            <div key={entry.method} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${style.color}`}
                aria-hidden
              >
                {style.icon}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-slate-700">
                    {paymentMethodLabel(entry.method)}
                  </span>
                  <span className="shrink-0 text-xs font-black tabular-nums text-slate-900">
                    {formatFCFA(entry.total)}
                  </span>
                </div>

                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="bar-grow-x h-full rounded-full bg-slate-800"
                    style={{ width: `${Math.max(share, 2)}%`, ...barStyle(index, 60) }}
                  />
                </div>
              </div>

              <span className="w-9 shrink-0 text-right text-[11px] font-bold tabular-nums text-slate-400">
                {share}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Repartition des commandes par statut. */
function StatusSplit({
  byStatus,
  busiestDay,
}: {
  byStatus: { status: string; count: number }[];
  busiestDay: ReportDay;
}) {
  if (byStatus.length === 0) return null;

  return (
    <section className="mt-6 px-5">
      <SectionTitle>Statuts des commandes</SectionTitle>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {byStatus.map((entry, index) => (
            <span
              key={entry.status}
              className="stagger-item inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
              style={staggerStyle(index, 35)}
            >
              {ORDER_STATUS_LABELS[toOrderStatus(entry.status)]}
              <span className="rounded-full bg-white px-1.5 text-[11px] font-black text-slate-900">
                {entry.count}
              </span>
            </span>
          ))}
        </div>

        {busiestDay && busiestDay.orders > 0 ? (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Jour le plus chargé :{" "}
            <span className="font-semibold text-slate-700">
              {busiestDay.isToday ? "aujourd'hui" : busiestDay.shortDate}
            </span>{" "}
            avec {busiestDay.orders} commande{busiestDay.orders > 1 ? "s" : ""}.
          </p>
        ) : null}
      </div>
    </section>
  );
}

