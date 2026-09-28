"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/supabase/queries";
import { isAdminRole, isStaffRole } from "@/lib/constants";
import type { ArticleFormInput } from "@/lib/validation/catalogue";
import { articleFormSchema, fieldErrorsOf } from "@/lib/validation/catalogue";

/**
 * Actions de gestion du catalogue.
 *
 * Autorisations — elles dupliquent volontairement deux policies RLS
 * (migration 001) :
 *   - creation     : « articles: creation par le personnel »             -> app_is_staff()
 *   - modification : « articles: modification par l'admin du pressing »   -> app_is_pressing_admin()
 *
 * L'objectif n'est pas de remplacer la base (elle reste l'autorite) mais de
 * rendre un refus LISIBLE : sans ce garde-fou, un caissier qui soumet le
 * formulaire recevrait « new row violates row-level security policy ».
 */

export interface CatalogueActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

/** Traduit une erreur Postgres en message utilisable. */
function describeError(message: string): string {
  if (message.includes("articles_pressing_name_wash_uk")) {
    return "Un article porte déjà ce nom pour ce type de lavage.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Votre rôle ne permet pas cette modification.";
  }
  if (message.includes("check constraint") || message.includes("char_length")) {
    return "Une valeur est hors des bornes autorisées.";
  }
  return "Enregistrement impossible. Réessayez.";
}

function revalidateCatalogue() {
  revalidatePath("/catalogue");
  // Le catalogue alimente la prise de commande et les indicateurs tarifaires.
  revalidatePath("/orders/new");
  revalidatePath("/dashboard");
}

/** Verifie le pressing courant et le role minimal demande. */
async function guard(adminOnly: boolean) {
  const { db, pressing, profile } = await getContext();

  if (!pressing) {
    return { error: "Aucun pressing n'est rattaché à ce compte.", db: null, pressing: null };
  }

  const role = profile?.role ?? null;
  const allowed = adminOnly ? isAdminRole(role) : isStaffRole(role);

  if (!allowed) {
    return {
      error: adminOnly
        ? "Seul un gérant ou un responsable peut modifier le catalogue."
        : "Votre rôle ne permet pas cette action.",
      db: null,
      pressing: null,
    };
  }

  return { error: null, db, pressing };
}

/** Cree un article du catalogue. */
export async function createArticle(input: ArticleFormInput): Promise<CatalogueActionState> {
  const parsed = articleFormSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const { error: guardError, db, pressing } = await guard(false);
  if (guardError || !db || !pressing) return { error: guardError ?? "Action impossible." };

  const { error } = await db.from("articles").insert({
    pressing_id: pressing.id,
    name: parsed.data.name,
    category: parsed.data.category,
    wash_type: parsed.data.washType,
    price: parsed.data.price,
    estimated_hours: parsed.data.estimatedHours,
    description: parsed.data.description,
    is_active: parsed.data.isActive,
  });

  if (error) return { error: describeError(error.message) };

  revalidateCatalogue();
  return { success: true };
}

/** Met a jour un article existant. */
export async function updateArticle(
  articleId: string,
  input: ArticleFormInput,
): Promise<CatalogueActionState> {
  const parsed = articleFormSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const { error: guardError, db, pressing } = await guard(true);
  if (guardError || !db || !pressing) return { error: guardError ?? "Action impossible." };

  // La RLS filtre deja sur le pressing courant ; on verifie quand meme que
  // l'article appartient bien a CE pressing avant d'ecrire.
  const { data: existing } = await db
    .from("articles")
    .select("pressing_id")
    .eq("id", articleId)
    .maybeSingle();

  if (!existing || existing.pressing_id !== pressing.id) {
    return { error: "Article introuvable pour ce pressing." };
  }

  const { error } = await db
    .from("articles")
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      wash_type: parsed.data.washType,
      price: parsed.data.price,
      estimated_hours: parsed.data.estimatedHours,
      description: parsed.data.description,
      is_active: parsed.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", articleId);

  if (error) return { error: describeError(error.message) };

  revalidatePath(`/catalogue/${articleId}`);
  revalidateCatalogue();
  return { success: true };
}

/** Active ou desactive un article sans passer par le formulaire complet. */
export async function toggleArticle(
  articleId: string,
  isActive: boolean,
): Promise<CatalogueActionState> {
  const { error: guardError, db } = await guard(true);
  if (guardError || !db) return { error: guardError ?? "Action impossible." };

  const { error } = await db
    .from("articles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", articleId);

  if (error) return { error: describeError(error.message) };

  revalidateCatalogue();
  return { success: true };
}

/**
 * Supprime definitivement un article.
 *
 * Sans danger pour l'historique : `order_items.article_id` est en
 * `on delete set null` et chaque ligne conserve un instantane
 * `article_name` + `unit_price` (migration 001). Les commandes passees
 * restent donc intactes, et les rapports continuent de nommer l'article.
 */
export async function deleteArticle(articleId: string): Promise<CatalogueActionState> {
  const { error: guardError, db } = await guard(true);
  if (guardError || !db) return { error: guardError ?? "Action impossible." };

  const { error } = await db.from("articles").delete().eq("id", articleId);
  if (error) return { error: describeError(error.message) };

  revalidateCatalogue();
  return { success: true };
}

