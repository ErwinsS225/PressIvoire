import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLandingUrl } from "./app-url";

/*
 * La landing est FACULTATIVE : ce module ne doit donc jamais renvoyer une URL
 * bidon. Le piege serait de retomber sur une valeur par defaut — un
 * `href=""` qui renverrait vers la page d'accueil de l'application et ferait
 * croire a un lien casse, ce qui est pire que l'absence de lien.
 */
describe("getLandingUrl", () => {
  const original = process.env.NEXT_PUBLIC_LANDING_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_LANDING_URL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_LANDING_URL;
    } else {
      process.env.NEXT_PUBLIC_LANDING_URL = original;
    }
  });

  it("renvoie null quand aucune landing n'est configuree", () => {
    expect(getLandingUrl()).toBeNull();
  });

  it("renvoie null sur une variable vide ou faite d'espaces", () => {
    // Une variable presente mais vide est un oubli de configuration, pas une
    // intention : la traiter comme « pas de landing » evite un lien vers "".
    process.env.NEXT_PUBLIC_LANDING_URL = "";
    expect(getLandingUrl()).toBeNull();

    process.env.NEXT_PUBLIC_LANDING_URL = "   ";
    expect(getLandingUrl()).toBeNull();
  });

  it("renvoie l'URL configuree", () => {
    process.env.NEXT_PUBLIC_LANDING_URL = "https://landing-saass.vercel.app";
    expect(getLandingUrl()).toBe("https://landing-saass.vercel.app");
  });

  it("supprime la barre oblique finale", () => {
    // Un double slash (`https://site.app//`) casserait certains chemins.
    process.env.NEXT_PUBLIC_LANDING_URL = "https://landing-saass.vercel.app/";
    expect(getLandingUrl()).toBe("https://landing-saass.vercel.app");

    process.env.NEXT_PUBLIC_LANDING_URL = "https://landing-saass.vercel.app///";
    expect(getLandingUrl()).toBe("https://landing-saass.vercel.app");
  });

  it("ignore les espaces de bord", () => {
    process.env.NEXT_PUBLIC_LANDING_URL = "  https://landing-saass.vercel.app  ";
    expect(getLandingUrl()).toBe("https://landing-saass.vercel.app");
  });
});