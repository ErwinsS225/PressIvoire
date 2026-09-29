/**
 * SOURCE UNIQUE DE VERITE POUR LE ROUTAGE.
 *
 * ## Pourquoi ce fichier existe
 *
 * L'orientation de l'utilisateur etait decidee a six endroits differents :
 * le middleware, l'action `signUp`, le layout `(app)`, une dizaine de pages,
 * et les deux layouts d'onboarding. Chacune avait sa propre lecture de la
 * situation, et une seule erreur suffisait a envoyer un gerant vers
 * l'ecran client — ce qui est precisement le symptome rapporte : un compte
 * enregistre en `owner`, renvoye vers `/onboarding/client`, sans qu'aucun
 * message n'explique pourquoi.
 *
 * Une regle, une fonction, un jeu de tests. Le reste du code appelle ici.
 */

/** Destinations possibles du parcours applicatif. */
export const DESTINATIONS = {
  login: "/login",
  dashboard: "/dashboard",
  onboardingOwner: "/onboarding/pressing",
  onboardingClient: "/onboarding/client",
} as const;

export type Destination = (typeof DESTINATIONS)[keyof typeof DESTINATIONS];

/** Ce qu'il faut savoir d'un visiteur pour le.router. */
export interface RoutingContext {
  /** Session Auth : `null` si personne n'est connecte. */
  userId: string | null;
  /** Role du profil (`owner`, `client`, ...). `null` si le profil est illisible. */
  role: string | null;
  /** Le compte est-il rattache a un pressing/configure ? */
  hasPressing: boolean;
}

/**
 * Ou doit aller cet utilisateur ?
 *
 * L'ordre des tests est l essence de la fonction — il est le meme partout :
 *
 *   1. pas de session      -> connexion. Sans cela, un visiteur sans compte
 *                             serait envoye vers un onboarding impossible.
 *   2. pressing rattache    -> l'application. C'est le seul cas ou les pages
 *                             metier ont du sens.
 *   3. role `client`       -> son ecran d'attente, qui ne demande rien.
 *   4. reste (gérant)      -> l'onboarding de creation de pressing.
 *
 * Le cas 3 doit etre teste AVANT le cas 4 : un client n'a aucun pressing a
 * creer, et l'envoyer dans le parcours gerant le bloquerait sur un formulaire
 * qui ne le concerne pas.
 */
export function resolveDestination(ctx: RoutingContext): Destination {
  if (!ctx.userId) return DESTINATIONS.login;
  if (ctx.hasPressing) return DESTINATIONS.dashboard;
  if (ctx.role === "client") return DESTINATIONS.onboardingClient;
  return DESTINATIONS.onboardingOwner;
}

/**
 * Cette destination est-elle un ecran d'onboarding ?
 *
 * Utilise par les layouts d'onboarding pour ne pas boucler : si la
 * destination calculee est deja cet ecran, on ne redirige pas vers soi-meme.
 */
export function isOnboardingPath(path: string): boolean {
  return (
    path === DESTINATIONS.onboardingOwner ||
    path === DESTINATIONS.onboardingClient
  );
}