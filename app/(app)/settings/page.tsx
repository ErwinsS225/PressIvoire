import { redirect } from "next/navigation";

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
import { roleLabel } from "@/lib/constants";
import { formatFCFA } from "@/lib/utils";

export const metadata = { title: "Paramètres" };

/** Libelles des plans, alignes sur le CHECK de `pressings`. */
const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

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

  const plan = PLAN_LABELS[pressing.subscription_plan] ?? pressing.subscription_plan;

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
          <Card>
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
                  <p className="mt-1 text-2xl font-bold">{plan}</p>
                </div>
                <Badge variant="success">Actif</Badge>
              </div>
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