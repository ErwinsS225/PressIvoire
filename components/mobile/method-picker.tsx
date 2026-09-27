"use client";

import { CASHIER_METHODS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Choix du moyen de paiement, en puces.
 *
 * L'encaissement etait auparavant fige sur Wave (`handlePayment(remaining, "wave")`
 * dans order-actions.tsx) : un caissier qui encaissait des especes voyait
 * malgre tout l'encaissement attribue a Wave, et la caisse ne pouvait plus
 * ventiler correctement. Le moyen de paiement est desormais un choix explicite
 * du caissier, et il est journalise dans `payments.method`.
 *
 * Les moyens proposes (especes, Wave, Orange, MTN, Moov) sont ceux du marche
 * ivoirien, dans l'ordre d'usage constate.
 */
export function MethodPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (method: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide", className)}>
      {CASHIER_METHODS.map((method) => {
        const selected = method.value === value;
        return (
          <button
            key={method.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(method.value)}
            aria-pressed={selected}
            className={cn(
              "btn-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:opacity-50",
              selected
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            <span aria-hidden>{method.icon}</span>
            {method.label}
          </button>
        );
      })}
    </div>
  );
}
