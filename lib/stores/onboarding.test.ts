// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";

import { useOnboardingStore, validateStep } from "./onboarding";
import type { CatalogArticle } from "@/lib/validation/onboarding";

/*
 * Le catalogue est manipule par identifiant, pas par index.
 *
 * L'index dependait de l'ordre d'AFFICHAGE, lui-meme filtre par type de
 * lavage : une edition ou une suppression passait donc la bonne operation sur
 * la mauvaise ligne. Ces tests figent le comportement correct.
 */

const article = (over: Partial<CatalogArticle> = {}): CatalogArticle => ({
  name: "Chemise",
  category: "habit",
  washType: "eau",
  price: 1000,
  estimatedHours: 24,
  sortOrder: 0,
  isActive: true,
  ...over,
});

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("CRUD du catalogue d'onboarding", () => {
  it("ajoute une ligne ACTIVE et renvoie son identifiant", () => {
    const id = useOnboardingStore.getState().addArticle();
    const { articles } = useOnboardingStore.getState().step2;

    expect(articles).toHaveLength(1);
    expect(articles[0].clientId).toBe(id);
    // ACTIVE : une ligne masquee par le filtre par defaut donnait l'impression
    // que le bouton n'avait rien fait.
    expect(articles[0].isActive).toBe(true);
  });

  it("donne un identifiant distinct a chaque ligne", () => {
    const a = useOnboardingStore.getState().addArticle();
    const b = useOnboardingStore.getState().addArticle();
    expect(a).not.toBe(b);
    expect(useOnboardingStore.getState().step2.articles).toHaveLength(2);
  });

  it("incremente sortOrder pour conserver l'ordre de saisie", () => {
    useOnboardingStore.getState().addArticle();
    useOnboardingStore.getState().addArticle();
    const [first, second] = useOnboardingStore.getState().step2.articles;
    expect(second.sortOrder).toBeGreaterThan(first.sortOrder);
  });

  it("modifie la ligne visee, pas la premiere", () => {
    const first = useOnboardingStore.getState().addArticle();
    const second = useOnboardingStore.getState().addArticle();

    useOnboardingStore.getState().updateArticle(second, { name: "Robe" });

    const { articles } = useOnboardingStore.getState().step2;
    expect(articles[0].name).toBe(""); // intacte
    expect(articles[1].name).toBe("Robe");
    expect(articles[0].clientId).toBe(first);
  });

  it("conserve l'identifiant apres edition", () => {
    // C'est ce qui donne au champ une cle stable : sans cela, React remonte
    // l'input a chaque frappe et le focus est perdu.
    const id = useOnboardingStore.getState().addArticle();
    useOnboardingStore.getState().updateArticle(id, { name: "Chem" });
    useOnboardingStore.getState().updateArticle(id, { name: "Chemise" });

    expect(useOnboardingStore.getState().step2.articles[0].clientId).toBe(id);
  });

  it("retire la ligne visee", () => {
    const first = useOnboardingStore.getState().addArticle();
    const second = useOnboardingStore.getState().addArticle();

    expect(useOnboardingStore.getState().removeArticle(first)).toBe(true);

    const { articles } = useOnboardingStore.getState().step2;
    expect(articles).toHaveLength(1);
    expect(articles[0].clientId).toBe(second);
  });

  it("ignore un identifiant inconnu au lieu de modifier le mauvais article", () => {
    const id = useOnboardingStore.getState().addArticle();
    useOnboardingStore.getState().updateArticle(id, { name: "Chemise" });

    useOnboardingStore.getState().updateArticle("fantome", { name: "PIRATE" });
    expect(useOnboardingStore.getState().removeArticle("fantome")).toBe(false);

    const { articles } = useOnboardingStore.getState().step2;
    expect(articles).toHaveLength(1);
    expect(articles[0].name).toBe("Chemise");
  });

  it("attribue un identifiant au catalogue de reference charge", () => {
    useOnboardingStore
      .getState()
      .loadReferenceArticles([article({ name: "Chemise" }), article({ name: "Robe" })]);

    const { articles } = useOnboardingStore.getState().step2;
    expect(articles).toHaveLength(2);
    expect(articles[0].clientId).toBeTruthy();
    expect(articles[0].clientId).not.toBe(articles[1].clientId);
  });

  it("n'ecrase pas un catalogue deja personnalise", () => {
    useOnboardingStore.getState().addArticle();
    useOnboardingStore.getState().loadReferenceArticles([article({ name: "Chemise" })]);

    const { articles } = useOnboardingStore.getState().step2;
    expect(articles).toHaveLength(1);
    expect(articles[0].name).toBe("");
  });

  it("bloque la validation tant qu'un article n'a pas de nom", () => {
    useOnboardingStore.getState().addArticle();

    const errors = validateStep(2, useOnboardingStore.getState());
    expect(errors).not.toBeNull();
  });

  it("valide une ligne correctement renseignee", () => {
    const id = useOnboardingStore.getState().addArticle();
    useOnboardingStore.getState().updateArticle(id, { name: "Chemise" });

    expect(validateStep(2, useOnboardingStore.getState())).toBeNull();
  });

  it("detecte un doublon lors de la validation", () => {
    const a = useOnboardingStore.getState().addArticle();
    const b = useOnboardingStore.getState().addArticle();
    useOnboardingStore.getState().updateArticle(a, { name: "Chemise" });
    useOnboardingStore.getState().updateArticle(b, { name: "Chemise" });

    expect(validateStep(2, useOnboardingStore.getState())).not.toBeNull();
  });
});