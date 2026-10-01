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

/**
 * URL de la landing page (site vitrine), sur un AUTRE deploiement.
 *
 * ## Pourquoi elle existe, et pourquoi elle est facultative
 *
 * L'application est un outil de travail : on y entre par un lien, on y reste,
 * on la met en favori. Elle n'a donc pas besoin de renvoyer vers la landing —
 * c'est la landing qui renvoie vers l'application, pas l'inverse.
 *
 * Ce lien sert un cas precis : le visiteur qui arrive DIRECTEMENT sur l'ecran
 * de connexion, sans avoir vu la page de presentation, n'a aucun moyen de
 * savoir ce qu'il va obtenir. Un lien discret « en savoir plus » lui evite de
 * refermer l'onglet.
 *
 * D'ou le caractere OPTIONNEL de la variable. Pas de landing configuree = pas
 * de lien, et surtout pas un lien casse : un `<a href="">` renverrait vers la
 * page d'accueil de l'application, ce qui est pire que rien.
 *
 * La valeur sert aussi aux métadonnées : le nom du site doit correspondre à
 * ce que la landing annonce, sinon un lien partagé sur WhatsApp affiche un
 * titre different de celui que le visiteur a vu.
 */
export function getLandingUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_LANDING_URL?.trim();

  if (!url) return null;

  return url.replace(/\/+$/, "");
}