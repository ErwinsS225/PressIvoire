import { describe, it, expect } from "vitest";

import {
  DESTINATIONS,
  isOnboardingPath,
  resolveDestination,
} from "./routing";

/*
 * Ces tests verrouillent la regle d'orientation. Le bug qu'ils previennent :
 * un gerant enregistre en `owner` se retrouvait sur `/onboarding/client`,
 * parce qu'un profil devenu illisible valait `client` par defaut et que
 * chaque ecran comparait le role « a la main ». Une seule fonction, une
 * seule regle, donc un seul comportement a proteger.
 */
describe("resolveDestination", () => {
  it("envoie vers la connexion quand il n'y a pas de session", () => {
    expect(
      resolveDestination({ userId: null, role: null, hasPressing: false }),
    ).toBe(DESTINATIONS.login);
  });

  /*
   * La session prime sur tout, meme si un pressing apparait dans le contexte :
   * sans utilisateur, le pressing n'est de toute facon pas le sien.
   */
  it("privilegie la connexion des le reste, pressing compris", () => {
    expect(
      resolveDestination({ userId: null, role: "owner", hasPressing: true }),
    ).toBe(DESTINATIONS.login);
  });

  it("envoie vers le dashboard des qu'un pressing est rattache", () => {
    for (const role of ["owner", "manager", "cashier", "driver", "client"]) {
      expect(
        resolveDestination({ userId: "u1", role, hasPressing: true }),
      ).toBe(DESTINATIONS.dashboard);
    }
  });

  it("envoie un client sans pressing vers son ecran d'attente", () => {
    expect(
      resolveDestination({ userId: "u1", role: "client", hasPressing: false }),
    ).toBe(DESTINATIONS.onboardingClient);
  });

  it("envoie un gerant sans pressing vers la creation de pressing", () => {
    expect(
      resolveDestination({ userId: "u1", role: "owner", hasPressing: false }),
    ).toBe(DESTINATIONS.onboardingOwner);
  });

  /*
   * Le cas qui a casse en production : un gerant dont le profil n'a pas pu etre
   * lu. `role: null` ne doit pas le faire basculer du cote client.
   */
  it("envoie vers le gerant quand le role est inconnu", () => {
    expect(
      resolveDestination({ userId: "u1", role: null, hasPressing: false }),
    ).toBe(DESTINATIONS.onboardingOwner);
  });

  it("traite un role de membre d'equipe comme un gerant", () => {
    // Un manager/cashier sans pressing ne peut pas creer d'etablissement :
    // il doit aller la ou l'eclran peut lui dire pourquoi.
    for (const role of ["manager", "cashier", "driver"]) {
      expect(
        resolveDestination({ userId: "u1", role, hasPressing: false }),
      ).toBe(DESTINATIONS.onboardingOwner);
    }
  });
});

describe("isOnboardingPath", () => {
  it("reconnait les deux ecrans d'onboarding", () => {
    expect(isOnboardingPath(DESTINATIONS.onboardingOwner)).toBe(true);
    expect(isOnboardingPath(DESTINATIONS.onboardingClient)).toBe(true);
  });

  it("ne confond pas les ecrans de l'application", () => {
    expect(isOnboardingPath(DESTINATIONS.dashboard)).toBe(false);
    expect(isOnboardingPath(DESTINATIONS.login)).toBe(false);
    // Un ecran qui COMMENCE par /onboarding n'est pas un ecran d'onboarding.
    expect(isOnboardingPath("/onboarding")).toBe(false);
    expect(isOnboardingPath("/onboardingx")).toBe(false);
  });
});