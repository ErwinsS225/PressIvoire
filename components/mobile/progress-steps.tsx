import { cn } from "@/lib/utils";

/**
 * Indicateur d'avancement d'un parcours en 3 etapes.
 * La barre se remplit progressivement ; les libelles des etapes franchies
 * passent en orange.
 */
export function ProgressSteps({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  /** Index de l'etape courante, base 0. */
  current: number;
  className?: string;
}) {
  const ratio = (current + 1) / steps.length;

  return (
    <div className={cn("px-5", className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-700 ease-out"
          style={{ width: `${ratio * 100}%` }}
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Etape ${current + 1} sur ${steps.length}`}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-semibold">
        {steps.map((label, index) => (
          <span
            key={label}
            className={cn(index <= current ? "text-orange-500" : "text-slate-400")}
          >
            {index + 1}. {label}
          </span>
        ))}
      </div>
    </div>
  );
}
