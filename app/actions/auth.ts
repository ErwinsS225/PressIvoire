"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveDestination } from "@/lib/routing";
import { createClient } from "@/lib/supabase/server";
import { normalizeIvorianPhone, safeRedirectPath } from "@/lib/utils";
import {
  describeExistingAccount,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type RegisterValues,
} from "@/lib/validation/auth";

/**
 * Actions d'authentification.
 *
 * Elles utilisent le client serveur (@supabase/ssr) : la session est ecrite
 * dans les cookies httpOnly, jamais en localStorage — donc inaccessible au
 * JavaScript de la page.
 */

export interface ActionState {
  /** Message affichable tel quel (français). */
  error?: string;
  /** Erreurs champ par champ, affichees sous les inputs. */
  fieldErrors?: Record<string, string>;
  /** Message de succes (ex : email de confirmation envoye). */
  success?: string;
}

/*
 * Traduction des erreurs Supabase en messages comprensibles.
 *
 * Les cles correspondent au TEXTE RECU de l'API, pas au nom technique de
 * l'erreur : Supabase renvoie "Invalid login credentials" (avec des espaces)
 * alors que son `error_code` vaut `invalid_credentials`. Chercher
 * "InvalidLoginCredentials" ne trouvait donc jamais rien, et tout retombait sur
 * le message generique - l'utilisateur lisait « Reessayez » alors que ses
 * identifiants etaient simplement faux.
 *
 * L'ordre compte : `includes` est large, donc les motifs les plus specifiques
 * doivent passer avant les generiques.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentification — libelles exacts renvoyes par GoTrue.
  "Invalid login credentials": "Email, téléphone ou mot de passe incorrect.",
  "Email not confirmed": "Confirmez votre email avant de vous connecter.",
  "User already registered": "Un compte existe déjà avec cet email.",
  /*
   * Refus du trigger de doublons (migration 009).
   *
   * Il ne se produit QUE si `account_exists()` a repondu « rien » puis qu'une
   * autre inscription a occupe le numero entre-temps — deux inscriptions
   * simultanees. Le message est donc identique a celui du formulaire, et
   * surtout propose la meme sortie : sans cela, l'utilisateur se retrouverait
   * devant un message de base technique, le meme piege qui l'amenait ici.
   */
  "Ce numero de telephone est deja rattache a un compte.":
    "Ce numéro de téléphone est déjà rattaché à un compte. Connectez-vous, ou utilisez un autre numéro.",
  "Password should be at least":
    "Mot de passe trop court (8 caractères et 1 chiffre minimum).",
  "New password should be different":
    "Le nouveau mot de passe doit être différent de l'ancien.",
  "Auth session missing": "Votre session a expiré. Reconnectez-vous.",
  "Token has expired or is invalid":
    "Ce lien a expiré. Demandez-en un nouveau.",

  // Rate limiting — les cles reelles contiennent « rate limit ».
  "rate limit": "Trop de tentatives. Réessayez dans quelques minutes.",
  "Email rate limit": "Trop d'emails envoyés. Réessayez plus tard.",

  // Reseau et service d'envoi.
  "Failed to fetch": "Connexion impossible. Vérifiez votre réseau.",
  "Email address": "Adresse email refusée par le service d'envoi.",
  "Error sending magic link":
    "Service d'envoi indisponible. Vérifiez la configuration SMTP du projet.",

  /*
   * Telephone.
   *
   * Distinct de « Invalid login credentials » : l'echec ne vient pas des
   * identifiants saisis mais de la configuration du projet Supabase, ou la
   * connexion par telephone est desactivee par defaut. Sans cette cle, on
   * affichait « Email, téléphone ou mot de passe incorrect » et l'utilisateur
   * retapait son mot de passe alors que rien n'aurait jamais abouti.
   */
  phone_provider_disabled:
    "La connexion par téléphone n'est pas activée sur ce projet. Utilisez votre email.",
  "Phone logins are disabled":
    "La connexion par téléphone n'est pas activée sur ce projet. Utilisez votre email.",
};

