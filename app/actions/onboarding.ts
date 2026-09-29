"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/supabase/queries";
import { onboardingPayloadSchema } from "@/lib/validation/onboarding";
import type { CatalogArticle } from "@/lib/validation/onboarding";
import type { Json } from "@/lib/supabase/types";
import { z } from "zod";

/**
 * Actions de l'onboarding gerant.
 *
 * L'ecriture passe par la fonction Postgres `complete_onboarding()` : une
 * seule transaction pour le pressing + le catalogue + l'abonnement. C'est
 * elle qui revalide l'identite de l'appelant — une Server Action ne peut
 * pas faire confiance au client sur ce point.
 */

export interface OnboardingState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function describePostgrestError(message: string): string {
  if (message.includes("Seul un gerant")) {
    return "Ce compte n'est pas un compte gerant.";
  }
  if (message.includes("deja termine")) {
    return "Votre pressing est deja configure.";
  }
  if (message.includes("Authentification requise")) {
    return "Session expiree. Reconnectez-vous.";
  }
  if (message.includes("catalogue")) {
    return "Catalogue invalide : au moins un article actif est requis.";
  }
  return "Creation du pressing impossible. Reessayez.";
}

/** Catalogue type, pour pre-remplir l'etape 2. */
export async function fetchReferenceCatalogue(): Promise<CatalogArticle[]> {
  const { db, userId } = await getContext();

  if (!userId) return [];

  const { data, error } = await db.rpc("get_reference_catalogue");
  if (error || !data) return [];

  // La fonction renvoie des cles snake_case ; on les mappe sur le type du
  // store, qui est en camelCase comme le reste du code applicatif.
  return (data as Record<string, unknown>[]).map((row) => ({
    name: String(row.name),
    category: row.category as CatalogArticle["category"],
    washType: row.wash_type as CatalogArticle["washType"],
    price: Number(row.price),
    estimatedHours: Number(row.estimated_hours),
    sortOrder: Number(row.sort_order),
    isActive: true,
  }));
}

/**
 * Finalise l'onboarding.
 *
 * Le payload est revalide integralement avant l'appel : le store client a pu
 * etre altere entre les etapes, et c'est la que se joue la coherence
 * (contrainte `total = subtotal + …`, unicite du nom par pressing, etc.).
 */
export async function completeOnboarding(
  _previous: OnboardingState,
  payload: unknown,
): Promise<OnboardingState> {
  const parsed = onboardingPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors)
        .filter(([, messages]) => messages?.length)
        .map(([key, messages]) => [key, (messages as string[])[0]]),
    );
    return {
      fieldErrors:
        Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { _form: parsed.error.issues[0]?.message ?? "Données invalides." },
    };
  }

  const data = parsed.data;

  /*
   * L'appel passe par `db` (type `AppDb`, cf. lib/supabase/queries), et non
   * par le client brut de `@supabase/ssr` : sur ce dernier, la surcharge
   * `.rpc()` est resolue avec un `Args` errone (`undefined`), ce qui obligeait
   * a un double cast. `AppDb.rpc` est type directement contre
   * `Database["public"]["Functions"]` : l'argument est verifie, plus besoin
   * de cast sur l'enveloppe.
   */
  const { db } = await getContext();

  /*
   * Transformation camelCase -> snake_case attendu par la fonction SQL.
   *
   * La fonction SQL `complete_onboarding(payload jsonb)` attend un unique
   * parametre NOMME `payload` (cf. migration 003 et types generes) : passer
   * `p_payload` ferait echouer l'appel PostgREST a l'execution.
   *
   * Le payload est declare `Json` directement, sans cast : l'annotation sur le
   * litteral d'objet suffit. Un cast `as unknown as Json` masquerait une vraie
   * incompatibilite (une `interface` sans index signature n'est PAS assignable
   * a `Json`) ; ici, tous les champs sont des litteraux ou des types a index
   * signature, donc l'assignation est verifiee par le compilateur.
   */
  const rpcPayload: Json = {
    pressing: {
      name: data.pressing.name,
      commune: data.pressing.commune,
      address: data.pressing.address,
      phone: data.pressing.phone,
      logo_url: data.pressing.logoUrl,
      opening_hours: data.pressing.openingHours,
      pickup_enabled: data.services.pickupEnabled,
      delivery_enabled: data.services.deliveryEnabled,
      delivery_fee: data.services.deliveryFee,
      delivery_fees_by_commune: data.services.deliveryFeesByCommune,
      default_delays_by_wash: data.services.defaultDelaysByWash,
    },
    articles: data.services.articles
      .filter((article) => article.isActive)
      .map((article) => ({
        name: article.name,
        category: article.category,
        wash_type: article.washType,
        price: article.price,
        estimated_hours: article.estimatedHours,
        sort_order: article.sortOrder,
        is_active: true,
      })),
    subscription: {
      plan: data.subscription.plan,
      trial: data.subscription.trial,
    },
  };

  const result = await db.rpc("complete_onboarding", { payload: rpcPayload });

  if (result.error) {
    return { error: describePostgrestError(result.error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Telechargement du logo de l'etape 1. Retourne l'URL publique. */
export async function uploadLogo(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Aucun fichier reçu." };
  }
  // Le bucket impose 2 Mo ; on verifie cote client aussi, pour ne pas
  // faire/upload une image de 4 Mo.
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Image trop lourde (2 Mo maximum)." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Format accepte : JPEG, PNG ou WebP." };
  }

  const { userId, pressing } = await getContext();
  if (!userId) return { error: "Session expirée." };

  const supabase = createClient();
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  // Respecte la convention RLS : <pressing_id>/... pour isoler les tenants
  const path = pressing
    ? `${pressing.id}/onboarding/logo.${extension}`
    : `onboarding/${userId}/logo.${extension}`;

  const { error } = await supabase.storage
    .from("pressing-assets")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) return { error: error.message };

  return {
    url: supabase.storage.from("pressing-assets").getPublicUrl(path).data
      .publicUrl,
  };
}
