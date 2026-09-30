/**
 * Racine de l'application.
 *
 * La landing ne vit plus ici : elle est déployée séparément, sur un site
 * statique (dépôt `landingSaass`), qui collecte les demandes et renvoie
 * vers cette application. Deux landings pour un même produit se concurrencent
 * dans les moteurs de recherche et se contredisent — celle-ci parle de
 * « suivi des impayés », celle-là de « cahier papier ».
 *
 * Il ne reste donc qu'une porte d'entrée, et elle doit être unique :
 *
 *   - utilisateur connecté  -> son tableau de bord ;
 *   - visiteur              -> la page de connexion.
 *
 * Le premier cas est traité ici plutôt que dans le middleware : ce contrôle
 * dépend de la session et n'a rien à faire dans les règles de chemin, où il
 * se déclencherait sur la page de connexion elle-même et créerait une boucle.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  // La racine n'a pas vocation a etre indexee : elle redirige.
  robots: { index: false, follow: false },
};

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
