import { notFound } from "next/navigation";
import { Screen, ScreenHeader } from "@/components/mobile/screen";
import { ArticleForm } from "@/components/mobile/article-form";
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

  const canDelete = isAdminRole(profile?.role);

  return (
    <Screen>
      <ScreenHeader
        title={article.name}
        subtitle={`Ajouté le ${new Date(article.created_at).toLocaleDateString("fr-FR")}`}
        backHref="/catalogue"
      />
      <ArticleForm article={article} canDelete={canDelete} />
    </Screen>
  );
}
