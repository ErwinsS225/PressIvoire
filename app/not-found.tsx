import Link from "next/link";
import { Home, LayoutDashboard, SearchSlash } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Page 404 globale.
 *
 * Elle est rendue par le layout racine, en dehors de l'application de gestion :
 * l'utilisateur peut donc y arriver sans session. On lui rend la marque
 * identifiable (logo « PP ») et deux portes de sortie concretes — l'accueil
 * public et le tableau de bord — plutot qu'un simple message d'excuse.
 *
 * Le retour arriere ne passe pas par `javascript:history.back()` : cette URL
 * n'est pas un lien valide pour `next/link` (React la signale et le clic peut
 * etre ignore). Un lien vers une page reelle est fiable dans tous les cas.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center space-y-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 text-lg font-black text-white shadow-sm"
          >
            PP
          </span>
          <span className="text-lg font-black tracking-tight text-foreground">
            PressIvoire
          </span>
        </Link>

        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm">
          <SearchSlash className="h-10 w-10 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Erreur 404
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Page introuvable
          </h1>
          <p className="text-sm text-muted-foreground">
            La page que vous recherchez n&apos;existe pas, a été déplacée ou son
            adresse a changé.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Accueil
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
