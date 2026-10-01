import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BRAND_CANVAS, BRAND_NAME, BRAND_THEME_COLOR } from "./brand";

/**
 * Coherence de la marque entre le manifeste et `lib/brand.ts`.
 *
 * ## Ce que ce test empeche
 *
 * Une divergence de couleur entre deux deploiement d'un meme produit. C'est
 * deja arrive : l'application etait en indigo `#4f46e5` pendant que la landing
 * etait verte. Rien ne le signale — ni le compilateur, ni le navigateur, ni un
 * test — parce que chaque depot se suffit a lui-meme. C'est precisement ce
 * que vit un tiers : il ne voit pas « deux deploiement », il voit « deux
 * produits ».
 *
 * Le manifeste est donc lu comme une donnee, et compare aux constantes. Le
 * fichier reste du JSON statique — `import` serait plus elegant mais
 * ajouterait un `resolveJsonModule` pour un simple controle de coherence.
 */

const MANIFEST = readFileSync(
  path.join(process.cwd(), "public", "manifest.webmanifest"),
  "utf-8",
);

function manifest(): Record<string, unknown> {
  return JSON.parse(MANIFEST) as Record<string, unknown>;
}

describe("coherence du manifeste avec lib/brand", () => {
  it("aligne la couleur de la barre d'etat", () => {
    // Divergence ici = bande verte sur le site, barre indigo sur l'application
    // installee : le contraste est immediatement visible au passage.
    expect(manifest()["theme_color"]).toBe(BRAND_THEME_COLOR);
  });

  it("aligne le fond de l'ecran de demarrage", () => {
    // iOS utilise cette valeur pour l'ecran de demarrage ET pour le fond
    // derriere l'icone. Un blanc pur sous une interface creme donne un
    // eclair visible a chaque ouverture.
    expect(manifest()["background_color"]).toBe(BRAND_CANVAS);
  });

  it("garde le nom de marque identique", () => {
    // C'est le libelle sous l'icone sur l'ecran d'accueil : s'il differe de
    // celui de la landing, l'application ressemble a un autre produit.
    expect(manifest()["short_name"]).toBe(BRAND_NAME);
  });

  it("ne laisse plus d'indigo dans la declaration de marque", () => {
    // Le controle le plus direct : la couleur qui a diverge, interdite.
    expect(MANIFEST).not.toContain("#4f46e5");
  });

  it("declare bien le mode standalone, sans quoi l'installation ne s'affiche pas", () => {
    // Sans `display`, l'application s'ouvre dans un onglet de navigateur et
    // l'utilisateur ne voit pas de barre d'etat : l'illusion d'application
    // disparait, et avec elle l'envie de l'installer.
    expect(manifest()["display"]).toBe("standalone");
  });

  it("expose une icone maskable, requise pour l'installation sur Android", () => {
    // Sans icone maskable, Android rogne l'icone avec son propre masque et le
    // logo peut devenir illisible. Le test echoue si les deux formes
    // disparaissent.
    const icons = manifest()["icons"] as Array<{ purpose?: string; sizes?: string }>;
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    expect(icons.some((icon) => icon.sizes?.includes("512"))).toBe(true);
  });
});