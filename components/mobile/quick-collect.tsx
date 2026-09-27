"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { recordPayment } from "@/app/actions/orders";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/constants";
import { MethodPicker } from "@/components/mobile/method-picker";
import { formatAmount } from "@/lib/utils";

/**
 * Encaissement rapide depuis l'ecran Caisse.
 *
 * Le caissier est debout, la file attend : il ne doit pas avoir a ouvrir la
 * fiche de la commande pour encaisser un solde. Un appui deplie le choix du
 * moyen de paiement, un second encaisse.
 *
 * L'ecriture passe par la meme Server Action que la fiche de commande
 * (`recordPayment`), donc par la meme fonction Postgres transactionnelle : il
 * n'y a qu'un seul chemin d'ecriture du chiffre d'affaires dans l'application.
 */
export function QuickCollect({
  orderId,
  pressingId,
  remaining,
  currency = "FCFA",
}: {
  orderId: string;
  pressingId: string;
  /** Solde restant du, en FCFA. */
  remaining: number;
  currency?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS.CASH);

  const handleCollect = () => {
    startTransition(async () => {
      try {
        await recordPayment(orderId, pressingId, remaining, method);
        toast.success(
          `${formatAmount(remaining)} ${currency} encaissés (${paymentMethodLabel(method)}).`,
        );
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Encaissement impossible.");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-press shrink-0 rounded-full bg-orange-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
      >
        Encaisser
      </button>
    );
  }

  return (
    <div className="animate-scale-in mt-2 w-full space-y-2 rounded-xl border border-slate-200 bg-white p-2">
      <MethodPicker value={method} onChange={setMethod} disabled={isPending} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCollect}
          disabled={isPending}
          className="btn-press flex-1 rounded-lg bg-orange-500 py-2.5 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {isPending
            ? "Encaissement..."
            : `Confirmer ${formatAmount(remaining)} ${currency}`}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="btn-press rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
