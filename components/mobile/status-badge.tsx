import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  toOrderStatus,
  type OrderStatus,
} from "@/lib/constants";

/**
 * Palette des statuts de commande.
 * Le vert reste reserve aux commandes pretes a livrer, l'orange aux actions.
 */
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  pickup_scheduled: "bg-slate-100 text-slate-600",
  picked_up: "bg-indigo-100 text-indigo-700",
  in_processing: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  out_for_delivery: "bg-violet-100 text-violet-700",
  delivered: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-100 text-red-700",
  disputed: "bg-amber-100 text-amber-800",
};

/** Pastille de statut en haut de carte (variante compacte de la maquette). */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const safe: OrderStatus = toOrderStatus(status);

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        STATUS_STYLES[safe],
        className,
      )}
    >
      {ORDER_STATUS_LABELS[safe]}
    </span>
  );
}

/** Badge de paiement : encaisse, partiel, ou en attente. */
export function PaymentBadge({
  paymentStatus,
  amountPaid,
  total,
  className,
}: {
  paymentStatus: string;
  amountPaid: number;
  total: number;
  className?: string;
}) {
  const settled = paymentStatus === "paid" || (paymentStatus === "partial" && amountPaid > 0);

  if (settled) {
    return (
      <span
        className={cn(
          "rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700",
          className,
        )}
      >
        Payée
      </span>
    );
  }

  if (paymentStatus === "partial") {
    return (
      <span
        className={cn(
          "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800",
          className,
        )}
      >
        Partiel
      </span>
    );
  }

  return (
    <span
      className={cn(
        "rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800",
        className,
      )}
    >
      En attente
    </span>
  );
}
