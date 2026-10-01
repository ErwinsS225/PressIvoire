/**
 * SOURCE UNIQUE DE VERITE POUR LES CHEMINS PUBLICS.
 *
 * ## Pourquoi ce fichier existe
 *
 * La liste des ecrans accessibles sans session vivait dans `middleware.ts`,
 * ou elle n'etait testable par rien : le middleware s'execute dans le runtime
 * Edge, `next/headers` n'y a pas acces, et le fichier est donc hors de portee
 * de Vitest (qui ne couvre que `lib/**`).
 *
 * Une regle de securite non testee est une regle que l'on croit avoir. Cette
 * regle la contient et la rend verifiable — comme `lib/routing.ts` l'a fait
 * pour l'orientation de l'utilisateur.
 *
 * ## Le piege que ces tests previennent
 *
 * Le test naturelle d'un prefixe est `pathname.startsWith(prefix)`, et c'est
 * exactement ce qui rendait `/api` dangerous : `"/apercu".startsWith("/api")`
 * vaut `true`. Une future page d'apercu, une route `/api-clients`, un simple
 * `/authenticated` seraient alors servis SANS session — silencieusement, et
 * sans le moindre avertissement.
 *
 * Un prefixe n'est un prefixe que s'il tombe sur une FIN DE SEGMENT : `/api`
 * couvre `/api` et `/api/webhooks/wave`, jamais `/apercu`.
 */

/**
 * Ecrans accessibles sans session, compares chemin par chemin.
 *
 * `/reset-password` y figure : le lien de reinitialisation est traite comme
 * une session de type « recovery », donc l'utilisateur arrive deja
 * connecte. Exiger une session complete le bloquerait.
 */
export const PUBLIC_PATHS: readonly string[] = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

/**
 * Prefixes accessibles sans session, compares sur une fin de segment.
 *
 * - `/api`     : le webhook Wave (appele par Wave, sans session) et la
 *                deconnexion. Chacun verifie sa propre authentification.
 * - `/_next`   : assets et donnees de build. Le `matcher` du middleware les
 *                laisse deja passer, mais les garder ici protege si le
 *                matcher change.
 * - `/auth`    : atterrissage des liens Supabase (confirmation d'email,
 *                reinitialisation). Le middleware ne peut pas exiger de
 *                session : ces liens ouvrent eux-memes la session.
 */
export const PUBLIC_PREFIXES: readonly string[] = ["/api", "/_next", "/auth"];

/**
 * `pathname` correspond-il a `prefix` sur une FIN DE SEGMENT ?
 *
 * `/api` + `/api/webhooks` -> oui.
 * `/api` + `/apercu`       -> non. C'est tout l'objet de cette fonction.
 */
export function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Cet ecran est-il accessible sans session ? */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((path) => matchesPrefix(pathname, path))) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/**
 * Ces ecrans n'ont aucun sens pour quelqu'un qui a deja une session : on le
 * renvoie directement dans l'application.
 *
 * `/reset-password` en est VOLONTAIREMENT absent : a l'instant precis ou
 * l'utilisateur arrive sur cet ecran, il est connecte (session « recovery »).
 * Le renvoyer vers `/dashboard` — comme le ferait un ecran reserve aux
 * visiteurs — rendrait le changement de mot de passe impossible.
 */
export const GUEST_ONLY_PATHS: readonly string[] = [
  "/login",
  "/register",
  "/forgot-password",
];

/** Un utilisateur connecte doit-il etre renvoye vers l'application ? */
export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.includes(pathname);
}