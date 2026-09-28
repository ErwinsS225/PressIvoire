import { describe, it, expect } from "vitest";

import {
  PLANS,
  resolvePlan,
  isPlanActive,
  upgradeMessage,
} from "./plans";

/*
 * Le freemium repose sur ces fonctions : une erreur ici donne soit un client
 * bloqué à tort, soit une fonctionnalité payante offerte gratuitement.
 */

describe("resolvePlan", () => {
  it("renvoie le bon plan pour chaque identifiant", () => {
    expect(resolvePlan("free").id).toBe("free");
    expect(resolvePlan("pro").id).toBe("pro");
    expect(resolvePlan("business").id).toBe("business");
    expect(resolvePlan("enterprise").id).toBe("enterprise");
  });

  it("retombe sur free pour une valeur inconnue", () => {
    // Jamais sur `pro` : un plan corrompu en base ne doit pas ouvrir
    // l'ensemble des fonctionnalités payantes.
    expect(resolvePlan("illimité").id).toBe("free");
    expect(resolvePlan("").id).toBe("free");
    expect(resolvePlan(null).id).toBe("free");
    expect(resolvePlan(undefined).id).toBe("free");
  });

  it("n'accepte pas une clé heritee du prototype", () => {
    // `in` parcours la chaine de prototype : "constructor" donnerait true.
    expect(resolvePlan("constructor").id).toBe("free");
    expect(resolvePlan("toString").id).toBe("free");
  });
});

describe("isPlanActive", () => {
  it("considere actif un plan sans date d'echeance", () => {
    // C'est le cas du plan gratuit, et des essais dont la date n'est pas
    // encore posee.
    expect(isPlanActive("pro", null)).toBe(true);
    expect(isPlanActive("free", undefined)).toBe(true);
  });

  it("considere actif un abonnement dont l'echeance est future", () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    expect(isPlanActive("pro", future)).toBe(true);
  });

  it("considere expiré un abonnement dont l'echeance est passee", () => {
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    expect(isPlanActive("pro", past)).toBe(false);
  });

  it("considere expiré un abonnement dont l'echeance est exactement maintenant", () => {
    // Le contrat est `> now` : a l'instant exact, l'abonnement est fini.
    expect(isPlanActive("pro", new Date().toISOString())).toBe(false);
  });
});

/*
 * Les quotas et capacités sont l'ESSENTIEL de l'offre commerciale : ces
 * tests documentent ce que chaque plan promet, et le verrouillent.
 */
describe("capacités par plan", () => {
  it("le plan gratuit limite le volume et coupe les fonctions avancées", () => {
    const free = PLANS.free.limits;
    expect(free.ordersPerMonth).toBe(50);
    expect(free.staffMembers).toBe(1);
    expect(free.deliveries).toBe(false);
    expect(free.reports).toBe(false);
    expect(free.notifications).toBe(false);
    expect(free.partialPayments).toBe(false);
  });

  it("le plan Pro lève toutes les limites", () => {
    const pro = PLANS.pro.limits;
    // `null` = illimité, et non un grand nombre arbitraire.
    expect(pro.ordersPerMonth).toBeNull();
    expect(pro.staffMembers).toBe(5);
    expect(pro.deliveries).toBe(true);
    expect(pro.reports).toBe(true);
    expect(pro.notifications).toBe(true);
    expect(pro.partialPayments).toBe(true);
  });

  it("aucun plan payant n'est plus restrictif que le gratuit", () => {
    // Garde-fou : ajouter un plan ne doit pas pouvoir retirer une
    // capacité déjà offerte aux plans inférieurs.
    const free = PLANS.free.limits;

    for (const id of ["pro", "business", "enterprise"] as const) {
      const paid = PLANS[id].limits;

      // Capacités conditionnelles : le payant ne peut pas les désactiver.
      expect(paid.deliveries).toBe(true);
      expect(paid.reports).toBe(true);
      expect(paid.notifications).toBe(true);
      expect(paid.partialPayments).toBe(true);

      // Quota : soit illimité, soit au moins égal à celui du gratuit.
      if (free.ordersPerMonth !== null) {
        expect(
          paid.ordersPerMonth === null ||
            paid.ordersPerMonth >= free.ordersPerMonth,
        ).toBe(true);
      }
    }
  });

  it("les paliers d'employés sont croissants, le dernier étant illimité", () => {
    // `null` = illimité, pas 0 : une comparaison numérique naïve donnerait
    // « enterprise est plus restrictif que business », ce qui est faux.
    expect(PLANS.pro.limits.staffMembers).toBe(5);
    expect(PLANS.business.limits.staffMembers).toBe(25);
    expect(PLANS.enterprise.limits.staffMembers).toBeNull();
  });
});

describe("upgradeMessage", () => {
  it("cite la fonctionnalité et le plan courant", () => {
    const message = upgradeMessage("les tournées", PLANS.free);
    expect(message).toContain("les tournées");
    expect(message).toContain("Pro");
    expect(message).toContain("Gratuit");
  });
});
