/**
 * SERVEUR UNIQUEMENT. Résout le plan effectif du pressing et les compteurs
 * d'usage qui servent à décider si une capacité est encore disponible.
 *
 * Le plan affiché vient de `pressings.subscription_plan`, mais c'est
 * `pressings.subscription_expires_at` qui décide s'il est *appliqué* : un
 * abonnement arrivé à échéance retombe sur `free`, sans changer la valeur
 * stockée (l'historique reste lisible, et un renouvellement la réactive).
 */

import { getContext, type AppContext } from "@/lib/supabase/queries";
import {
  isPlanActive,
  resolvePlan,
  type Plan,
  type PlanId,
  type PlanLimits,
} from "@/lib/plans";

/**
 * SERVEUR UNIQUEMENT. Résout le plan effectif du pressing et les compteurs
 * d'usage qui servent à décider si une capacité est encore disponible.
 *
 * Le plan affiché vient de `pressings.subscription_plan`, mais c'est
 * `pressings.subscription_expires_at` qui décide s'il est *appliqué* : un
 * abonnement arrivé à échéance retombe sur `free`, sans changer la valeur
 * stockée (l'historique reste lisible, et un renouvellement la réactive).
 *
 * ## Pourquoi les fonctions prennent un `context` en parametre
 *
 * `getContext()` coute deux requetes Supabase (`auth.getUser` + lecture de
 * `profiles`, puis `pressings`). Appeler ces fonctions sans contexte impose de
 * le refaire, alors que la page appelante le possede deja.
 *
 * Le layout `(app)` en fait le pire cas : il lisait le contexte pour sa garde,
 * puis `getEffectivePlan()` le relisait, puis `getMonthlyOrderCountForPlan()`
 * le relisait encore — trois lectures, six requetes, pour une seule page. Le
 * commentaire du layout annonçait pourtant « une seule lecture du contexte ».
 *
 * D'ou le parametre : il est OPTIONNEL, donc aucun appelant n'est oblige de
 * changer, mais un appelant qui a deja le contexte le transmet et divise son
 * trafic par trois.
 */

/** Colonnes de `pressings` qui suffisent à décider du plan. */
export type PlanBearingPressing = Pick<
  NonNullable<AppContext["pressing"]>,
  "subscription_plan" | "subscription_expires_at"
>;

/** Plan effectivement applicable, expiration prise en compte. */
export interface EffectivePlan {
  plan: Plan;
  /** `false` si l'abonnement est échu : les capacités retombent sur celles du free. */
  isActive: boolean;
  /** Plan affiché dans l'interface, même échu — pour afficher « Pro · expiré ». */
  storedPlanId: PlanId;
  limits: PlanLimits;
}

/**
 * Plan applicable à un pressing deja chargé — fonction PURE.
 *
 * Aucun accès réseau : elle est donc testable, et le layout comme les pages
 * peuvent l'appeler sur le contexte qu'ils possèdent déjà.
 */
export function resolveEffectivePlan(
  pressing: PlanBearingPressing,
): EffectivePlan {
  const active = isPlanActive(
    pressing.subscription_plan,
    pressing.subscription_expires_at,
  );
  const stored = resolvePlan(pressing.subscription_plan);
  const plan = active ? stored : resolvePlan("free");

  return {
    plan,
    isActive: active,
    storedPlanId: stored.id,
    limits: plan.limits,
  };
}

/**
 * Plan applicable du pressing courant, ou `null` s'il n'y a pas de pressing.
 *
 * @param context contexte deja resolu, pour eviter une lecture de plus.
 */
export async function getEffectivePlan(
  context?: AppContext,
): Promise<EffectivePlan | null> {
  const { pressing } = context ?? (await getContext());
  if (!pressing) return null;

  return resolveEffectivePlan(pressing);
}

/** Commandes déjà créées ce mois-ci par le pressing. */
export async function getMonthlyOrderCountForPlan(
  pressingId: string,
  context?: AppContext,
): Promise<number> {
  const { db } = context ?? (await getContext());

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("pressing_id", pressingId)
    .gte("created_at", monthStart.toISOString());

  return count ?? 0;
}

/**
 * Le plan gratuit tient-il encore pour une nouvelle commande ?
 *
 * Renvoie `{ allowed: true }` si le quota est dépassé OU si le plan est
 * illimité — le message d'erreur est construit par l'appelant, qui connaît le
 * contexte à afficher.
 *
 * @param context contexte deja resolu. Sans lui, cette fonction lisait le
 *   contexte trois fois de suite (`getEffectivePlan`, `getContext`, puis
 *   `getMonthlyOrderCountForPlan`) pour en deduire le meme pressing a chaque
 *   fois — six requetes pour une reponse booleenne.
 */
export async function canCreateOrder(
  appContext?: AppContext,
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  planName: string;
}> {
  const resolved = appContext ?? (await getContext());
  const { pressing } = resolved;

  if (!pressing) {
    return { allowed: false, used: 0, limit: 0, planName: "—" };
  }

  const plan = resolveEffectivePlan(pressing);
  const used = await getMonthlyOrderCountForPlan(pressing.id, resolved);
  const limit = plan.limits.ordersPerMonth;

  // `null` = illimité.
  if (limit === null) {
    return { allowed: true, used, limit, planName: plan.plan.name };
  }

  return {
    allowed: used < limit,
    used,
    limit,
    planName: plan.plan.name,
  };
}
