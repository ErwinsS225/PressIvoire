"use client";

import Link from "next/link";

/**
 * Coquille commune aux trois etapes : barre de progression, titre, contenu.
 *
 * La progression est cliquable vers les etapes DEJA VALIDEES uniquement —
 * on ne peut pas sauter l'etape 2 pour acceder a l'etape 3.
 */
const STEPS = [
  { n: 1, label: "Identité" },
  { n: 2, label: "Services & tarifs" },
  { n: 3, label: "Votre offre" },
] as const;

export function StepWizard({
  step,
  title,
  subtitle,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Progression */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Progression">
        {STEPS.map((item, index) => {
          const done = item.n < step;
          const active = item.n === step;
          return (
            <li key={item.n} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                {done ? (
                  <Link
                    href={`/onboarding/pressing/step-${item.n}`}
                    aria-label={`Revenir à l'étape ${item.n}`}
                    className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-button text-xs font-bold text-white"
                  >
                    ✓
                  </Link>
                ) : (
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                    aria-current={active ? "step" : undefined}
                  >
                    {item.n}
                  </span>
                )}
                <span
                  className={`text-[10px] font-semibold ${
                    active ? "text-orange-500" : done ? "text-brand-700" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <span
                  className={`mb-4 h-0.5 flex-1 rounded ${
                    done ? "bg-brand-700" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}

      <div className="mt-5">{children}</div>
    </div>
  );
}
