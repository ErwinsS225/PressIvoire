/**
 * SERVEUR UNIQUEMENT. Résout le plan effectif du pressing et les compteurs
 * d'usage qui servent à décider si une capacité est encore disponible.
 *
 * Le plan affiché vient de `pressings.subscription_plan`, mais c'est
 * `pressings.subscription_expires_at` qui décide s'il est *appliqué* : un
 * abonnement arrivé à échéance retombe sur `free`, sans changer la valeur
 * stockée (l'historique reste lisible, et un renouvellement la réactive).
 */

import { getContext } from "@/lib/supabase/queries";
import {
  isPlanActive,
  resolvePlan,
  type Plan,
  type PlanId,
  type PlanLimits,
} from "@/lib/plans";

/** Plan effectivement applicable, expiration prise en compte. */
export interface EffectivePlan {
  plan: Plan;
  /** `false` si l'abonnement est échu : les capacités retombent sur celles du free. */
  isActive: boolean;
  /** Plan affiché dans l'interface, même échu — pour afficher « Pro · expiré ». */
  storedPlanId: PlanId;
  limits: PlanLimits;
}

/** Plan applicable du pressing courant, ou `null` s'il n'y a pas de pressing. */
export async function getEffectivePlan(): Promise<EffectivePlan | null> {
  const { pressing } = await getContext();
  if (!pressing) return null;

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

/** Commandes déjà créées ce mois-ci par le pressing. */
export async function getMonthlyOrderCountForPlan(
  pressingId: string,
): Promise<number> {
  const { db } = await getContext();

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
 */
export async function canCreateOrder(): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  planName: string;
}> {
  const context = await getEffectivePlan();
  if (!context) {
    return { allowed: false, used: 0, limit: 0, planName: "—" };
  }

  const { pressing } = await getContext();
  if (!pressing) {
    return { allowed: false, used: 0, limit: 0, planName: "—" };
  }

  const used = await getMonthlyOrderCountForPlan(pressing.id);
  const limit = context.limits.ordersPerMonth;

  // `null` = illimité.
  if (limit === null) {
    return { allowed: true, used, limit, planName: context.plan.name };
  }

  return {
    allowed: used < limit,
    used,
    limit,
    planName: context.plan.name,
  };
}
