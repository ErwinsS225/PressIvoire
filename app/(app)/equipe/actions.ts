"use server";

import { revalidatePath } from "next/cache";

import { addTeamMember, describeTeamError } from "@/lib/team";

/**
 * Server Action : rattacher un compte au pressing.
 *
 * Le formulaire est un composant client ; il ne peut donc pas appeler
 * `addTeamMember` (lib/team.ts) directement — ce module tire `next/headers`
 * via `getContext()`, ce qui echoue a la compilation dans un composant client.
 * L'Action est le pont : le client appelle cette fonction, elle execute le
 * code serveur, et renvoie un objet serialisable.
 */
export async function inviteMemberAction(
  pressingId: string,
  userId: string,
  role: string,
  fullName: string,
  phone: string | null,
): Promise<{ error?: string; success?: boolean }> {
  if (!pressingId || !userId) {
    return { error: "Données manquantes." };
  }

  try {
    const result = await addTeamMember(
      pressingId,
      userId,
      role,
      fullName,
      phone,
    );

    if (result.error) return { error: result.error };

    revalidatePath("/equipe");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    // Le message de l'exception est technique : on le traduit avant de le
    // renvoyer au navigateur.
    return {
      error: describeTeamError(
        error instanceof Error ? error.message : "Action impossible.",
      ),
    };
  }
}
