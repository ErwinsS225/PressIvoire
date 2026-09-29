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
    /*
     * Mot de passe actuel : facultatif dans le schema, mais CONTROLE par
     * l'action des qu'il est fourni. Le schema seul ne peut pas l'exiger :
     * l'action reste ainsi utilisable meme si un appel ne fournit pas cette
     * information. Voir `updatePassword()`.
     */
    currentPassword: z.string().optional(),
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

/* -------------------------------------------------------------------------- */
/* Detection d'un compte deja existant (migration 009)                        */
/* -------------------------------------------------------------------------- */

/** Ce que la base sait d'un email / numero saisi a l'inscription. */
export interface AccountProbe {
  emailTaken: boolean;
  phoneTaken: boolean;
  hasPressing: boolean;
}

/**
 * Traduit le resultat de `account_exists()` en message(s) affiche(s).
 *
 * Fonction PURE, volontairement : c'est la partie qui contient les arbitrages
 * — quel champ pointer, quoi dire, dans quel cas proposer la connexion — donc
 * c'est elle qu'il faut pouvoir tester sans base ni reseau.
 *
 * ⚠ Ce que cette fonction NE fait pas : reveler si un email ou un numero
 * existe precisement. Elle dit « un compte existe deja » sans dire a QUOI il
 * correspond, et ne nomme jamais le compte trouve. Un attaquant pourrait sinon
 * s'en servir pour enumerer les gerants inscrits a partir d'une liste d'emails.
 *
 * `hasPressing` est le cas important : c'est celui de l'utilisateur qui a
 * configure son pressing puis s'est inscrit avec une autre adresse, et qui
 * decouvrira en fin de parcours qu'il tourne en rond. Le message doit donc
 * designer la sortie — se connecter — sinon il refersit l'onboarding pour rien.
 */
export function describeExistingAccount(probe: AccountProbe): {
  error?: string;
  fieldErrors?: Record<string, string>;
} {
  /*
   * Le type de retour est explicitement annonce plutot que laisse a l'inference
   * : l'union des quatre cas « un seul champ » / « deux champs » ne se
   * replie pas sur `Record<string, string>` (une propriete absente y serait
   * typee `undefined`). Chaque branche est donc construite explicitement.
   */
  const NO_ERRORS: { error?: string; fieldErrors?: Record<string, string> } =
    {};
  const NO_FIELDS: Record<string, string> | undefined = undefined;

  // Cas le plus specifique d'abord : un pressing deja configure merite un
  // message dedie, sinon l'utilisateur croit devoir refaire son onboarding.
  if (probe.hasPressing) {
    return {
      error:
        "Un pressing est déjà rattaché à ce numéro de téléphone. Connectez-vous à votre compte existant, ou utilisez un autre numéro.",
      fieldErrors: NO_FIELDS,
    };
  }

  // L'email est l'identifiant de connexion par defaut : c'est le champ le
  // plus utile a corriger, on le pointe en premier.
  if (probe.emailTaken && probe.phoneTaken) {
    return {
      error: "Un compte existe déjà avec cet email et ce numéro.",
      fieldErrors: { email: "Email déjà utilisé.", phone: "Numéro déjà utilisé." },
    };
  }

  if (probe.emailTaken) {
    return {
      error: "Un compte existe déjà avec cet email. Connectez-vous.",
      fieldErrors: { email: "Email déjà utilisé." },
    };
  }

  if (probe.phoneTaken) {
    return {
      error: "Un compte existe déjà avec ce numéro de téléphone. Connectez-vous, ou utilisez un autre numéro.",
      fieldErrors: { phone: "Numéro déjà utilisé." },
    };
  }

  return NO_ERRORS;
}

/* -------------------------------------------------------------------------- */
/* Age d'un compte sans pressing                                                */
/* -------------------------------------------------------------------------- */

/**
 * En dessous de ce delai, un compte sans pressing est une inscription en cours.
 *
 * Le parcours d'onboarding compte trois etapes, se remplit tranquillement,
 * et peut etre interrompu. Passer cette frontiere sans avoir de pressing ne
 * prouve donc rien de anormal : l'utilisateur a pu s'eloigner de l'ecran et y
 * revenir. Au-dela, en revanche, on est dans le cas decrit au point 2 : un
 * compte qui revient et ne comprend pas pourquoi il est renvoye vers un
 * parcours qu'il pense avoir deja fait.
 *
 * Une heure est un compromis : assez long pour ne pas harceler un utilisateur
 * qui hesite, assez court pour attraper un blocage de l lendemain.
 */
export const FRESH_ACCOUNT_MINUTES = 60;

/** Le compte est-il encore dans sa fenetre d'inscription ? */
export function isFreshAccount(
  createdAt: string,
  now: number = Date.now(),
): boolean {
  const created = Date.parse(createdAt);

  // Date illisible : on ne peut rien affirmer, donc on ne suppose pas le
  // blocage. L'utilisateur voit le parcours normal.
  if (Number.isNaN(created)) return true;

  const ageMs = now - created;

  // Date dans le futur (decalage d'horloge, import errone) : on la traite
  // comme fraiche plutot que d'afficher un avertissement injustifie.
  if (ageMs <= 0) return true;

  return ageMs < FRESH_ACCOUNT_MINUTES * 60_000;
}

/**
 * Message d'aide pour un compte ancien bloque sans pressing.
 *
 * ⚠ Ce texte ne doit jamais nommer un pressing ni un email : l'ecran est rendu
 * a un utilisateur connecte, mais il peut aussi etre copie-colle. On se limite
 * donc a designer la sortie.
 */
export const STUCK_ACCOUNT_HELP =
  "Votre compte n'est rattaché à aucun pressing. Si vous avez déjà configuré un pressing avec une autre adresse e-mail, connectez-vous avec cette adresse : vos données vous attendent.";

/** L'email d'inscription, pour l'ecran d'attente apres envoi. */
export type ForgotPasswordResult = {
  /** Toujours vrai : on ne revele jamais si l'adresse existe. */
  sent: true;
  email: string;
};
