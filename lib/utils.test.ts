import { describe, it, expect } from "vitest";

import {
  safeRedirectPath,
  normalizeIvorianPhone,
  isValidIvorianPhone,
  formatFCFA,
  formatAmount,
} from "./utils";

/*
 * `safeRedirectPath` est une BARRIERE DE SECURITE.
 *
 * Le parametre `redirect` vient de l'URL, donc d'un tiers capable de fabriquer
 * un lien. Sans ce filtre, `/login?redirect=https://pressingpro.ci.evil.com`
 * transformerait la page de connexion en passerelle vers un site tiers apres
 * authentification : l'utilisateur voit sa session volee sur un site qui imite
 * parfaitement le vrai.
 *
 * Ces cas sont donc des tests de non-regression, pas de la documentation.
 */
describe("safeRedirectPath", () => {
  it("accepte un chemin interne legitime", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/orders")).toBe("/orders");
  });

  it("conserve la query string d'un chemin interne", () => {
    expect(safeRedirectPath("/commandes?statut=ready")).toBe(
      "/commandes?statut=ready",
    );
  });

  it("ignore les espaces autour du chemin", () => {
    expect(safeRedirectPath("  /dashboard  ")).toBe("/dashboard");
  });

  /* --- Vecteurs d'attaque : tous doivent retomber sur le repli --- */

  it("refuse une URL absolue", () => {
    expect(safeRedirectPath("https://pressingpro.ci.evil.com")).toBe(
      "/dashboard",
    );
    expect(safeRedirectPath("http://evil.com")).toBe("/dashboard");
  });

  it("refuse une URL protocol-relative (//evil.com)", () => {
    // Interpreté par le navigateur comme un lien vers un AUTRE site.
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.com/steal")).toBe("/dashboard");
  });

  it("refuse le backslash, que certains navigateurs normalisent en slash", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });

  it("refuse un backslash au milieu du chemin", () => {
    // Contourne le test `//` en passant par `/\`.
    expect(safeRedirectPath("/dashboard\\..\\evil.com")).toBe("/dashboard");
  });

  it("refuse les caracteres de controle (injection d'en-tete)", () => {
    // Un CRLF permettrait d'injecter un en-tete Set-Cookie via l'URL.
    expect(safeRedirectPath("/dashboard\nSet-Cookie: a=b")).toBe(
      "/dashboard",
    );
    expect(safeRedirectPath("/dashboard\r\nX-Evil: 1")).toBe("/dashboard");
  });

  it("refuse une valeur vide, nulle ou non textuelle", () => {
    expect(safeRedirectPath("")).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
  });

  it("refuse un chemin sans barre initiale", () => {
    expect(safeRedirectPath("dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("respecte le repli fourni", () => {
    expect(safeRedirectPath("//evil.com", "/orders")).toBe("/orders");
  });
});

/*
 * Numéros ivoiriens : c'est le format reel du marche cible. Un bug ici
 * empeche un client de rappel, ou pire, enregistre un numero faux.
 */
describe("normalizeIvorianPhone", () => {
  it("normalise les saisies libres au format attendu en base", () => {
    // La colonne `profiles.phone` porte un CHECK ^\+225[0-9]{8,10}$.
    expect(normalizeIvorianPhone("0708091011")).toBe("+2250708091011");
    expect(normalizeIvorianPhone("07 08 09 10 11")).toBe("+2250708091011");
    expect(normalizeIvorianPhone("+225 07 08 09 10 11")).toBe(
      "+2250708091011",
    );
  });

  it("ne double pas le prefixe 225 deja present", () => {
    expect(normalizeIvorianPhone("2250708091011")).toBe("+2250708091011");
  });

  it("renvoie une chaine vide quand il n'y a aucun chiffre", () => {
    // Le schema exige ensuite ^\+225[0-9]{8,10}$ : renvoyer "+225" nu
    // ferait echouer la validation avec un message trompeur ("8 a 10
    // chiffres") alors que l'utilisateur n'a rien saisi.
    expect(normalizeIvorianPhone("")).toBe("");
    expect(normalizeIvorianPhone("   ")).toBe("");
  });
});

describe("isValidIvorianPhone", () => {
  it("accepte les 8 a 10 chiffres apres l'indicatif", () => {
    expect(isValidIvorianPhone("+2250708091011")).toBe(true);
    expect(isValidIvorianPhone("+22507080910")).toBe(true);
  });

  it("refuse un mauvais indicatif ou un mauvais format", () => {
    expect(isValidIvorianPhone("0708091011")).toBe(false);
    expect(isValidIvorianPhone("+3312345678")).toBe(false);
    expect(isValidIvorianPhone("+2250708")).toBe(false);
    expect(isValidIvorianPhone("")).toBe(false);
  });
});

describe("formatage des montants", () => {
  /*
   * `Intl.NumberFormat("fr-FR")` utilise l'espace fine insécable (U+202F)
   * comme separateur de milliers, et non l'espace ordinaire. C'est le rendu
   * typographique correct en francais. On compare donc a la valeur produite
   * par Intl, plutot qu'a une espace codee en dur : le test resterait juste
   * meme si le runtime changeait d'espace.
   */
  const nf = new Intl.NumberFormat("fr-FR");

  it("formate en francs CFA avec separateur de milliers", () => {
    // 4000 -> "4 000 FCFA" : sans cela, un montant de 1 000 000 FCFA
    // s'afficherait "1000000", illisible pour un gerant.
    expect(formatFCFA(4000)).toBe(`${nf.format(4000)} FCFA`);
    expect(formatFCFA(0)).toBe(`${nf.format(0)} FCFA`);
  });

  it("formate sans devise quand l'unite est affichee a part", () => {
    expect(formatAmount(4000)).toBe(nf.format(4000));
  });

  it("utilise un separateur de milliers sur les grands montants", () => {
    // Un prix du catalogue depasse facilement 100 000 FCFA.
    const formatted = formatFCFA(150000);
    expect(formatted).toContain("150");
    expect(formatted).toBe(`${nf.format(150000)} FCFA`);
  });
});
