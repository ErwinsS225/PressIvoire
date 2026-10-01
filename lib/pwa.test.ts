import { describe, expect, it } from "vitest";

import {
  detectIos,
  detectSafari,
  detectStandalone,
  installMethod,
  isInstalling,
  isServiceWorkerReady,
  manualInstallSteps,
  type InstallSignals,
} from "./pwa";

/** Signaux par defaut : Chrome mobile, invite systeme disponible. */
function signals(overrides: Partial<InstallSignals> = {}): InstallSignals {
  return {
    isStandalone: false,
    isIos: false,
    isSafari: false,
    hasPromptEvent: true,
    ...overrides,
  };
}

describe("installMethod", () => {
  it("propose le bouton instantane quand l'evenement est arrive", () => {
    expect(installMethod(signals())).toBe("prompt");
  });

  it("ne propose rien si l'application est deja en standalone", () => {
    // Cas prioritaire sur TOUT le reste : proposer d'installer une application
    // deja posee est le detail le plus suspect pour un utilisateur.
    expect(installMethod(signals({ isStandalone: true, hasPromptEvent: true }))).toBe(
      "unavailable",
    );
  });

  it("retombe sur les gestes manuels sur iOS, qui n'expose aucune API", () => {
    expect(installMethod(signals({ isIos: true, hasPromptEvent: false }))).toBe("manual");
  });

  it("retombe sur les gestes manuels sur Safari macOS", () => {
    expect(installMethod(signals({ isSafari: true, hasPromptEvent: false }))).toBe("manual");
  });

  it("ne propose rien sur Chromium sans evenement : page non eligible", () => {
    expect(installMethod(signals({ hasPromptEvent: false }))).toBe("unavailable");
  });
});

describe("manualInstallSteps", () => {
  it("donne les gestes iOS, ordonnes et nommes", () => {
    const steps = manualInstallSteps({ isIos: true, isSafari: true });
    expect(steps?.steps).toHaveLength(3);
    expect(steps?.steps[0]).toContain("Partager");
    // Le libelle est volontairement sans accent (convention des chaines de ce
    // projet) : on teste le GESTE, pas la typographie.
    expect(steps?.steps[1]).toContain("ecran d'accueil");
    expect(steps?.steps[2]).toMatch(/^Touchez Ajouter/);
  });

  it("donne le menu Fichier sur Safari macOS, pas les gestes iOS", () => {
    const steps = manualInstallSteps({ isIos: false, isSafari: true });
    expect(steps?.steps[0]).toContain("Fichier");
    expect(steps?.steps.join(" ")).not.toContain("Partager");
  });

  it("ne propose aucune aide sur un navigateur pilotable", () => {
    // Afficher « Partage puis Sur l'écran d'accueil » a un utilisateur Chrome
    // est un signal qu'on ne maitrise pas son propre produit.
    expect(manualInstallSteps({ isIos: false, isSafari: false })).toBeNull();
  });
});

describe("isInstalling", () => {
  it("bloque le double declenchement pendant l'invite", () => {
    expect(isInstalling({ promptOpen: true, justInstalled: false })).toBe(true);
  });

  it("laisse repasser une fois l'installation confirmee", () => {
    expect(isInstalling({ promptOpen: true, justInstalled: true })).toBe(false);
    expect(isInstalling({ promptOpen: false, justInstalled: false })).toBe(false);
  });
});

describe("detectIos", () => {
  it.each(["iPhone", "iPad", "iPod"])("reconnait %s", (device) => {
    expect(detectIos({ userAgent: `Mozilla/5.0 (${device}; CPU OS 17_0)` })).toBe(true);
  });

  it("reconnait l'iPad qui se fait passer pour un Mac", () => {
    // iPadOS 13+ annonce « Macintosh » : sans le test du tactile, tous les
    // iPad seraient pris pour des Mac et recevraient des gestes de Dock.
    expect(
      detectIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 5 }),
    ).toBe(true);
  });

  it("ne confond pas un vrai Mac tactile avec un iPad", () => {
    // Un MacBook tactile reste un Mac : le cas est rare, mais le prendre pour
    // un iPad ferait echouer l'installation.
    expect(
      detectIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 0 }),
    ).toBe(false);
  });

  it("ne reconnait pas Android", () => {
    expect(detectIos({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7)" })).toBe(false);
  });
});

describe("detectSafari", () => {
  it("reconnait Safari", () => {
    expect(detectSafari("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15")).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone) CriOS/120.0.0.0 Mobile Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0) Edg/120.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0) OPR/106.0.0.0",
  ])("exclut le navigateur embarque : %s", (userAgent) => {
    // `CriOS` est Safari sous le deguisement de Chrome : sans cette exclusion,
    // un utilisateur iOS recevrait les gestes de Dock au lieu des siens.
    expect(detectSafari(userAgent)).toBe(false);
  });
});

describe("detectStandalone", () => {
  it("passe le relais a navigator.standalone sur iOS", () => {
    // Safari iOS ignore `display-mode` : sans ce cas, l'application installee
    // proposerait de s'installer elle-meme.
    expect(
      detectStandalone({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }),
    ).toBe(true);
  });

  it("detecte le mode standalone sur les navigateurs Chromium", () => {
    expect(
      detectStandalone({ matchMedia: () => ({ matches: true }), navigator: {} }),
    ).toBe(true);
  });

  it("refuse les deux signaux en navigation classique", () => {
    expect(
      detectStandalone({ matchMedia: () => ({ matches: false }), navigator: {} }),
    ).toBe(false);
  });
});

describe("isServiceWorkerReady", () => {
  it("exige un controleur, pas seulement une inscription", () => {
    // `ready` existe avant que le SW ne controle la page : l'utiliser ferait
    // afficher « disponible hors ligne » a la premiere visite, qui est le
    // moment ou c'est le moins vrai.
    expect(isServiceWorkerReady({ serviceWorker: {} })).toBe(false);
    expect(isServiceWorkerReady({ serviceWorker: { controller: {} } })).toBe(true);
  });

  it("refuse quand le navigateur ne supporte pas les service workers", () => {
    expect(isServiceWorkerReady({})).toBe(false);
  });
});