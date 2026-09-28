import { describe, it, expect } from "vitest";

import { articleFormSchema, fieldErrorsOf } from "./catalogue";

/*
 * Ce schema reproduit les contraintes CHECK de la table `articles`
 * (migration 001). Toute divergence se paie en erreur Postgres brute
 * affichee a l'utilisateur, au lieu d'un message clair sous le champ.
 *
 * Les montants arrivent en TEXTE depuis `<input type="number">` : c'est le
 * `z.coerce` qui les convertit. Ces tests verrouillent ce contrat.
 */

const valid = {
  name: "Chemise en coton",
  category: "habit",
  washType: "eau",
  price: "1500",
  estimatedHours: "24",
  description: "Lavage et repassage",
  isActive: true,
};

describe("articleFormSchema", () => {
  it("accepte un article valide", () => {
    expect(articleFormSchema.safeParse(valid).success).toBe(true);
  });

  it("convertit les chaines de prix et de delai en nombres", () => {
    // Le formulaire HTML renvoie toujours du texte : sans coerce, la
    // validation echouerait sur un formulaire parfaitement rempli.
    const result = articleFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(1500);
      expect(result.data.estimatedHours).toBe(24);
    }
  });

  it("accepte un prix nul (article offert ou a definir)", () => {
    // Le CHECK autorise 0 : on ne doit pas le refuser.
    expect(articleFormSchema.safeParse({ ...valid, price: "0" }).success).toBe(
      true,
    );
  });

  it("refuse un prix negatif", () => {
    expect(articleFormSchema.safeParse({ ...valid, price: "-1" }).success).toBe(
      false,
    );
  });

  it("refuse un prix non entier", () => {
    // Le CHECK `integer` de Postgres refuserait 1500.50 ; on le dit avant.
    expect(
      articleFormSchema.safeParse({ ...valid, price: "1500.5" }).success,
    ).toBe(false);
  });

  it("refuse un prix au-dela du plafond du CHECK", () => {
    // 1 000 001 FCFA : au-dela, Postgres refuse l'insert.
    expect(
      articleFormSchema.safeParse({ ...valid, price: "1000001" }).success,
    ).toBe(false);
  });

  it("refuse un delai nul ou negatif", () => {
    expect(
      articleFormSchema.safeParse({ ...valid, estimatedHours: "0" }).success,
    ).toBe(false);
  });

  it("respecte le plafond de delai de 336 heures (14 jours)", () => {
    expect(
      articleFormSchema.safeParse({ ...valid, estimatedHours: "336" }).success,
    ).toBe(true);
    expect(
      articleFormSchema.safeParse({ ...valid, estimatedHours: "337" }).success,
    ).toBe(false);
  });

  it("refuse un nom trop court, trop long, ou uniquement des espaces", () => {
    // Le trim precede le min : un nom de deux espaces ne doit pas passer.
    expect(articleFormSchema.safeParse({ ...valid, name: "A" }).success).toBe(
      false,
    );
    expect(articleFormSchema.safeParse({ ...valid, name: "  " }).success).toBe(
      false,
    );
    expect(
      articleFormSchema.safeParse({ ...valid, name: "a".repeat(121) }).success,
    ).toBe(false);
  });

  it("refuse une categorie ou un lavage hors enumERATION", () => {
    // Ce sont des CHECK stricts en base : "clothing" y serait rejete aussi.
    expect(
      articleFormSchema.safeParse({ ...valid, category: "clothing" }).success,
    ).toBe(false);
    expect(
      articleFormSchema.safeParse({ ...valid, washType: "dry_cleaning" }).success,
    ).toBe(false);
  });

  it("transforme une description vide en null", () => {
    // La colonne est nullable ; on ne veut pas "" comme valeur.
    for (const description of ["", undefined, null]) {
      const result = articleFormSchema.safeParse({ ...valid, description });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.description).toBeNull();
    }
  });

  it("convertit la case a cocher en booleen", () => {
    // `<input type="checkbox">` renvoie "on" ou rien — jamais true.
    expect(articleFormSchema.safeParse({ ...valid, isActive: "on" }).success).toBe(
      true,
    );
  });
});

/*
 * Les erreurs doivent etre addressables par champ : le formulaire affiche le
 * message SOUS l'input concerne. Une cle mal formee ferait afficher l'erreur
 * dans le vide.
 */
describe("fieldErrorsOf", () => {
  it("aplati les erreurs en { champ: message }", () => {
    const result = articleFormSchema.safeParse({
      ...valid,
      name: "A",
      price: "-5",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsOf(result.error);
      expect(errors.name).toBeTruthy();
      expect(errors.price).toBeTruthy();
    }
  });

  it("ne garde qu'un message par champ", () => {
    const result = articleFormSchema.safeParse({ ...valid, name: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsOf(result.error);
      // La valeur doit etre une chaine, pas un tableau.
      expect(typeof errors.name).toBe("string");
    }
  });
});
