import { describe, it, expect } from "vitest";

import {
  step1Schema,
  step2Refinement,
  step3Schema,
  onboardingPayloadSchema,
  openingHoursSchema,
  OPENING_DAYS,
} from "./onboarding";
import { CI_COMMUNES } from "@/lib/constants";

/*
 * Ces schemas structurent l'onboarding gerant : ils ne servent pas seulement
 * a un message d'erreur, ils conditionnent ce qui est ecrit en base. Une
 * regle de coherence ratee ici se traduit par un catalogue, des frais ou des
 * delais incoherents en production.
 */

const HOURS = {
  monday: "08:00-19:00",
  tuesday: "08:00-19:00",
  wednesday: "08:00-19:00",
  thursday: "08:00-19:00",
  friday: "08:00-19:00",
  saturday: "08:00-20:00",
  sunday: "09:00-14:00",
};

const step1 = {
  name: "Pressing du Plateau",
  commune: "Cocody",
  address: "Rue des Jardins, Cocody",
  phone: "0708091011",
  openingHours: { ...HOURS },
  logoUrl: null,
};

describe("openingHoursSchema", () => {
  it("accepte une plage horaire valide", () => {
    expect(openingHoursSchema.safeParse({ ...HOURS }).success).toBe(true);
  });

  it("accepte la fermeture d'un jour (null)", () => {
    // Un pressing ferme le dimanche doit pouvoir le declarer.
    expect(
      openingHoursSchema.safeParse({ ...HOURS, sunday: null }).success,
    ).toBe(true);
  });

  it("refuse un format horaire incorrect", () => {
    // 8h00 sans zero initial : la colonne attend HH:MM-HH:MM.
    expect(
      openingHoursSchema.safeParse({ ...HOURS, monday: "8:00-19:00" }).success,
    ).toBe(false);
    expect(
      openingHoursSchema.safeParse({ ...HOURS, monday: "08h00-19h00" }).success,
    ).toBe(false);
  });

  it("refuse une plage dont la fin precede l'ouverture", () => {
    // Cas metier reel : un pressing ferme la nuit, pas "de 19h a 8h".
    // La comparaison est lexicographique, ce qui tient parce que le format
    // impose deux chiffres par composante.
    expect(
      openingHoursSchema.safeParse({ ...HOURS, monday: "19:00-08:00" }).success,
    ).toBe(false);
  });

  it("refuse une plage de duree nulle", () => {
    expect(
      openingHoursSchema.safeParse({ ...HOURS, monday: "08:00-08:00" }).success,
    ).toBe(false);
  });

  it("refuse un jour mal orthographie", () => {
    // "lundi" au lieu de "monday" : ecrit tel quel en base, invisible ensuite.
    expect(
      openingHoursSchema.safeParse({ ...HOURS, lundi: "08:00-19:00" }).success,
    ).toBe(false);
  });

  it("expose les sept jours de la semaine ivoirienne", () => {
    expect(OPENING_DAYS).toHaveLength(7);
    expect(OPENING_DAYS[0].key).toBe("monday");
  });
});

describe("step1Schema", () => {
  it("accepte une identite complete valide", () => {
    expect(step1Schema.safeParse(step1).success).toBe(true);
  });

  it("normalise le telephone au format attendu en base", () => {
    const result = step1Schema.safeParse(step1);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+2250708091011");
  });

  it("refuse un nom trop court", () => {
    expect(step1Schema.safeParse({ ...step1, name: "A" }).success).toBe(false);
  });

  it("refuse une adresse vide", () => {
    expect(step1Schema.safeParse({ ...step1, address: "" }).success).toBe(false);
  });

  it("refuse une commune hors liste des communes desservies", () => {
    // La commune alimente la grille de frais de livraison : une valeur libre
    // creerait un tarif sans correspondance. Attention, Bingerville, Songon
    // et Koumassi font bien partie de la liste (constance CI_COMMUNES) : on
    // prend donc une ville qui n'en fait pas partie.
    expect(
      step1Schema.safeParse({ ...step1, commune: "Yamoussoukro" }).success,
    ).toBe(false);
  });

  it("accepte chacune des communes de la liste", () => {
    for (const commune of CI_COMMUNES) {
      expect(
        step1Schema.safeParse({ ...step1, commune }).success,
      ).toBe(true);
    }
  });

  it("refuse un logo qui n'est pas une URL", () => {
    expect(
      step1Schema.safeParse({ ...step1, logoUrl: "pas-une-url" }).success,
    ).toBe(false);
  });
});