/**
 * URL publique de l'application, sans barre oblique finale.
 *
 * Une seule source de verite pour tous les liens envoyes par email (confirmation
 * de compte, reinitialisation). Si la variable est absente, on retombe sur
 * l'hote de developpement plutot que de produire un lien relatif invalide.
 */
function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    // En developpement, on peut se rabattre sur localhost.
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000";
    }
    // En production, c'est une erreur de configuration critique.
    throw new Error(
      "La variable d'environnement NEXT_PUBLIC_APP_URL est manquante. Le lien de reinitialisation ne peut pas etre genere.",
    );
  }
  return url.replace(/\/$/, "");
}

/** Traduit une erreur Supabase en message comprehensible, sans rien divulguer. */
function translateError(message: string): string {
  for (const [needle, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(needle)) return friendly;
  }
  return "Une erreur est survenue. Reessayez.";
}

/** { field: [msg, ...] } -> { field: msg } : on n'affiche que le premier. */
function firstErrors(
  flatten: Record<string, string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(flatten)
      .filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].length > 0,
      )
      .map(([key, messages]) => [key, messages[0]]),
  );
}

/* -------------------------------------------------------------------------- */
/* Connexion                                                                    */
/* -------------------------------------------------------------------------- */
/* Connexion                                                                    */
/* -------------------------------------------------------------------------- */

export async function signIn(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = createClient();

  /*
   * Email ou telephone : `signInWithPassword` attend EXCLUSIVEMENT l'un ou
   * l'autre dans des champs distincts. Passer un numero dans `email` ne peut
   * donc jamais aboutir — l'UI annonçait « Email ou téléphone » alors que le
   * telephone etait rejete silencieusement. On route desormais chaque
   * identifiant vers le bon champ.
   */
  const raw = parsed.data.identifier.trim();
  const isEmail = raw.includes("@");

  const { data, error } = isEmail
    ? await supabase.auth.signInWithPassword({
        email: raw.toLowerCase(),
        password: parsed.data.password,
      })
    : await supabase.auth.signInWithPassword({
        phone: normalizeIvorianPhone(raw),
        password: parsed.data.password,
      });

  if (error) return { error: translateError(error.message) };
  if (!data.user) return { error: "Connexion impossible." };

  revalidatePath("/", "layout");

  /*
   * Retour a la page demandee apres connexion (le middleware y inscrit
   * `?redirect=`). Le chemin est filtre : il vient de l'URL, donc d'un tiers
   * capable de fabriquer un lien de phishing — sans ce controle, la page de
   * connexion redirigerait vers un site externe apres authentification.
   */
  redirect(safeRedirectPath(formData.get("redirect") as string | null));
}

/* -------------------------------------------------------------------------- */
/* Inscription                                                                  */
/* -------------------------------------------------------------------------- */

