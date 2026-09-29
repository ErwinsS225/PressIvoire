"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/guards";
import { addTeamMember, describeTeamError } from "@/lib/team";

/**
 * Server Action : rattacher un compte au pressing.
 *
 * Le formulaire est un composant client ; il ne peut donc pas appeler
 * `addTeamMember` (lib/team.ts) directement — ce module tire `next/headers`
 * via `getContext()`, ce qui echoue a la compilation dans un composant client.
 * L'Action est le pont : le client appelle cette fonction, elle execute le
 * code serveur, et renvoie un objet serialisable.
 *
 * Le role est controle ici, avant l'appel SQL : les fonctions de la
 * migration 006 sont `SECURITY DEFINER` et refuseraient deja l'ecriture, mais
 * leur message arriverait en termes de base. Le garde-fou dit simplement qui a
 * le droit de gerer l'equipe.
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

  const guard = await requireAdmin("gérer l'équipe");
  if (!guard.ok) return { error: guard.error };

  /*
   * `pressingId` vient du client : on verifie qu'il correspond bien au pressing
   * de la session, comme `getWritableClient` le fait pour les commandes. La
   * fonction SQL revalide de toute facon, mais l'erreur rendue ici est plus
   * claire qu'un refus de fonction `SECURITY DEFINER`.
   */
  if (guard.context.pressing.id !== pressingId) {
    return { error: "Pressing inconnu pour la session courante." };
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
