import { cn } from "@/lib/utils";

/**
 * Coque commune des etapes de l'onboarding desktop.
 *
 * Elle porte la progression (Identite -> Services -> Abonnement) et le titre
 * de l'etape, pour que `step-2-services` et `step-3-plan` n'aient a fournir
 * que leur formulaire. L'avancement est derive de l'etape courante : pas
 * d'etat a synchroniser entre les ecritures et l'affichage.
 */
export function OnboardingWizard({
  step,
  title,
  subtitle,
  children,
}: {
  step: "identity" | "services" | "plan";
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const steps: { key: "identity" | "services" | "plan"; label: string }[] = [
    { key: "identity", label: "Identité" },
    { key: "services", label: "Services" },
    { key: "plan", label: "Abonnement" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex items-center gap-2" aria-label="Progression">
        {steps.map((s, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
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
                  "text-sm font-medium",
                  isCurrent ? "text-slate-900" : "text-slate-500",
                )}
              >
                {s.label}
              </span>
              {index < steps.length - 1 && (
                <span className="h-px flex-1 bg-slate-200" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      <div>{children}</div>
    </div>
  );
}
