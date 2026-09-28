import { signOut } from "@/app/actions/auth";

/**
 * Deconnexion.
 *
 * La barre laterale est un composant client : elle ne peut pas appeler
 * directement la Server Action `signOut`. On expose donc ce Route Handler,
 * puis la barre fait un POST classique — ce qui fonctionne aussi sans
 * JavaScript.
 *
 * `signOut()` termine deja par un `redirect("/login")` : il leve une
 * exception de redirection, qui transforme la reponse en 303. Il ne faut
 * donc rien appeler apres — tout code suivant serait du code mort.
 */
export async function POST() {
    await signOut();
}