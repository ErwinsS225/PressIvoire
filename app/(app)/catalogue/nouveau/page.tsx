import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { ArticleForm } from "@/components/catalogue/article-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getContext } from "@/lib/supabase/queries";
import { isStaffRole } from "@/lib/constants";

export const metadata = { title: "Nouvel article" };

/**
 * Creation d'un article du catalogue.
 *
 * Le role est verifie ici pour l'affichage (un client du pressing n'a rien a
 * faire sur cet ecran) ET dans la Server Action, qui reste l'autorite : la
 * base refuse l'ecriture si le role ne le permet pas.
 */
export default async function NewArticlePage() {
  const { pressing, profile } = await getContext();

  if (!pressing) {
    redirect("/settings");
  }

  if (!isStaffRole(profile?.role)) {
    return (
      <div className="flex flex-col gap-8">
        <Header
          title="Nouvel article"
          subtitle="Réservé au personnel du pressing."
        >
          <Button asChild variant="outline">
            <Link href="/catalogue">Retour au catalogue</Link>
          </Button>
        </Header>
        <Card className="max-w-2xl border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-800">
            Seul le personnel du pressing peut ajouter un article au
            catalogue.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Header
        title="Nouvel article"
        subtitle="Il apparaîtra aussitôt à la prise de commande."
      >
        <Button asChild variant="outline">
          <Link href="/catalogue">Annuler</Link>
        </Button>
      </Header>
      <ArticleForm />
    </div>
  );
}
