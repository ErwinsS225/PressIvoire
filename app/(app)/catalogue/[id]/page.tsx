import Link from "next/link";
import { notFound } from "next/navigation";

import { Header } from "@/components/layout/header";
import { ArticleForm } from "@/components/catalogue/article-form";
import { Button } from "@/components/ui/button";
import { getArticle, getContext } from "@/lib/supabase/queries";
import { isAdminRole } from "@/lib/constants";

export const metadata = { title: "Modifier un article" };

/**
 * Edition d'un article du catalogue.
 *
 * `notFound()` plutot qu'un message : un article supprime ou appartenant a un
 * autre pressing doit produire un 404, pas un ecran vide qui laisserait croire
 * a un bug. La RLS garantit deja qu'un article d'un autre pressing est
 * introuvable, donc `notFound()` couvre les deux cas.
 */
export default async function EditArticlePage({ params }: { params: { id: string } }) {
  const { pressing, profile } = await getContext();

  if (!pressing) notFound();

  const article = await getArticle(params.id);
  if (!article || article.pressing_id !== pressing.id) notFound();

  /*
   * L'EDITION est reservee a l'admin du pressing (policy « articles:
   * modification par l'admin du pressing ») alors que la CREATION est ouverte a
   * tout le personnel. Un caissier peut donc arriver ici sans avoir le droit
   * d'enregistrer : le formulaire lui est presente en lecture seule, pour qu'il
   * ne decouvre pas le refus au moment de valider.
   */
  const canEdit = isAdminRole(profile?.role);

  return (
    <div className="flex flex-col gap-8">
      <Header
        title={article.name}
        subtitle={`Ajouté le ${new Date(article.created_at).toLocaleDateString("fr-FR")}`}
      >
        <Button asChild variant="outline">
          <Link href="/catalogue">Retour au catalogue</Link>
        </Button>
      </Header>
      <ArticleForm article={article} canEdit={canEdit} />
    </div>
  );
}
