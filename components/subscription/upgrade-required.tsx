import { Check, X } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLANS, type PlanId } from "@/lib/plans";
import { formatFCFA } from "@/lib/utils";

/**
 * Écran « Fonctionnalité réservée » affiché à la place d'un écran Pro.
 *
 * Le but n'est pas de refuser poliment : il faut que le gérant comprenne ce
 * qu'il perd, ce qu'il gagne, et à quel prix. Une page bloquée qui ne dit
 * rien est un ticket de support.
 *
 * Le contrôle réel est fait côté serveur (Server Actions, lib/plans.ts) —
 * cet écran ne fait que rendre la décision lisible.
 */
export function UpgradeRequired({
  feature,
  currentPlanId,
  requiredPlanId = "pro",
}: {
  /** Ex. « les tournées de livraison ». */
  feature: string;
  currentPlanId: PlanId;
  requiredPlanId?: PlanId;
}) {
  const required = PLANS[requiredPlanId];

  // On montre ce que le plan gratuit n'a PAS, pour rendre l'écart concret.
  const missing = required.features.filter(
    (_, index) => !PLANS.free.features[index],
  );

  return (
    <div className="flex flex-col gap-8">
      <Card className="mx-auto max-w-2xl border-brand-200">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {feature.charAt(0).toUpperCase() + feature.slice(1)} est réservé au
            plan {required.name}
          </CardTitle>
          <CardDescription>
            Votre pressing est en plan {PLANS[currentPlanId].name}. Passez au
            plan {required.name} pour débloquer cette fonctionnalité et
            l&apos;ensemble des outils de gestion.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <ul className="grid gap-2">
            {missing.map((label) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                {label}
              </li>
            ))}
          </ul>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Plan {required.name}</p>
            <p className="mt-1 text-3xl font-bold">
              {required.price === 0
                ? "Sur devis"
                : `${formatFCFA(required.price)} / mois`}
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Le paiement de l&apos;abonnement n&apos;est pas encore en ligne :
            contactez le support pour activer le plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Ligne « X disponible / non disponible » pour comparer deux plans. */
export function FeatureRow({
  label,
  included,
}: {
  label: string;
  included: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm">{label}</span>
      {included ? (
        <Check className="h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </li>
  );
}
