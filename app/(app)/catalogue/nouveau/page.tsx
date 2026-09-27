import { Screen, ScreenHeader } from "@/components/mobile/screen";
import { ArticleForm } from "@/components/mobile/article-form";
import { getContext } from "@/lib/supabase/queries";
import { isStaffRole } from "@/lib/constants";
import Link from "next/link";

export const metadata = { title: "Nouvel article" };

/**
 * Creation d'un article du catalogue.
 *
 * Le role est verifie ici pour l'affichage (un client du pressing n'a rien a
 * faire sur cet ecran) ET dans la Server Action, qui reste l'autorite.
 */
export default async function NewArticlePage() {
  const { pressing, profile } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Nouvel article" backHref="/catalogue" />
      </Screen>
    );
  }

  if (!isStaffRole(profile?.role)) {
    return (
      <Screen>
        <ScreenHeader title="Nouvel article" backHref="/catalogue" />
        <div className="px-5">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Seul le personnel du pressing peut ajouter un article au catalogue.
          </p>
          <Link
            href="/catalogue"
            className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            Retour au catalogue
          </Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Nouvel article"
        subtitle="Il apparaîtra aussitôt à la prise de commande."
        backHref="/catalogue"
      />
      <ArticleForm />
    </Screen>
  );
}
