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
        // `app-surface` : un dégradé très doux, presque blanc. Il donne le
        // plan de travail sur lequel les cartes viennent se poser — c'est lui
        // qui rend leurs ombres lisibles.
        <div className="app-surface flex min-h-dvh">
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