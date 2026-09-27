"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  step1Schema,
  step2Refinement,
  step3Schema,
  type CatalogArticle,
  type PlanId,
} from "@/lib/validation/onboarding";

/**
 * Etat du parcours d'onboarding, partage par les trois etapes.
 *
 * Le store est persiste dans `sessionStorage` : les etapes sont sur des
 * routes distinctes (`/step-1`, `/step-2`, `/step-3`), donc un rechargement
 * de page ou un retour arriere ne doit pas perdre la saisie. `sessionStorage`
 * et non `localStorage` : ces donnees n'ont rien a survivre a la fermeture
 * de l'onglet, et on ne veut pas laisser un pressing en brouillon sur un
 * poste partage.
 *
 * Chaque etape est validee AVANT de pouvoir passer a la suivante : c'est la
 * que se trouve la regle metier, pas dans les boutons.
 */

export interface OnboardingState {
  step1: {
    name: string;
    commune: string;
    address: string;
    phone: string;
    /** Cle du jour -> "08:00-18:00" ou null (ferme). */
    openingHours: Record<string, string | null>;
    logoUrl: string | null;
  };
  step2: {
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
    deliveryFee: number;
    deliveryFeesByCommune: Record<string, number>;
    defaultDelaysByWash: {
      eau: number;
      sec: number;
      repassage_seul: number;
      detachage: number;
    };
    articles: CatalogArticle[];
  };
  step3: {
    plan: PlanId;
    trial: boolean;
  };

  setStep1: (values: Partial<OnboardingState["step1"]>) => void;
  setStep2: (values: Partial<OnboardingState["step2"]>) => void;
  setStep3: (values: Partial<OnboardingState["step3"]>) => void;
  /** Pre-remplit le catalogue depuis le catalogue type de la base. */
  loadReferenceArticles: (articles: CatalogArticle[]) => void;
  reset: () => void;
}

const initialState = {
  step1: {
    name: "",
    commune: "Cocody",
    address: "",
    phone: "",
    // Pressing ivoirien : ouvert 7j/7, sauf le dimanche.
    openingHours: {
      monday: "08:00-19:00",
      tuesday: "08:00-19:00",
      wednesday: "08:00-19:00",
      thursday: "08:00-19:00",
      friday: "08:00-19:00",
      saturday: "08:00-20:00",
      sunday: "09:00-14:00",
    },
    logoUrl: null,
  },
  step2: {
    pickupEnabled: false,
    deliveryEnabled: true,
    deliveryFee: 1000,
    deliveryFeesByCommune: { Cocody: 1000, Yopougon: 1500, Marcory: 1000 },
    defaultDelaysByWash: { eau: 24, sec: 48, repassage_seul: 4, detachage: 72 },
    articles: [] as CatalogArticle[],
  },
  step3: {
    plan: "free" as PlanId,
    trial: false,
  },
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setStep1: (values) =>
        set((state) => ({ step1: { ...state.step1, ...values } })),
      setStep2: (values) =>
        set((state) => ({ step2: { ...state.step2, ...values } })),
      setStep3: (values) =>
        set((state) => ({ step3: { ...state.step3, ...values } })),

      loadReferenceArticles: (articles) =>
        set((state) =>
          // On ne remplace le catalogue que s'il est encore vide : sinon on
          // ecraserait les prix deja personnalises au retour en arriere.
          state.step2.articles.length === 0 ? { step2: { ...state.step2, articles } } : state,
        ),

      reset: () => set(initialState),
    }),
    {
      name: "pressingpro:onboarding",
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* Validation des etapes                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Valide une etape et renvoie les erreurs par champ.
 * Retourne `null` si l'etape est valide.
 */
export function validateStep(
  step: 1 | 2 | 3,
  state: Pick<OnboardingState, "step1" | "step2" | "step3">,
): Record<string, string> | null {
  if (step === 1) {
    const result = step1Schema.safeParse(state.step1);
    if (result.success) return null;
    return Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors)
        .filter(([, messages]) => messages?.length)
        .map(([key, messages]) => [key, (messages as string[])[0]]),
    );
  }

  if (step === 2) {
    const result = step2Refinement.safeParse(state.step2);
    if (result.success) return null;
    const fieldErrors = result.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors)
      .filter(([, messages]) => messages?.length)
      .map(([key, messages]) => [key, (messages as string[])[0]]);
    // Erreur de forme au champ, sinon erreur de coherence "affinee".
    if (first.length > 0) return Object.fromEntries(first);
    return { _form: result.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const result = step3Schema.safeParse(state.step3);
  if (result.success) return null;
  return Object.fromEntries(
    Object.entries(result.error.flatten().fieldErrors)
      .filter(([, messages]) => messages?.length)
      .map(([key, messages]) => [key, (messages as string[])[0]]),
  );
}
