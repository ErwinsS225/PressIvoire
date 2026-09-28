/**
 * GESTION DE L'EQUIPE — SERVEUR UNIQUEMENT.
 *
 *
 * Volontairement dans un module separe de `queries.ts` : la gestion d'équipe
 * n'est pas de la lecture de données de gestion, et son autorisation est
 * particulière — les écritures passent par des fonctions `SECURITY DEFINER`
 * (migration 006), pas par PostgREST.
 */

import { revalidatePath } from "next/cache";

import { getContext } from "@/lib/supabase/queries";

/** Membre de l'équipe, tel que renvoyé par la policy RLS. */
export interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Liste les membres de l'équipe du pressing courant.
 *
 * La policy « profiles: lecture soi-meme ou co-equipier » renvoie déjà les
 * comptes du même pressing : aucun filtre supplémentaire n'est nécessaire —
 * et surtout PAS de filtre `is_active`, car un gérant doit VOIR les comptes
 * désactivés pour pouvoir les réactiver.
 *
 * Tri : propriétaire, puis admins, puis le reste. C'est l'ordre de décision
 * d'un gérant (« qui gère, qui encaisse, qui livre »).
 */
export async function getTeam(): Promise<TeamMember[]> {
  const { db, pressing } = await getContext();
  if (!pressing) return [];

  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, role, phone, email, is_active, created_at")
    .eq("pressing_id", pressing.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erreur lecture équipe :", error);
    return [];
  }

  const weight = (role: string) =>
    role === "owner" ? 0 : role === "manager" ? 1 : role === "cashier" ? 2 : 3;

  return ((data ?? []) as TeamMember[]).sort(
    (a, b) => weight(a.role) - weight(b.role),
  );
}

/**
 * Effectif EMBAUCHÉ, pour le quota du plan.
 *
 * Le propriétaire n'est PAS compté : le quota porte sur les employés qu'on
 * recrute (responsable, caissier, livreur). Le compter ferait qu'un pressing
 * gratuit n'aurait le droit d'embaucher personne d'autre que son gérant.
 */
export async function countHiredStaff(pressingId: string): Promise<number> {
  const { db } = await getContext();

  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("pressing_id", pressingId)
    .in("role", ["manager", "cashier", "driver"])
    .is("deleted_at", null);

  return count ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Écritures                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * Ces trois fonctions appellent les fonctions SQL de la migration 006, et
 * non PostgREST directement : les policies RLS de 001 n'autorisent un profil
 * qu'à s'écrire LUI-MÊME, donc un INSERT/UPDATE depuis la session de
 * l'utilisateur serait refusé. Les fonctions SQL sont `SECURITY DEFINER` et
 * revalident elles-mêmes que l'appelant administre le pressing visé.
 */

export async function addTeamMember(
  pressingId: string,
  userId: string,
  role: string,
  fullName: string,
  phone: string | null,
): Promise<{ error?: string }> {
  const { db } = await getContext();

  const { error } = await db.rpc("add_team_member", {
    p_pressing_id: pressingId,
    p_user_id: userId,
    p_role: role,
    p_full_name: fullName,
    // `p_phone` est optionnel dans la signature generee (equivalent du
    // `default null` SQL). On ne l'envoie que s'il existe : `null` ferait
    // echouer le typage, et surtout n'apporterait rien de plus que l'absence.
    ...(phone ? { p_phone: phone } : {}),
  });

  if (error) return { error: describeTeamError(error.message) };
  revalidatePath("/equipe");
  return {};
}

export async function updateTeamMember(
  pressingId: string,
  userId: string,
  role: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const { db } = await getContext();

  const { error } = await db.rpc("update_team_member", {
    p_pressing_id: pressingId,
    p_user_id: userId,
    p_role: role,
    p_is_active: isActive,
  });

  if (error) return { error: describeTeamError(error.message) };
  revalidatePath("/equipe");
  return {};
}

export async function removeTeamMember(
  pressingId: string,
  userId: string,
): Promise<{ error?: string }> {
  const { db } = await getContext();

  const { error } = await db.rpc("remove_team_member", {
    p_pressing_id: pressingId,
    p_user_id: userId,
  });

  if (error) return { error: describeTeamError(error.message) };
  revalidatePath("/equipe");
  return {};
}

/**
 * Traduit les exceptions Postgres en messages affichables.
 *
 * On ne renvoie jamais le message brut : il peut exposer des détails de
 * schéma, et il serait en anglais pour un gérant ivoirien.
 */
/** Exporte pour que la Server Action puisse traduire les exceptions. */
export function describeTeamError(message: string): string {
  if (message.includes("Seul un gerant")) {
    return "Seul un gérant ou un responsable peut gérer l'équipe.";
  }
  if (message.includes("Role invalide")) {
    return "Ce rôle n'est pas valide pour un employé.";
  }
  if (message.includes("deja rattache")) {
    return "Ce compte est déjà rattaché à un autre pressing.";
  }
  if (message.includes("Compte inexistant") || message.includes("Profil inexistant")) {
    return "Ce compte n'existe pas. Demandez d'abord à la personne de s'inscrire.";
  }
  if (message.includes("Employe introuvable")) {
    return "Ce membre ne fait pas partie de votre pressing.";
  }
  if (message.includes("proprietaire")) {
    return "Le propriétaire du pressing ne peut pas être modifié ni retiré.";
  }
  if (message.includes("Reactivez")) {
    return "Réactivez le compte avant de lui attribuer un rôle.";
  }
  return "Action impossible. Réessayez.";
}
