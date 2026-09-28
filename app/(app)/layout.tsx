import { AuroraBackground } from "@/components/layout/aurora-background";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar, type Capability } from "@/components/layout/sidebar";
import { getEffectivePlan } from "@/lib/subscriptions";

/**
 * Layout principal de l'application.
 *
 * Bi-modal, sur une seule base de code :
 * - mobile  : barre de navigation basse, contenu pleine largeur ;
 * - desktop : barre latérale fixe, contenu aere.
 *
 * Le meme contenu sert les deux — l'application est concue en desktop, et le
 * responsive se fait par CSS (`md:`), pas par deux applications separees.
 *
 * Le plan d'abonnement est resolu ICI, cote serveur, puis passe a la
 * sidebar sous forme de capacités. La barre reste ainsi un composant client
 * simple : elle n'a ni session ni base a interroger.
 */
export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const context = await getEffectivePlan();

    const capabilities: Capability[] = [];
    if (context?.limits.deliveries) capabilities.push("deliveries");
    if (context?.limits.reports) capabilities.push("reports");
    if (context?.limits.notifications) capabilities.push("notifications");

    return (
        // `relative z-10` : le fond aurora est en `z-index: 0`. Sans ce
        // relèvement, le contenu du tableau de bord se retrouverait dessous.
        <div className="relative z-10 flex min-h-dvh">
            {/*
              Fond anime, monte ICI et pas dans chaque page : il ne serait
              sinon pas partage entre les ecrans, et rechargerait ses
              animations a chaque navigation.

              Le conteneur est transparent (pas de `bg-slate-50`) : un fond
              opaque masquerait completement l'aurora et l'effet de verre
              n'aurait plus rien a refracter.
            */}
            <AuroraBackground />

            {/* Barre laterale : desktop uniquement */}
            <div className="hidden md:flex">
                <Sidebar capabilities={capabilities} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
                    {children}
                </main>

                {/* Barre basse : mobile uniquement. Le `pb-24` ci-dessus
                    reserve sa place pour qu'elle ne masque pas le contenu. */}
                <div className="md:hidden">
                    <BottomNav />
                </div>
            </div>
        </div>
    );
}