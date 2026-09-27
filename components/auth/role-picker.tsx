"use client";

import { cn } from "@/lib/utils";
import { ROLE_LABELS, type SignupRole } from "@/lib/validation/auth";

/**
 * Selecteur du type de compte (deux grandes cartes, comme dans la maquette).
 *
 * Le contrat (flo.md) demande ce choix des le premier ecran d'inscription :
 * il conditionne la suite du parcours (onboarding gerant ou client).
 */
const ROLES: {
  value: SignupRole;
  icon: string;
  description: string;
}[] = [
  {
    value: "owner",
    icon: "🏪",
    description: "Gérez votre pressing : commandes, caisse, livraisons.",
  },
  {
    value: "client",
    icon: "🧺",
    description: "Confiez votre linge et suivez vos commandes.",
  },
];

export function RolePicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: SignupRole) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium leading-none">Type de compte</legend>

      <div className="grid gap-2" role="radiogroup" aria-label="Type de compte">
        {ROLES.map((role) => {
          const selected = value === role.value;
          return (
            <button
              key={role.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(role.value)}
              className={cn(
                "btn-press flex items-start gap-3 rounded-xl border p-3 text-left transition",
                selected
                  ? "border-2 border-flag-500 bg-flag-50"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <span className="text-xl" aria-hidden>
                {role.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  {ROLE_LABELS[role.value]}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {role.description}
                </span>
              </span>
              {selected ? (
                <span className="text-sm text-flag-500" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </fieldset>
  );
}
