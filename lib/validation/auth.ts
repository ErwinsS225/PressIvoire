import { z } from "zod";
import { normalizeIvorianPhone } from "@/lib/utils";

/**
 * Schemas de validation de l'authentification.
 *
 * Regles de mot de passe imposees par le contrat (flo.md) : 8 caracteres
 * minimum et au moins un chiffre. On impose aussi une minuscule et une
 * majuscule — un mot de passe type "12345678" ne protege rien sur un compte
 * qui pilote la caisse d'un commerce.
 */
const password = z
  .string()
  .min(8, "8 caractères minimum")
  .regex(/\d/, "Au moins un chiffre")
  .regex(/[a-z]/, "Au moins une minuscule")
  .regex(/[A-Z]/, "Au moins une majuscule");

/**
 * Telephone ivoirien : on accepte les saisies libres ("07 08 09 10 11",
 * "0708091011", "+225 07 08 09 10 11") et on normalise en "+225XXXXXXXXX".
 * Le format produit est celui attendu par le CHECK de la colonne
 * `profiles.phone` : ^\+225[0-9]{8,10}$.
 */
const phone = z
  .string()
  .min(1, "Le telephone est obligatoire")
  .transform(normalizeIvorianPhone)
  .refine((value) => /^\+225[0-9]{8,10}$/.test(value), {
    message: "Numéro invalide (8 à 10 chiffres attendus)",
  });

/** Roles que l'utilisateur peut choisir a l'inscription. */
export const SIGNUP_ROLES = ["owner", "client"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

/** Libelles affiches dans le formulaire d'inscription (accents inclus). */
export const ROLE_LABELS: Record<SignupRole, string> = {
  owner: "Je gère un pressing",
  client: "Je suis client",
};

const email = z
  .string()
  .min(1, "L'email est obligatoire")
  .email("Email invalide")
  .transform((value) => value.trim().toLowerCase());

export const loginSchema = z.object({
  /**
   * Email ou telephone.
   *
   * On n'impose pas un format a l'identifiant : Supabase stocke les deux dans
   * la meme colonne, et l'utilisateur ne sait pas a l'avance avoir cree son
   * compte par l'un ou l'autre. On verifie seulement que la saisie ressemble a
   * l'un des deux — un champ « email » en `type="email"` refuserait par
   * exemple « 07 08 09 10 11 » avant meme l'envoi.
   *
   * La distinction email/telephone est refaite cote serveur, qui route
   * l'identifiant vers le bon champ de `signInWithPassword`.
   */
  identifier: z
    .string()
    .min(1, "Email ou téléphone obligatoire")
    .refine(
      (value) => {
        const trimmed = value.trim();
        if (trimmed.includes("@"))
          return z.string().email().safeParse(trimmed).success;
        // 8 a 10 chiffres une fois le prefixe 225 eventuellement retire.
        const digits = trimmed.replace(/\D/g, "").replace(/^225/, "");
        return digits.length >= 8 && digits.length <= 10;
      },
      { message: "Email ou numéro de téléphone invalide" },
    ),
  password: z.string().min(1, "Mot de passe obligatoire"),
});
export type LoginInput = z.input<typeof loginSchema>;
export type LoginValues = z.output<typeof loginSchema>;

export const registerSchema = z
  .object({
    role: z.enum(SIGNUP_ROLES),
    fullName: z.string().min(2, "Nom trop court").max(120, "Nom trop long"),
    phone,
    email,
    password,
    confirmPassword: z.string(),
  })
  // Deux champs distincts : `confirmPassword` n'est pas une confirmation de
  // securite, c'est une simple recopie a comparer.
  .refine((values) => values.password === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email,
});
export type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

/** L'email saisi par l'utilisateur, pour l'ecran d'attente apres envoi. */
export type ForgotPasswordResult = {
  /** Toujours vrai : on ne revele jamais si l'adresse existe. */
  sent: true;
  email: string;
};
