import { cn } from "@/lib/utils";

/**
 * Indicateur d'etape d'un parcours.
 *
 * `current` est l'index (base 0) de l'etape affichee. Une etape anterieure
 * est consideree faite, une posterieure reste a venir.
 * `steps` est accepte en lecture seule : les appelants le declarent souvent
 * en `as const`, ce qui produit un tuple non modifiable.
 */
export function ProgressSteps({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Progression">
      {steps.map((label, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                isDone && "bg-green-500 text-white",
                isCurrent && "bg-orange-500 text-white",
                !isDone && !isCurrent && "bg-slate-200 text-slate-500",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium",
                isCurrent ? "text-slate-900" : "text-slate-500",
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <span className="h-px flex-1 bg-slate-200" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}