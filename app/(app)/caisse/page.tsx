import Link from "next/link";
import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { StatCard, SummaryRow } from "@/components/mobile/stat-card";
import { QuickCollect } from "@/components/mobile/quick-collect";
import { Avatar } from "@/components/mobile/avatar";
import { EmptyState } from "@/components/mobile/order-card";
import {
  getCashRegister,
  getContext,
  type CashPayment,
  type CashRegister,
} from "@/lib/supabase/queries";
import { paymentMethodLabel, paymentMethodStyle } from "@/lib/constants";
import { barStyle, formatAmount, formatFCFA, formatRelativeDate, staggerStyle } from "@/lib/utils";

export const metadata = { title: "Caisse" };

/**
 * Caisse du jour.
 *
 * L'ecran s'appuie sur la table `payments` — le JOURNAL des encaissements,
 * alimente depuis la migration 004. Auparavant `recordPayment()` ne mettait a
 * jour que `orders.amount_paid` : la ventilation par moyen de paiement etait
 * alors impossible, `orders.payment_method` etant ecrase a chaque
 * encaissement (un reglement 500 F especes puis 500 F Wave apparaissait
 * integralement en Wave).
 */
export default async function CashRegisterPage() {
  const { pressing } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Caisse" />
      </Screen>
    );
  }

  const register = await getCashRegister(pressing.id);
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Screen>
      <ScreenHeader title="Caisse" subtitle={today} />

      <div className="grid grid-cols-2 gap-3 px-5">
        <StatCard
          index={0}
          variant="solid"
          label="Encaissé aujourd'hui"
          value={formatAmount(register.collectedToday)}
          unit="FCFA"
          hint={
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {register.paymentsCount} encaissement{register.paymentsCount > 1 ? "s" : ""}
            </span>
          }
        />
        <StatCard
          index={1}
          icon="⏳"
          iconClass={register.outstanding.total > 0 ? "bg-amber-50" : "bg-slate-100"}
          value={formatAmount(register.outstanding.total)}
          unit="FCFA"
          label="Reste à recouvrer"
          accent={register.outstanding.total > 0 ? "text-amber-700" : undefined}
          hint={`${register.outstanding.count} commande${register.outstanding.count > 1 ? "s" : ""}`}
        />
      </div>

      <MethodBreakdown byMethod={register.byMethod} collected={register.collectedToday} />

      <OutstandingList register={register} pressingId={pressing.id} />

      <RecentPayments payments={register.recent} />
    </Screen>
  );
}

/**
 * Ventilation par moyen de paiement.
 *
 * Les barres sont proportionnelles au plus gros encaissement de la journee
 * (et non au total) : sinon un pressing qui encaisse surtout en especes
 * n'afficherait que des barres minuscules pour les autres moyens, ce qui rend
 * la comparaison illisible.
 */
function MethodBreakdown({
  byMethod,
  collected,
}: {
  byMethod: CashRegister["byMethod"];
  collected: number;
}) {
  const peak = byMethod[0]?.total ?? 0;

  return (
    <section className="mt-6 px-5">
      <SectionTitle>Ventilation par moyen de paiement</SectionTitle>

      {byMethod.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-slate-400">
          Aucun encaissement enregistré aujourd&apos;hui.
        </p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
          {byMethod.map((entry, index) => {
            const style = paymentMethodStyle(entry.method);
            const ratio = peak > 0 ? entry.total / peak : 0;

            return (
              <div key={entry.method}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span aria-hidden>{style.icon}</span>
                    {paymentMethodLabel(entry.method)}
                    <span className="font-normal text-slate-400">({entry.count})</span>
                  </span>
                  <span className="text-xs font-black tabular-nums text-slate-900">
                    {formatFCFA(entry.total)}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="bar-grow-x h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                    style={{
                      width: `${Math.max(Math.round(ratio * 100), 4)}%`,
                      ...barStyle(index),
                    }}
                  />
                </div>
              </div>
            );
          })}

          <div className="border-t border-slate-100 pt-1">
            <SummaryRow label="Total encaissé" value={formatFCFA(collected)} strong />
          </div>
        </div>
      )}
    </section>
  );
}


/**
 * Commandes dont le solde reste du, avec encaissement direct.
 *
 * Le caissier est debout, la file attend : il ne doit pas avoir a ouvrir la
 * fiche de la commande pour encaisser un solde. `QuickCollect` deplie le choix
 * du moyen de paiement puis encaisse en un second appui.
 */
function OutstandingList({
  register,
  pressingId,
}: {
  register: CashRegister;
  pressingId: string;
}) {
  return (
    <section className="mt-6 px-5">
      <SectionTitle
        action={
          <Link href="/commandes" className="text-xs font-semibold text-orange-500">
            Commandes &rarr;
          </Link>
        }
      >
        À recouvrer ({register.outstanding.count})
      </SectionTitle>

      {register.outstanding.orders.length === 0 ? (
        <EmptyState
          icon="✨"
          title="Tout est encaissé"
          hint="Aucune commande en attente de paiement."
        />
      ) : (
        <div className="space-y-2">
          {register.outstanding.orders.map((order, index) => {
            const remaining = Math.max(order.total - (order.amount_paid ?? 0), 0);
            const name = order.client?.full_name ?? "Client supprimé";

            return (
              <div
                key={order.id}
                className="stagger-item flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
                style={staggerStyle(index)}
              >
                <Link
                  href={`/commandes/${order.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {order.order_number} · reste {formatFCFA(remaining)}
                    </p>
                  </div>
                </Link>

                <QuickCollect
                  orderId={order.id}
                  pressingId={pressingId}
                  remaining={remaining}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Journal des encaissements du jour, du plus recent au plus ancien. */
function RecentPayments({ payments }: { payments: CashPayment[] }) {
  return (
    <section className="mt-6 px-5">
      <SectionTitle>Derniers encaissements</SectionTitle>

      {payments.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Aucun encaissement aujourd'hui"
          hint="Les paiements enregistrés apparaîtront ici, avec leur mode."
        />
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {payments.map((payment, index) => {
            const style = paymentMethodStyle(payment.method);

            return (
              <div
                key={payment.id}
                className="stagger-item flex items-center gap-3 p-3"
                style={staggerStyle(index)}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${style.color}`}
                  aria-hidden
                >
                  {style.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {payment.client_name ?? paymentMethodLabel(payment.method)}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {payment.order_number ?? "Hors commande"}
                    {" · "}
                    {payment.paid_at ? formatRelativeDate(payment.paid_at) : "—"}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-bold tabular-nums text-green-700">
                  +{formatAmount(payment.amount)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

