import Link from "next/link";
import { Avatar } from "@/components/mobile/avatar";
import { StatusBadge } from "@/components/mobile/status-badge";
import { formatAmount, formatRelativeDate } from "@/lib/utils";
import type { OrderWithClient } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

/**
 * Carte d'une commande. Deux variantes :
 *   - "compact"  : ligne du bloc "A livrer aujourd'hui" (avatar + montant)
 *   - "detailed" : carte de la liste complete (numero, statut, client, montant)
 */
export function OrderCard({
  order,
  variant = "detailed",
  className,
  style,
}: {
  order: OrderWithClient;
  variant?: "compact" | "detailed";
  className?: string;
  /** Decalage d'apparition en cascade (cf. `staggerStyle()`). */
  style?: React.CSSProperties;
}) {
  const name = order.client?.full_name ?? "Client supprime";
  const href = `/commandes/${order.id}`;

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={cn(
          "card-hover flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3",
          className,
        )}
        style={style}
      >
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">
            {order.order_number} &bull; {order.items_count} article
            {order.items_count > 1 ? "s" : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900">{formatAmount(order.total)}</p>
          <p className="text-[10px] text-slate-400">FCFA</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "card-hover block rounded-xl border border-slate-100 bg-white p-3",
        className,
      )}
      style={style}
    >
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400">{order.order_number}</p>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">
            {order.items_count} article{order.items_count > 1 ? "s" : ""} &bull;{" "}
            {formatRelativeDate(order.created_at)}
          </p>
        </div>
        <p className="shrink-0 text-base font-black text-slate-900">
          {formatAmount(order.total)}
        </p>
      </div>
    </Link>
  );
}

/** Etat vide : icône, message, action. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
