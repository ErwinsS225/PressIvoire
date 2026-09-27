import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { getContext } from "@/lib/supabase/queries";
import { formatFCFA } from "@/lib/utils";

export const metadata = { title: "Réglages" };

/**
 * Reglages : informations du pressing et etat de l'abonnement.
 * Les edition passent par l'etape suivante du contrat (onboarding gerant) ;
 * on affiche ici l'etat reel plutot que des champs non fonctionnels.
 */
export default async function SettingsPage() {
  const { pressing, profile } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Réglages" />
      </Screen>
    );
  }

  const PLAN_LABELS: Record<string, string> = {
    free: "Gratuit",
    pro: "Pro",
    business: "Business",
    enterprise: "Enterprise",
  };

  return (
    <Screen>
      <ScreenHeader title="Réglages" subtitle={pressing.name} />

      <div className="space-y-5 px-5">
        <section>
          <SectionTitle>Le pressing</SectionTitle>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
            <InfoRow label="Nom" value={pressing.name} />
            <InfoRow label="Commune" value={pressing.commune} />
            <InfoRow label="Adresse" value={pressing.address ?? "—"} />
            <InfoRow label="Téléphone" value={pressing.phone ?? "—"} />
            <InfoRow
              label="Livraison"
              value={
                pressing.delivery_enabled
                  ? `Oui — ${formatFCFA(pressing.delivery_fee)}`
                  : "Non"
              }
            />
            <InfoRow label="Collecte" value={pressing.pickup_enabled ? "Oui" : "Non"} />
          </div>
        </section>

        <section>
          <SectionTitle>Abonnement</SectionTitle>
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
            <p className="text-xs font-medium text-slate-300">Plan actuel</p>
            <p className="mt-1 text-2xl font-black">
              {PLAN_LABELS[pressing.subscription_plan] ?? pressing.subscription_plan}
            </p>
            {pressing.subscription_expires_at ? (
              <p className="mt-2 text-xs text-slate-400">
                Renouvellement le{" "}
                {new Date(pressing.subscription_expires_at).toLocaleDateString("fr-FR")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Aucun renouvellement programme.</p>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>Session</SectionTitle>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
            <InfoRow label="Compte" value={profile?.full_name ?? "—"} />
            <InfoRow label="Role" value={profile?.role ?? "—"} />
            <InfoRow
              label="Pressing"
              value={pressing.name}
            />
          </div>
        </section>
      </div>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <span className="shrink-0 text-xs font-medium text-slate-400">{label}</span>
      <span className="truncate text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