const services = {
  pickupEnabled: true,
  deliveryEnabled: true,
  deliveryFee: 1000,
  deliveryFeesByCommune: { Cocody: 1000, Yopougon: 1500 },
  defaultDelaysByWash: { eau: 24, sec: 48, repassage_seul: 4, detachage: 72 },
  articles: [
    {
      name: "Chemise",
      category: "habit",
      washType: "eau",
      price: 1000,
      estimatedHours: 24,
      sortOrder: 0,
      isActive: true,
    },
  ],
};

describe("step2Refinement", () => {
  it("accepte des services coherents", () => {
    expect(step2Refinement.safeParse(services).success).toBe(true);
  });

  it("exige au moins un article au catalogue", () => {
    // Sans article, le pressing ne peut prendre aucune commande.
    expect(
      step2Refinement.safeParse({ ...services, articles: [] }).success,
    ).toBe(false);
  });

  it("exige des frais de livraison quand la livraison est active", () => {
    // Regle metier : activer la livraison sans la facturer la rend gratuite
    // par defaut, ce que le gerant n'a pas demande.
    expect(
      step2Refinement.safeParse({ ...services, deliveryFee: 0 }).success,
    ).toBe(false);
  });

  it("exige au moins une commune tarifee quand la livraison est active", () => {
    expect(
      step2Refinement.safeParse({ ...services, deliveryFeesByCommune: {} })
        .success,
    ).toBe(false);
  });

  it("accepte la livraison desactivee sans frais", () => {
    // Sans livraison, aucun frais n'est attendu : la regle ne s'applique pas.
    expect(
      step2Refinement.safeParse({
        ...services,
        deliveryEnabled: false,
        deliveryFee: 0,
        deliveryFeesByCommune: {},
      }).success,
    ).toBe(true);
  });

  it("refuse un delai nul pour un type de lavage", () => {
    expect(
      step2Refinement.safeParse({
        ...services,
        defaultDelaysByWash: { eau: 0, sec: 48, repassage_seul: 4, detachage: 72 },
      }).success,
    ).toBe(false);
  });

  it("refuse un prix d'article negatif", () => {
    expect(
      step2Refinement.safeParse({
        ...services,
        articles: [{ ...services.articles[0], price: -100 }],
      }).success,
    ).toBe(false);
  });
});

describe("step3Schema", () => {
  it("accepte les deux plans de l'offre", () => {
    expect(step3Schema.safeParse({ plan: "free", trial: false }).success).toBe(
      true,
    );
    expect(step3Schema.safeParse({ plan: "pro", trial: true }).success).toBe(
      true,
    );
  });

  it("refuse un plan hors de l'offre commerciale", () => {
    // "business" et "enterprise" existent en base (CHECK de la colonne) mais
    // ne sont pas vendables via l'onboarding : les accepter creerait un
    // abonnement non facture.
    expect(
      step3Schema.safeParse({ plan: "enterprise", trial: false }).success,
    ).toBe(false);
  });
});

describe("onboardingPayloadSchema", () => {
  it("accepte un payload complet et valide", () => {
    const payload = {
      pressing: step1,
      services: step2Refinement.parse(services),
      subscription: { plan: "pro", trial: true },
    };
    expect(onboardingPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("refuse un payload dont le pressing est invalide", () => {
    // L'assemblage final est la derniere barriere avant l'appel a
    // complete_onboarding() : un pressing sans nom ne doit pas passer.
    const payload = {
      pressing: { ...step1, name: "" },
      services: step2Refinement.parse(services),
      subscription: { plan: "free", trial: false },
    };
    expect(onboardingPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

