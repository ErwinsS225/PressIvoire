import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * Layout principal de l'application.
 *
 * Bi-modal, sur une seule base de code :
 * - mobile  : barre de navigation basse, contenu pleine largeur ;
 * - desktop : barre latérale fixe, contenu aere.
 *
 * Le meme contenu sert les deux — l'application est concue en desktop, et le
 * responsive se fait par CSS (`md:`), pas par deux applications separees.
 */
export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-dvh bg-slate-50">
            {/* Barre laterale : desktop uniquement */}
            <div className="hidden md:flex">
                <Sidebar />
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