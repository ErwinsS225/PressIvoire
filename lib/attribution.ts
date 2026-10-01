/**
 * Attribution de campagne.
 *
 * ## Le probleme
 *
 * La landing page (autre depot, autre deploiement) capte `utm_*`, `gclid` et
 * `fbclid`, les conserve 30 jours dans le navigateur… puis s'arrete. Le
 * visiteur clique sur « Essayer », arrive ici, et ce deploiement n'a aucun
 * moyen de savoir d'ou il vient.
 *
 * Consequence : deux outils de mesure — Plausible sur la landing, Vercel
 * Analytics ici — qui ne se parlent pas, tous deux passifs et sans identite.
 * Aucun ne peut dire « combien de comptes la campagne WhatsApp a produits ».
 * On sait seulement qu'il y a eu 300 visites et 12 inscriptions.
 *
 * ## La solution, et sa limite
 *
 * Le marqueur traverse la frontiere dans un cookie pose par le middleware, a
 * l'arrivee, avant toute redirection. C'est le minimum : ce qui compte n'est
 * pas de savoir d'ou vient la visite, mais de pouvoir relier un compte a une
 * campagne.
 *
 * **Limite assumee : le cookie ne se lit que sur ce deploiement.** Il rattache
 * donc le compte a une campagne, pas l'utilisateur dans le temps a travers les
 * deux domaines. Un suivi complet exigerait une table `clicks` cote projet
 * Supabase — a prevoir si la question « campagne -> compte » devient
 * structurelle.
 *
 * Fonctions PURES : le middleware s'execute dans le runtime Edge ou `next
 * /headers` n'a pas acces, donc la logique doit etre testable hors de lui.
 */

/** Nom du cookie qui transporte la query d'attribution. */
export const ATTRIBUTION_COOKIE = "pp_attribution";

/**
 * Parametres retenus.
 *
 * Volontairement restreint. La query contient aussi `redirect`, `ref` ou des
 * jetons de campagne : les cookie comme les URL se retrouvent dans les
 * journaux du serveur, donc on ne conserve que ce qui sert a l'analyse. Un
 * cookie plus large n'apporterait rien ici.
 */
export const ATTRIBUTION_KEYS: readonly string[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
];

/** Longueur maximale du cookie. Au-dela, on ignore plutot que de tronquer. */
const MAX_LENGTH = 500;

/** Un objet compatible avec `URLSearchParams`, testable sans DOM. */
type SearchParamsLike = {
  get: (key: string) => string | null;
};

/** Cette query porte-t-elle de quoi attribuer une campagne ? */
export function hasAttributionParams(params: SearchParamsLike): boolean {
  return ATTRIBUTION_KEYS.some((key) => {
    const value = params.get(key);
    return typeof value === "string" && value.trim() !== "";
  });
}

/**
 * Query d'attribution, filtree et bornee.
 *
 * Chaine vide si rien d'utile : la distinction « pas de campagne » et
 * « campagne inconnue » doit rester visible dans les donnees, sinon les deux
 * cas se melangent dans les statistiques.
 */
export function extractAttribution(params: SearchParamsLike): string {
  const kept = new URLSearchParams();

  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    // 100 caracteres par valeur : largement au-dessus de toute campagne
    // reelle, et assez bas pour qu'un `gclid` manipule ne fasse pas
    // exploser le cookie.
    if (trimmed !== "" && trimmed.length <= 100) {
      kept.set(key, trimmed);
    }
  }

  return kept.toString().slice(0, MAX_LENGTH);
}

/**
 * Une attribution est-elle exploitable pour une mesure ?
 *
 * `utm_source` seul ne prouve rien : n'importe qui peut forger une URL. La
 * lecture doit au moins etre complete pour etre citable.
 */
export function isAttributionUsable(query: string): boolean {
  return new URLSearchParams(query).has("utm_source");
}