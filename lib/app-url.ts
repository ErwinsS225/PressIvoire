/**
 * URL publique de l'application, sans barre oblique finale.
 *
 * Extraite de `app/actions/auth.ts` (qui l'utilisait pour les liens d'email)
 * parce que la passerelle de paiement en a besoin aussi : les redirections
 * `success_url` / `cancel_url` doivent pointer sur le meme hote que les
 * emails de confirmation. Deux implémentations divergeraient, et une
 * divergence ici se verrait comme un paiement qui « saute » hors du site.
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;

  if (url) return url.replace(/\/$/, "");

  // En developpement, on peut se rabattre sur localhost.
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // En production, c'est une erreur de configuration critique : mieux vaut
  // echouer bruyamment qu'encoder une mauvaise URL dans un lien de paiement.
  throw new Error(
    "La variable d'environnement NEXT_PUBLIC_APP_URL est manquante. Les liens de paiement ne peuvent pas etre generes.",
  );
}