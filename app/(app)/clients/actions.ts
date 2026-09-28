"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/supabase/queries";

const ClientSchema = z.object({
  full_name: z.string().min(3, "Le nom complet est requis"),
  phone: z.string().optional(),
  email: z.string().email("L'email n'est pas valide").optional(),
  address: z.string().optional(),
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
  const { pressing } = await getContext();
  if (!pressing) {
    throw new Error("Aucun pressing n'est associé à votre compte.");
  }

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

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("clients").insert({
    ...validatedFields.data,
    pressing_id: pressing.id,
  });

  if (error) {
    return {
      errors: { _server: [error.message] },
    };
  }

  revalidatePath("/clients");
  return {
    message: "Client créé avec succès.",
  };
}
