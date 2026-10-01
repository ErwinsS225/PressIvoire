import { describe, expect, it } from "vitest";

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_KEYS,
  extractAttribution,
  hasAttributionParams,
  isAttributionUsable,
} from "./attribution";

/** `URLSearchParams` convient directement a l'interface attendue. */
function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("hasAttributionParams", () => {
  it("reconnait une campagne complete", () => {
    expect(hasAttributionParams(params("utm_source=whatsapp&utm_campaign=janvier"))).toBe(true);
  });

  it("reconnait un marqueur de publicite seul", () => {
    // `gclid` sans `utm_*` est le cas des campagnes Google Ads : c'est
    // souvent la seule source d'un clic payant.
    expect(hasAttributionParams(params("gclid=abc123"))).toBe(true);
  });

  it("ignore une query sans aucun marqueur", () => {
    // Le cas le plus frequent : on ne doit pas ecrire de cookie pour rien, ni
    // surtout pas rafraichir sa duree de vie a chaque navigation.
    expect(hasAttributionParams(params("redirect=/orders"))).toBe(false);
    expect(hasAttributionParams(params(""))).toBe(false);
  });

  it("ignore une valeur vide ou seulement des espaces", () => {
    // `?utm_source=` passe par `URLSearchParams.has` dans d'autres outils ;
    // ici il doit etre traite comme absent, sinon on attribue une campagne
    // « vide » qui pollue les statistiques.
    expect(hasAttributionParams(params("utm_source="))).toBe(false);
    expect(hasAttributionParams(params("utm_source=%20%20"))).toBe(false);
  });
});

describe("extractAttribution", () => {
  it("ne conserve que les cles d'attribution", () => {
    // `redirect` contient un chemin interne : inutile dans le cookie, et
    // inutile dans les journaux serveur ou il finit.
    const query = extractAttribution(params("utm_source=whatsapp&redirect=/orders&ref=abc"));
    expect(query).toBe("utm_source=whatsapp");
  });

  it("interdit une valeur trop longue", () => {
    // Borne a 100 caracteres : un `gclid` manipule ne doit pas remplir le
    // cookie au detriment des autres parametres.
    const long = "x".repeat(500);
    const query = extractAttribution(params(`utm_source=${long}&utm_medium=whatsapp`));
    expect(query).toContain("utm_medium=whatsapp");
    expect(query).not.toContain(long);
  });

  it("renvoie une chaine vide quand rien n'est exploitable", () => {
    // La distinction « pas de campagne » et « campagne inconnue » doit
    // rester visible dans les donnees.
    expect(extractAttribution(params("redirect=/orders"))).toBe("");
  });

  it("borne la longueur totale du cookie", () => {
    const oversized = ATTRIBUTION_KEYS.map((key) => `${key}=${"y".repeat(99)}`).join("&");
    expect(extractAttribution(params(oversized)).length).toBeLessThanOrEqual(500);
  });
});

describe("isAttributionUsable", () => {
  it("exige utm_source", () => {
    // Un `gclid` seul est un identifiant de clic, pas une source lisible :
    // sans `utm_source`, il n'y a rien a afficher dans un tableau de canaux.
    expect(isAttributionUsable("gclid=abc")).toBe(false);
    expect(isAttributionUsable("utm_source=whatsapp")).toBe(true);
  });

  it("refuse une attribution vide", () => {
    expect(isAttributionUsable("")).toBe(false);
  });
});

describe("nom du cookie", () => {
  it("est prefixe pour eviter toute collision avec la landing", () => {
    // La landing utilise `pressingpro:*` en localStorage. Deux domaines
    // nchant pas les memes noms, le prefixe reste une precaution : il rend
    // imposible qu'un cookie pose par un des deux depots soit lu par l'autre.
    expect(ATTRIBUTION_COOKIE.startsWith("pp_")).toBe(true);
  });
});