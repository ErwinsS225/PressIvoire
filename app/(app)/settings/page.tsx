import { redirect } from "next/navigation";
import { Check } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getContext } from "@/lib/supabase/queries";
import {
  getEffectivePlan,
  getMonthlyOrderCountForPlan,
} from "@/lib/subscriptions";
import { PLANS } from "@/lib/plans";
import { roleLabel } from "@/lib/constants";
import { formatFCFA } from "@/lib/utils";

export const metadata = { title: "Paramètres" };

/** Ligne d'information : un libelle a gauche, la valeur a droite. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * Reglages : informations du pressing et etat de l'abonnement.
 *
 * Page en LECTURE SEULE. L'edition n'est pas implementee : on affiche donc
 * l'etat reel plutot que des champs qui enregistrerient une valeur en apparence
 * sans rien sauvegarder. Un formulaire qui "parait" fonctionner est pire qu'un
 * formulaire absent — le gerant croirait avoir change ses horaires.
 */
export default async function SettingsPage() {
  const { pressing, profile } = await getContext();

  if (!pressing) {
    redirect("/onboarding/pressing");
  }

  const context = await getEffectivePlan();
  const plan = context?.plan ?? PLANS.free;
  const limits = context?.limits ?? PLANS.free.limits;
  const isActive = context?.isActive ?? false;
  const storedPlanId = context?.storedPlanId ?? "free";

  const used = await getMonthlyOrderCountForPlan(pressing.id);
  const usage = { used, limit: limits.ordersPerMonth };
  // « Presque atteint » : on previent a 80 % du quota, pour que le gerant
  // soituguese avant de se faire bloquer en plein enregistrement.
  const nearQuota =
    limits.ordersPerMonth !== null && usage.used >= limits.ordersPerMonth * 0.8;

  return (
    <div className="flex flex-col gap-8">
      <Header
        title="Paramètres"
        subtitle={`${pressing.name} — ${pressing.commune}`}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Le pressing */}
        <Card>
          <CardHeader>
            <CardTitle>Le pressing</CardTitle>
            <CardDescription>
              Informations declarees lors de votre inscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InfoRow label="Nom" value={pressing.name} />
            <InfoRow label="Commune" value={pressing.commune} />
            <InfoRow label="Adresse" value={pressing.address ?? "—"} />
            <InfoRow label="Téléphone" value={pressing.phone ?? "—"} />
            <InfoRow
              label="Livraison à domicile"
              value={
                pressing.delivery_enabled
                  ? `Oui — ${formatFCFA(pressing.delivery_fee)}`
                  : "Non"
              }
            />
            <InfoRow
              label="Collecte"
              value={pressing.pickup_enabled ? "Oui" : "Non"}
            />
          </CardContent>
        </Card>

        {/* Abonnement + session */}
        <div className="grid gap-6">
          {/*
            `id="abonnement"` : ancre visée par le bouton « Upgrade Now » de
            la barre latérale. Sans elle, le lien arrive en haut de page et
            l'utilisateur ne voit pas la section qu'on lui promet.

            `scroll-mt-6` évite que le titre ne passe sous un éventuel
            en-tête collé.
          */}
          <Card id="abonnement" className="scroll-mt-6">
            <CardHeader>
              <CardTitle>Abonnement</CardTitle>
              <CardDescription>
                Plan actif de votre espace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg bg-slate-900 p-5 text-white">
                <div>
                  <p className="text-xs font-medium text-slate-400">Plan actuel</p>
                  <p className="mt-1 text-2xl font-bold">{plan.name}</p>
                </div>
                <Badge variant={isActive ? "success" : "destructive"}>
                  {isActive ? "Actif" : "Expiré"}
                </Badge>
              </div>

              {limits.ordersPerMonth !== null ? (
                <div className="mt-4 grid gap-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">
                      Commandes ce mois-ci
                    </span>
                    <span className="font-medium tabular-nums">
                      {usage.used} / {limits.ordersPerMonth}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        nearQuota
                          ? "h-full rounded-full bg-orange-500"
                          : "h-full rounded-full bg-brand-700"
                      }
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((usage.used / limits.ordersPerMonth) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                  {nearQuota ? (
                    <p className="text-xs text-orange-700">
                      Quota presque atteint. Le plan Pro supprime cette limite.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Commandes illimitées.
                </p>
              )}

              <ul className="mt-4 grid gap-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              {!isActive ? (
                <p className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                  Votre abonnement a expiré. Les capacités du plan{" "}
                  {PLANS[storedPlanId].name} sont suspendues — renouvelez pour
                  les retrouver.
                </p>
              ) : null}
              <p className="mt-3 text-sm text-muted-foreground">
                {pressing.subscription_expires_at
                  ? `Renouvellement le ${new Date(
                      pressing.subscription_expires_at,
                    ).toLocaleDateString("fr-FR")}`
                  : "Aucun renouvellement programmé."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
              <CardDescription>
                Le compte actuellement connecté.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InfoRow label="Compte" value={profile?.full_name ?? "—"} />
              <InfoRow
                label="Rôle"
                value={roleLabel(profile?.role)}
              />
              <InfoRow label="Pressing" value={pressing.name} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}