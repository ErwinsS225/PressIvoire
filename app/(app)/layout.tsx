import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar, type Capability } from "@/components/layout/sidebar";
import {
    getEffectivePlan,
    getMonthlyOrderCountForPlan,
} from "@/lib/subscriptions";
import { getContext } from "@/lib/supabase/queries";
import { resolveDestination } from "@/lib/routing";

/**
 * Layout principal de l'application — et GARDE UNIQUE de l'espace metier.
 *
 * Bi-modal, sur une seule base de code :
 * - mobile  : barre de navigation basse, contenu pleine largeur ;
 * - desktop : barre laterale fixe, contenu aere.
 *
 * Le meme contenu sert les deux — l'application est concue en desktop, et le
 * responsive se fait par CSS (`md:`), pas par deux applications separees.
 *
 * ## Pourquoi la garde est ici, et pas dans chaque page
 *
 * La destination est decidee par `resolveDestination()` (lib/routing.ts), la
 * meme fonction que celle utilisee par l'inscription et par les layouts
 * d'onboarding. Une seule regle, donc un seul comportement.
 *
 * Le layout est le bon endroit pour cette porte : il enveloppe TOUTES les
 * pages de l'application, la ou la verification par page se dupliquait (onze
 * fois) et laissait passer cinq pages qui n'en avaient aucune — `/orders`,
 * `/clients`, `/orders/[id]`, `/clients/[id]` et `/catalogue/[id]`. Ces cinq
 * affichaient « Aucun pressing trouve » au lieu de rediriger, exposant une
 * interface cassee a un gerant en cours d'inscription.
 *
 * Les gardes restantes dans les pages ne sont pas redondants : elles servent
 * au TypeScript pour retrecir le type de `pressing` a un non-nullable.
 *
 * Le plan d'abonnement est resolu ICI, cote serveur, puis passe a la
 * sidebar sous forme de capacites. La barre reste ainsi un composant client
 * simple : elle n'a ni session ni base a interroger.
 */
export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    /*
     * Une seule lecture du contexte pour ce rendu : le layout en a besoin pour
     * la garde ET pour le compteur de quota. Auparavant `getContext()` etait
     * rappele deux fois, soit deux allers-retours Supabase en trop.
     */
    const appContext = await getContext();

    // Point de routage unique : connexion, onboarding gerant, onboarding
    // client, ou application. Voir lib/routing.ts.
    const destination = resolveDestination({
        userId: appContext.userId,
        role: appContext.profile?.role ?? null,
        hasPressing: appContext.pressing !== null,
    });

    // Sans pressing, aucune page de cet espace n'a de sens : toutes
    // interrogent un pressing.
    if (destination !== "/dashboard") {
        redirect(destination);
    }

    const context = await getEffectivePlan();

    const capabilities: Capability[] = [];
    if (context?.limits.deliveries) capabilities.push("deliveries");
    if (context?.limits.reports) capabilities.push("reports");
    if (context?.limits.notifications) capabilities.push("notifications");

    /*
     * Quota d'appel à l'upgrade, affiché dans la barre latérale.
     *
     * On ne le compte que si le plan est gratuit ET qu'un quota existe :
     * sans cela, chaque navigation exécuterait une requête `count` inutile
     * pour les clients payants, qui n'ont ni compteur ni jauge.
     *
     * Le nombre affiché est celui RÉELLEMENT appliqué par `createOrder()`,
     * pas une estimation : afficher « 50/50 » alors qu'une commande passe
     * encore ferait perdre confiance au premier refus.
     */
    const isFree = context?.plan.id === "free";
    let usedOrders = 0;
    if (isFree && appContext.pressing) {
        // Le pressing vient de la lecture unique faite plus haut : inutile
        // d'interroger `getContext()` une seconde fois.
        usedOrders = await getMonthlyOrderCountForPlan(appContext.pressing.id);
    }

    return (
        // `app-surface` : un dégradé très doux, presque blanc. Il donne le
        // plan de travail sur lequel les cartes viennent se poser — c'est lui
        // qui rend leurs ombres lisibles.
        <div className="app-surface flex min-h-dvh">
            {/* Barre laterale : desktop uniquement */}
            <div className="hidden md:flex">
                <Sidebar
                    capabilities={capabilities}
                    isFree={isFree}
                    usage={{
                        usedOrders,
                        limitOrders: context?.limits.ordersPerMonth ?? null,
                    }}
                />
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