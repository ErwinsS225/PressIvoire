import { z } from "zod";
import { CI_COMMUNES } from "@/lib/constants";
import { normalizeIvorianPhone } from "@/lib/utils";

/**
 * Schemas de validation de l'onboarding gerant (Phase 2 - Etape 2).
 *
 * Un schema par etape : chaque page valide uniquement ce qu'elle collecte,
 * et l'assemblage final est revalide en une fois avant l'appel a la base.
 */

/** Jours d'ouverture, dans l'ordre de la semaine ivoirienne (lundi en tete). */
export const OPENING_DAYS = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
] as const;

export type OpeningDayKey = (typeof OPENING_DAYS)[number]["key"];

/** Fenetre d'ouverture : "08:00-18:00". `null` = ferme ce jour-la. */
const openingSlot = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/, "Format attendu : 08:00-18:00")
  .refine((value) => value.split("-")[0] < value.split("-")[1], {
    message: "L'ouverture doit preceder la fermeture",
  });

export const openingHoursSchema = z.record(
  z.enum(OPENING_DAYS.map((day) => day.key) as [OpeningDayKey, ...OpeningDayKey[]]),
  openingSlot.nullable(),
);

/* -------------------------------------------------------------------------- */
/* Etape 1 — identite du pressing                                              */
/* -------------------------------------------------------------------------- */

export const step1Schema = z.object({
  name: z
    .string()
    .min(2, "Nom trop court")
    .max(120, "Nom trop long (120 caracteres maximum)"),
  commune: z.enum(CI_COMMUNES, {
    errorMap: () => ({ message: "Choisissez une commune" }),
  }),
  address: z.string().min(3, "Adresse trop courte").max(200),
  phone: z
    .string()
    .min(1, "Le telephone est obligatoire")
    .transform(normalizeIvorianPhone)
    .refine((value) => /^\+225[0-9]{8,10}$/.test(value), {
      message: "Numéro invalide (8 à 10 chiffres attendus)",
    }),
  openingHours: openingHoursSchema,
  logoUrl: z.string().url().nullable(),
});
export type Step1Values = z.input<typeof step1Schema>;
export type Step1Output = z.output<typeof step1Schema>;

/* -------------------------------------------------------------------------- */
/* Etape 2 — services, tarifs et catalogue                                     */
/* -------------------------------------------------------------------------- */

export const catalogArticleSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["habit", "linge_maison", "cuir", "delicat"]),
  washType: z.enum(["sec", "eau", "repassage_seul", "detachage"]),
  price: z.number().int().min(0).max(1_000_000),
  estimatedHours: z.number().int().min(1).max(336),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});
export type CatalogArticle = z.infer<typeof catalogArticleSchema>;

export const step2Schema = z.object({
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  deliveryFee: z.number().int().min(0).max(100_000),
  /** Frais par commune ; au moins une entree si la livraison est active. */
  deliveryFeesByCommune: z.record(z.string(), z.number().int().min(0)),
  defaultDelaysByWash: z.object({
    eau: z.number().int().min(1).max(336),
    sec: z.number().int().min(1).max(336),
    repassage_seul: z.number().int().min(1).max(336),
    detachage: z.number().int().min(1).max(336),
  }),
  articles: z.array(catalogArticleSchema).min(1, "Gardez au moins un article actif"),
});
export type Step2Values = z.infer<typeof step2Schema>;

/** Cohérence métier, en plus des contraintes de forme ci-dessus. */
export const step2Refinement = step2Schema.refine(
  (values) =>
    !values.deliveryEnabled ||
    (values.deliveryFee > 0 && Object.keys(values.deliveryFeesByCommune).length > 0),
  {
    message:
      "Livraison active : renseignez les frais de livraison (global et par commune)",
    path: ["deliveryFee"],
  },
);

/* -------------------------------------------------------------------------- */
/* Etape 3 — plan SaaS                                                          */
/* -------------------------------------------------------------------------- */

export const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: 0,
    period: "pour toujours",
    features: [
      "50 commandes / mois",
      "1 caissier",
      "Catalogue illimité",
      "Notifications SMS (quota)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15000,
    period: "par mois",
    features: [
      "Commandes illimitées",
      "5 employés",
      "Livraison + tournées",
      "WhatsApp & SMS inclus",
      "Rapports et statistiques",
    ],
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const step3Schema = z.object({
  plan: z.enum(["free", "pro"]),
  /** true = demande l'essai gratuit de 30 jours (uniquement pour Pro). */
  trial: z.boolean(),
});
export type Step3Values = z.infer<typeof step3Schema>;

/* -------------------------------------------------------------------------- */
/* Assemblage final                                                            */
/* -------------------------------------------------------------------------- */

export const onboardingPayloadSchema = z.object({
  pressing: step1Schema,
  services: step2Schema,
  subscription: step3Schema,
});

export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;
