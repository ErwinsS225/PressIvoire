/**
 * GARDES D'AUTORISATION DES SERVER ACTIONS — SERVEUR UNIQUEMENT.
 *
 * ⚠ Ne jamais importer depuis un composant "use client" : ce module tire
 * `next/headers` par `getContext()`.
 *
 * ## Pourquoi ces gardes existent alors que le RLS fait deja le travail
 *
 * Une Server Action est un point d'entree HTTP public : elle est appelable
 * sans passer par l'interface. Sans controle de role, un caissier qui soumet
 * le formulaire d'edition du catalogue recevrait « new row violates row-level
 * security policy » — un message en anglais, technique, qui ne dit ni ce qui
 * est interdit ni a qui.
 *
 * Le role est donc verifie ICI, avant l'ecriture, pour rendre le refus
 * LISIBLE. La base reste l'autorite : ces fonctions ne remplacent pas les
 * policies, elles les precedent. Une policy durcie reste le filet.
 *
 * Cote interface, la meme decision est prise avec `isStaffRole` /
 * `isAdminRole` (lib/constants.ts) pour masquer ce que la base refusera.
 */

import { getContext, type AppContext } from "@/lib/supabase/queries";
import { isAdminRole, isStaffRole } from "@/lib/constants";

/**
 * Contexte garanti : le compte est rattache a un pressing.
 *
 * `pressing` est non-nullable — c'est tout l'interet du garde : le code
 * appelant n'a plus a re-verifier `if (!pressing)` ni a rediriger.
 */
export interface GuardedContext {
  db: AppContext["db"];
  pressing: NonNullable<AppContext["pressing"]>;
  profile: AppContext["profile"];
  userId: string | null;
}

/** Soit un contexte exploitable, soit un message affichable tel quel. */
export type GuardResult =
  | { ok: true; context: GuardedContext }
  | { ok: false; error: string };

/**
 * Verifie le pressing courant et le role minimal demande.
 *
 * `complement` est insere TEL QUEL dans la phrase : on y met le groupe verbal
 * complet, preposition incluse (« de modifier cette commande »), pour que le
 * message reste correct en francais dans chaque appel.
 */
async function requireRole(
  level: "staff" | "admin",
  complement: string,
): Promise<GuardResult> {
  const context = await getContext();

  // Session valide mais aucun pressing : l'onboarding n'est pas termine. On ne
  // teste meme pas le role — sans pressing, il n'y a rien a autoriser.
  if (!context.pressing) {
    return { ok: false, error: "Aucun pressing n'est rattaché à ce compte." };
  }

  const role = context.profile?.role ?? null;
  const allowed = level === "admin" ? isAdminRole(role) : isStaffRole(role);

  if (!allowed) {
    return {
      ok: false,
      error:
        level === "admin"
          ? `Seul un gérant ou un responsable peut ${complement}.`
          : `Votre rôle ne permet pas ${complement}.`,
    };
  }

  return {
    ok: true,
    context: {
      db: context.db,
      pressing: context.pressing,
      profile: context.profile,
      userId: context.userId,
    },
  };
}

/**
 * Role minimal : le personnel du pressing (`app_is_staff()`).
 *
 * owner, manager, cashier, driver — c'est-a-dire tout le monde SAUF un client.
 * A utiliser pour les ecritures ouvertes a la caisse : commandes, clients.
 */
export function requireStaff(complement = "cette action"): Promise<GuardResult> {
  return requireRole("staff", complement);
}

/**
 * Role minimal : l'administration du pressing (`app_is_pressing_admin()`).
 *
 * owner et manager uniquement. A utiliser pour ce qui engage le pressing et
 * pas seulement la journee : catalogue, equipe, reglages.
 */
export function requireAdmin(
  complement = "effectuer cette action",
): Promise<GuardResult> {
  return requireRole("admin", complement);
}
