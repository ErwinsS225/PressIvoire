"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { advanceOrderStatus, recordPayment } from "@/app/actions/orders";
import { ORDER_STATUS_LABELS, PAYMENT_METHODS, paymentMethodLabel, type OrderStatus } from "@/lib/constants";
import { MethodPicker } from "@/components/mobile/method-picker";

/**
 * Actions du detail de commande : encaissement et avancement du workflow.
 *
 * Le moyen de paiement est choisi par le caissier (voir `MethodPicker`) : il
 * n'est plus fige sur Wave. L'interface desactive les boutons pendant l'appel
 * pour eviter un double-clic qui creerait deux encaissements — la fonction
 * Postgres `record_payment` plafonne de toute facon au reste du.
 */
export function OrderActions({
  orderId,
  pressingId,
  status,
  total,
  amountPaid,
  currency,
}: {
  orderId: string;
  pressingId: string;
  status: string;
  total: number;
  amountPaid: number;
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showPartial, setShowPartial] = useState(false);
  const [partial, setPartial] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS.CASH);

  const remaining = Math.max(total - amountPaid, 0);
  const settled = remaining === 0;

  const run = (label: string, action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(label);
        setShowPartial(false);
        setPartial("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action impossible.");
      }
    });
  };

  const handleAdvance = () =>
    run("Statut mis a jour", async () => {
      await advanceOrderStatus(orderId, pressingId);
    });

  const handlePayment = (amount: number) =>
    run(`Encaissement de ${amount} ${currency} (${paymentMethodLabel(method)}) enregistré`, async () => {
      await recordPayment(orderId, pressingId, amount, method);
    });

  return (
    <div className="space-y-2">
      {settled ? (
        <div className="animate-pop-in flex items-center justify-center gap-2 rounded-xl bg-green-50 py-4 text-sm font-bold text-green-700">
          <span aria-hidden>✅</span> Commande entièrement payée
        </div>
      ) : (
        <>
          <MethodPicker value={method} onChange={setMethod} disabled={isPending} />

          <button
            type="button"
            disabled={isPending}
            onClick={() => handlePayment(remaining)}
            className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            <span aria-hidden>💳</span> Encaisser {remaining} {currency}
          </button>

          {showPartial ? (
            <form
              className="flex animate-scale-in gap-2 rounded-xl border border-slate-200 bg-white p-2"
              onSubmit={(event) => {
                event.preventDefault();
                const value = Number.parseInt(partial, 10);
                if (Number.isFinite(value) && value > 0) handlePayment(value);
                else toast.error("Montant invalide.");
              }}
            >
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={remaining}
                value={partial}
                onChange={(event) => setPartial(event.target.value)}
                placeholder={`Max ${remaining}`}
                aria-label="Montant encaissé"
                className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={isPending}
                className="btn-press rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Encaisser
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowPartial(true)}
              className="btn-press w-full rounded-xl border border-slate-200 bg-white py-3.5 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Encaisser un montant partiel
            </button>
          )}
        </>
      )}

      <button
        type="button"
        disabled={isPending || settled}
        onClick={handleAdvance}
        className="btn-press w-full rounded-xl border border-slate-200 bg-white py-4 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Marquer « {nextLabel(status)} »
      </button>
    </div>
  );
}

/** Libelle de l'etat suivant, pour l'intitule du bouton d'avancement. */
function nextLabel(status: string): string {
  const flow: string[] = [
    "pending",
    "pickup_scheduled",
    "picked_up",
    "in_processing",
    "ready",
    "out_for_delivery",
    "delivered",
  ];
  const index = flow.indexOf(status);
  if (index === -1 || index === flow.length - 1) return "Terminée";
  return ORDER_STATUS_LABELS[flow[index + 1] as OrderStatus];
}
