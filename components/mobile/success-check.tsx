import { cn } from "@/lib/utils";

/**
 * Check de confirmation, dessine par l'animation `checkmark`.
 *
 * Le trait est un `<path>` avec `stroke-dasharray` complet : l'animation fait
 * reculer `stroke-dashoffset` de 100 a 0, ce qui donne l'impression que le
 * trait se trace a la main. C'est l'animation de l'ecran de succes de la
 * maquette — elle etait declaree en keyframe mais jamais enregistree dans
 * `theme.extend.animation`, donc inutilisable jusqu'ici.
 *
 * Le disque et le halo derriere apparaissent en `pop-in` puis respirent
 * doucement (`pulse-soft`) pour attirer l'oeil sans distraire.
 */
export function SuccessCheck({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = {
    sm: { disc: "h-14 w-14", svg: "h-8 w-8" },
    md: { disc: "h-20 w-20", svg: "h-11 w-11" },
    lg: { disc: "h-28 w-28", svg: "h-16 w-16" },
  }[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Halo : onde verte qui se propage puis disparait. */}
      <span className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" aria-hidden />

      <div
        className={cn(
          "relative flex items-center justify-center rounded-full bg-green-100 text-green-600 animate-pop-in",
          dimensions.disc,
        )}
      >
        <svg
          viewBox="0 0 52 52"
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("animate-checkmark", dimensions.svg)}
          role="img"
          aria-label="Confirme"
        >
          <path className="check-path" d="M14 27.5l7.5 7.5L38 17" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Ecran de succes complet : check anime, titre, recap et action.
 * Utilise apres la creation d'une commande ou la validation d'un encaissement.
 */
export function SuccessPanel({
  title,
  message,
  children,
  action,
}: {
  title: string;
  message?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex animate-slide-up flex-col items-center px-6 py-8 text-center">
      <SuccessCheck size="lg" />

      <h2 className="mt-5 text-xl font-black text-slate-900">{title}</h2>
      {message ? <p className="mt-1 text-sm text-slate-500">{message}</p> : null}

      {children ? (
        <div className="mt-5 w-full animate-slide-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
          {children}
        </div>
      ) : null}

      {action ? <div className="mt-6 w-full">{action}</div> : null}
    </div>
  );
}
