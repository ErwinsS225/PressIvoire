import { BottomNav } from "@/components/mobile/bottom-nav";
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
                {/* Barre basse : mobile uniquement */}
                <div className="md:hidden">
                    <BottomNav />
                </div>

                <main className="flex-1 p-4 md:p-8">{children}</main>
            </div>
        </div>
    );
}