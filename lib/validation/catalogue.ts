import { z } from "zod";

/**
 * Validation du formulaire de gestion du catalogue.
 *
 * Les montants arrivent en texte depuis `<input type="number">` : on utilise
 * `z.coerce` plutot qu'un `Number()` dissemine dans le composant, pour que la
 * conversion et le controle des bornes vivent au meme endroit.
 *
 * Les bornes reprennent EXACTEMENT les contraintes CHECK de la table
 * `articles` (migration 001) : price entre 0 et 1 000 000, estimated_hours
 * entre 1 et 336, name entre 1 et 120 caracteres. Sans cela, l'utilisateur
 * recevrait une erreur Postgres brute au lieu d'un message sous le champ.
 */
export const articleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  category: z.enum(["habit", "linge_maison", "cuir", "delicat"]),
  washType: z.enum(["sec", "eau", "repassage_seul", "detachage"]),
  price: z.coerce
    .number({ invalid_type_error: "Prix invalide." })
    .int("Le prix doit être un nombre entier de FCFA.")
    .min(0, "Le prix ne peut pas être négatif.")
    .max(1_000_000, "Le prix ne peut pas dépasser 1 000 000 FCFA."),
  estimatedHours: z.coerce
    .number({ invalid_type_error: "Délai invalide." })
    .int("Le délai doit être un nombre entier d'heures.")
    .min(1, "Le délai doit être d'au moins 1 heure.")
    .max(336, "Le délai ne peut pas dépasser 336 heures (14 jours)."),
  /*
   * `.nullish()` et non `.optional()` : le type d'entree du formulaire
   * declare `description?: string | null` (lib/validation/catalogue.ts,
   * `ArticleFormInput`). Un `.optional()` seul accepterait `undefined` mais
   * REJETERAIT `null` — alors que `null` est une valeur legitime de la part
   * d'un appelant, et que la colonne `articles.description` est nullable.
   * `.nullish()` couvre les deux, et le transform renvoie `null` dans tous
   * les cas d'absence, ce que la colonne attend.
   */
  description: z
    .string()
    .trim()
    .max(500, "La description ne peut pas dépasser 500 caractères.")
    .nullish()
    .transform((value) => (value ? value : null)),
  /** `"on"` quand la case est cochee dans un formulaire HTML. */
  isActive: z.coerce.boolean(),
});

/**
 * Forme BRUTE envoyee par le formulaire, avant validation.
 *
 * C'est le contrat des Server Actions : elles recoivent des chaines telles que
 * le navigateur les produit (`<input>` renvoie toujours du texte) et se
 * chargent de la conversion. Declarer ce type plutot qu'un objet deja valide
 * dit explicitement que l'entree n'est PAS digne de confiance — une Server
 * Action est un point d'entree HTTP public.
 *
 * Pour un appelant qui construit l'objet cote serveur, voir `ArticleFormOutput`.
 */
export interface ArticleFormInput {
  name: string;
  category: string;
  washType: string;
  price: string | number;
  estimatedHours: string | number;
  description?: string | null;
  isActive: boolean;
}

export type ArticleFormOutput = z.output<typeof articleFormSchema>;

/** Aplatit les erreurs Zod en `{ champ: message }` pour l'affichage. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
