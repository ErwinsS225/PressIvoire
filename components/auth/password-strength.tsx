"use client";

import { cn } from "@/lib/utils";

/**
 * Jauge de robustesse du mot de passe.
 *
 * Elle ne remplace pas la validation : elle explique en direct ce qu'il manque,
 * ce qui vaut mieux qu'un refus a la soumission. Les criteres sont volontairement
 * alignes sur le schema Zod de `lib/validation/auth.ts` — si l'un des deux
 * change, l'autre doit suivre.
 *
 * On n'affiche ni score chiffre ni « faible / fort » abstrait : un gérant de
 * pressing n'a pas besoin d'un indice de robustesse, il a besoin de savoir quel
 * motif ne passe pas. D'où des critères explicites, cochés au fur et à mesure.
 */
export function PasswordStrength({ password }: { password: string }) {
  const criteria = [
    { label: "8 caractères minimum", met: password.length >= 8 },
    { label: "Une minuscule", met: /[a-z]/.test(password) },
    { label: "Une majuscule", met: /[A-Z]/.test(password) },
    { label: "Un chiffre", met: /\d/.test(password) },
  ];

  const met = criteria.filter((criterion) => criterion.met).length;
  const total = criteria.length;
  const percent = (met / total) * 100;

  // Un mot de passe non saisi ne montre rien : une jauge a zero au chargement
  // ferait croire a un mot de passe rejete.
  if (!password) return null;

  const barColor =
    met === total
      ? "bg-emerald-500"
      : met >= total - 1
        ? "bg-flag-500"
        : "bg-red-400";

  return (
    <div className="space-y-2 pt-1">
      {/* Barre de progression. `role="progressbar"` + valeurs ARIA : la couleur
          seule ne transmet rien a un lecteur d'ecran. */}
      <div
        role="progressbar"
        aria-valuenow={met}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Robustesse du mot de passe : ${met} critère sur ${total}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {criteria.map((criterion) => (
          <li
            key={criterion.label}
            className={cn(
              "flex items-center gap-1.5 text-[11px] transition-colors",
              criterion.met ? "text-emerald-600" : "text-slate-400",
            )}
          >
            <span aria-hidden className="w-3 text-center font-bold">
              {criterion.met ? "✓" : "·"}
            </span>
            {criterion.label}
          </li>
        ))}
      </ul>
    </div>
  );
}