export async function signUp(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    role: formData.get("role"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const values: RegisterValues = parsed.data;
  const supabase = createClient();

  /*
   * Detection d'un compte deja existant, AVANT de creer quoi que ce soit.
   *
   * `signUp()` cree un compte Auth puis, via le trigger de la migration 002,
   * un profil. A ce stade il est trop tard : le doublon existe deja, et
   * l'utilisateur ne le decouvrira qu'a l'ecran d'onboarding, sans comprendre
   * pourquoi. On interroge donc la base d'abord.
   *
   * ⚠ Un echec de ce controle ne doit PAS bloquer l'inscription : si la
   * fonction est indisponible (migration 009 pas encore appliquee, reseau),
   * on continue comme avant. La migration 009 pose de toute facon la garde
   * definitive cote base — celle-ci n'est qu'un message clair, pas une
   * securite. Refuser de s'inscrire parce qu'un diagnostic a echoue serait
   * transformer un inconfort en indisponibilite.
   */
  const { data: probe, error: probeError } = await supabase.rpc(
    "account_exists",
    { p_email: values.email, p_phone: values.phone } as never,
  );

  if (!probeError && Array.isArray(probe) && probe[0]) {
    const row = probe[0] as unknown as {
      email_taken: boolean;
      phone_taken: boolean;
      has_pressing: boolean;
    };
    const known = describeExistingAccount({
      emailTaken: row.email_taken,
      phoneTaken: row.phone_taken,
      hasPressing: row.has_pressing,
    });

    if (known.error) {
      return { error: known.error, fieldErrors: known.fieldErrors };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      // Ces metadata sont lues par le trigger `handle_new_user()` pour
      // pre-remplir la ligne `profiles`.
      data: {
        role: values.role,
        full_name: values.fullName,
        phone: values.phone,
      },
      // Retour a l'application apres la confirmation de l'email.
      // `/auth/confirm` echange le jeton de confirmation contre une session,
      // puis renvoie vers la bonne destination : c'est une Route Handler, la
      // seule able d'ecrire des cookies hors Server Action.
      emailRedirectTo: `${getAppUrl()}/auth/confirm`,
    },
  });

  if (error) return { error: translateError(error.message) };

  // Confirmation d'email demandee : la session n'existe pas encore. Le compte
  // est cree mais inactif. On redirige vers une page intermediaire.
  if (data.user && !data.session) {
    redirect(`/auth/check-email?email=${encodeURIComponent(values.email)}`);
  }

  revalidatePath("/", "layout");

  /*
   * Destination d'apres inscription : la meme fonction centrale que le layout
   * et les ecrans d'onboarding. On ne reapplique donc pas une regle ecrite a
   * la main ici — c'etait une occasion de diverger de plus.
   *
   * Le compte vient d'etre cree : il n'a ni pressing (`hasPressing: false`),
   * donc le role suffit a trancher entre les deux parcours.
   */
  redirect(
    resolveDestination({
      userId: data.user?.id ?? null,
      role: values.role,
      hasPressing: false,
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Mot de passe oublié                                                          */
/* -------------------------------------------------------------------------- */

export async function requestPasswordReset(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      // Le lien de l'email ouvre `/auth/reset-password` : c'est une Route
      // Handler, seule able d'ecrire les cookies de session hors Server Action.
      // Elle echange le code PKCE puis redirige vers l'ecran de saisie du
      // nouveau mot de passe.
      redirectTo: `${getAppUrl()}/auth/reset-password`,
    },
  );

  if (error) return { error: translateError(error.message) };

  // Reponse identique que l'adresse existe ou non : on ne revele pas
  // quels emails sont enregistres.
  return {
    success:
      "Si un compte existe pour cette adresse, un lien de reinitialisation vient d'etre envoye.",
  };
}

/* -------------------------------------------------------------------------- */
/* Réinitialisation du mot de passe                                             */
/* -------------------------------------------------------------------------- */

export async function updatePassword(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = createClient();

  /*
   * Verification du mot de passe actuel, lorsqu'il est fourni.
   *
   * L'ecran de reinitialisation (`/(auth)/reset-password`) le demande. Le
   * schema le laisse toutefois facultatif : on applique donc le controle dans
   * la mesure ou l'information est disponible, sans rendre l'action
   * inutilisable depuis un appel qui ne le fournirait pas.
   *
   * Rappel de la raison : un lien de reinitialisation transite par la boite
   * mail, qui n'est pas un canal sur. Exiger le mot de passe actuel — quand on
   * le possede — empeche qu'un lien intercepte suffise a prendre le compte.
   *
   * On ne clot PAS la session a cette etape : la session de recovery reste en
   * place, donc l'utilisateur peut ressaisir son mot de passe sans repasser
   * par sa boite mail.
   */
  if (parsed.data.currentPassword) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return {
        error:
          "Lien de réinitialisation invalide ou expiré. Demandez-en un nouveau.",
      };
    }

    const { error: checkError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });

    if (checkError) {
      return { fieldErrors: { currentPassword: "Mot de passe actuel incorrect." } };
    }
  }

  // La session de type "recovery" (issue du lien de l'email) autorise
  // directement la mise a jour du mot de passe.
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    // Si le lien a expire, on affiche un message clair.
    if (error.message.includes("Token has expired or is invalid")) {
      return {
        error:
          "Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau.",
      };
    }
    return { error: translateError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?password_reset=true");
}

/* -------------------------------------------------------------------------- */
/* Déconnexion                                                                  */
/* -------------------------------------------------------------------------- */

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
