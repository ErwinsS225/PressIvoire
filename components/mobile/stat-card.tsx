import Link from "next/link";
import { cn, formatAmount, staggerStyle } from "@/lib/utils";

/**
 * Carte chiffree du tableau de bord, de la caisse et des rapports.
 *
 * Extraite du tableau de bord pour etre reutilisee : les nouveaux ecrans
 * affichent les memes indicateurs, et deux implementations divergeraient vite.
 *
 * Trois variantes :
 *   - "solid"  : carte foncee pleine largeur, pour le chiffre principal (CA)
 *   - "icon"   : carte claire avec pastille d'icone (compteurs)
 *   - "plain"  : carte claire sans icone, pour les couples libelle/valeur
 */
export function StatCard({
  variant = "icon",
  icon,
  iconClass,
  label,
  value,
  unit,
  hint,
  trend,
  accent,
  href,
  index = 0,
  className,
}: {
  variant?: "solid" | "icon" | "plain";
  icon?: string;
  iconClass?: string;
  label: string;
  value: string | number;
  /** Unite affichee en plus petit a cote de la valeur ("FCFA"). */
  unit?: string;
  hint?: React.ReactNode;
  /** Variation en %, affichee en pastille verte ou rouge. */
  trend?: number | null;
  /** Classe de couleur du chiffre ("text-orange-600", "text-green-600"). */
  accent?: string;
  href?: string;
  /** Position dans la liste, pour decaler l'apparition en cascade. */
  index?: number;
  className?: string;
}) {
  const body =
    variant === "solid" ? (
      <>
        {/* Halo decoratif : il donne de la profondeur sans image. */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-300">{label}</p>
            {typeof trend === "number" ? <TrendPill trend={trend} /> : null}
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight">
            {typeof value === "number" ? formatAmount(value) : value}
            {unit ? <span className="text-lg font-bold text-slate-400"> {unit}</span> : null}
          </p>
          {hint ? <div className="mt-3 text-xs text-slate-400">{hint}</div> : null}
        </div>
      </>
    ) : (
      <>
        {icon ? (
          <div
            className={cn(
              "mb-3 flex h-10 w-10 items-center justify-center rounded-full text-lg",
              iconClass ?? "bg-slate-100",
            )}
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
        <p className={cn("text-2xl font-black text-slate-900", accent)}>
          {typeof value === "number" ? formatAmount(value) : value}
          {unit ? <span className="ml-1 text-xs font-bold text-slate-400">{unit}</span> : null}
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
      </>
    );

  const classes = cn(
    "stagger-item card-hover relative overflow-hidden rounded-2xl p-4",
    variant === "solid"
      ? "col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white"
      : "border border-slate-100 bg-white",
    href && "block",
    className,
  );

  const style = staggerStyle(index);

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {body}
      </Link>
    );
  }

  return (
    <div className={classes} style={style}>
      {body}
    </div>
  );
}

/** Pastille de variation : verte si positive, rouge si negative. */
export function TrendPill({ trend, className }: { trend: number; className?: string }) {
  const up = trend >= 0;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400",
        className,
      )}
    >
      {up ? "+" : ""}
      {trend}%
    </span>
  );
}

/** Petite ligne "libelle / valeur" pour les blocs de total. */
export function SummaryRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className={cn("text-xs", strong ? "font-bold text-slate-700" : "text-slate-500")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "text-base font-black text-slate-900" : "text-sm font-semibold text-slate-700",
          accent,
        )}
      >
        {value}
      </span>
    </div>
  );
}
