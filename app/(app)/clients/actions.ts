"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/guards";

/**
 * Actions des clients.
 *
 * Autorisation : la policy « clients: creation par le personnel » ouvre
 * l'ecriture a TOUT le personnel (`app_is_staff()`), livreur compris. Le
 * controle de role vit dans `lib/guards.ts` ; la base reste l'autorite.
 */

/**
 * Le formulaire envoie `""` pour un champ laisse vide : on le ramene a
 * `undefined` pour que « pas d'email » reste une absence, et non une chaine
 * qui echoue au format. Sans cela, creer un client sans email — le cas le plus
 * courant — echouait en silence.
 */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const ClientSchema = z.object({
  full_name: z.string().min(3, "Le nom complet est requis"),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(
    emptyToUndefined,
    z.string().email("L'email n'est pas valide").optional(),
  ),
  address: z.preprocess(emptyToUndefined, z.string().optional()),
});

/** Etat de retour de la creation d'un client, consomme par `useFormState`. */
export type ClientActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

/**
 * Wrapper `useFormState`.
 *
 * L'action ci-dessous ne prend qu'un `FormData`, alors que `useFormState`
 * attend une signature `(previousState, formData)`. Sans ce wrapper, React
 * passe l'etat precedent a la place du FormData et la validation lit un
 * objet vide.
 *
 * On ne modifie pas l'action elle-meme : elle reste appelable directement et
 * sa signature simple reste correcte cote serveur.
 */
export async function createClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  return createClient(formData);
}

export async function createClient(formData: FormData) {
  /*
   * Le role est verifie AVANT la validation : une Server Action est un point
   * d'entree HTTP public. Renvoyer d'abord les erreurs de champ reviendrait a
   * laisser un compte non autorise sonder le formulaire.
   */
  const guard = await requireStaff("de créer un client");
  if (!guard.ok) {
    return { errors: { _server: [guard.error] } };
  }

  const { db, pressing } = guard.context;

  const validatedFields = ClientSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await db.from("clients").insert({
    ...validatedFields.data,
    pressing_id: pressing.id,
  });

  if (error) {
    return {
      errors: { _server: [describeClientError(error.message)] },
    };
  }

  revalidatePath("/clients");
  return {
    message: "Client créé avec succès.",
  };
}

/**
 * Traduit une erreur Postgres en message utilisable.
 *
 * On ne renvoie jamais le message brut : il est en anglais, nomme des
 * contraintes, et ne dit rien a un gerant ivoirien.
 */
function describeClientError(message: string): string {
  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Votre rôle ne permet pas cette action.";
  }
  if (message.includes("char_length")) {
    return "Une valeur est hors des bornes autorisées.";
  }
  return "Enregistrement impossible. Réessayez.";
}
