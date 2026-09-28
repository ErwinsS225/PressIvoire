/**
 * Plans d'abonnement et capacités associées.
 *
 * SOURCE UNIQUE de vérité pour le freemium. Le plan vit en base
 * (`pressings.subscription_plan`), mais ce fichier définit ce que chaque
 * plan autorise. Les valeurs viennent de l'offre commerciale réellement
 * affichée à l'écran d'inscription (lib/validation/onboarding.ts) — si
 * l'offre change, ce fichier change avec elle.
 *
 * ⚠ Une capacité bloquée doit être contrôlée CÔTÉ SERVEUR, dans la Server
 * Action ou la fonction Postgres. Masquer un bouton ne suffit pas : une
 * Server Action est un point d'entrée HTTP public, appelable sans navigateur.
 */

/** Identifiants de plan, alignés sur le CHECK de la colonne en base. */
export type PlanId = "free" | "pro" | "business" | "enterprise";

/** Ce qu'un plan donne le droit de faire. */
export interface PlanLimits {
  /** Commandes créées par mois. `null` = illimité. */
  ordersPerMonth: number | null;
  /** Employés (owner, manager, cashier, driver) du pressing. `null` = illimité. */
  staffMembers: number | null;
  /** Accès à l'écran Tournées et aux missions de livraison. */
  deliveries: boolean;
  /** Accès aux rapports d'activité. */
  reports: boolean;
  /** Envoi de SMS et WhatsApp. */
  notifications: boolean;
  /** Encaissement d'un montant partiel. */
  partialPayments: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  /** Prix en FCFA par mois. */
  price: number;
  limits: PlanLimits;
  /** Arguments affichés sur les cartes de l'onboarding et de la page Upgrade. */
  features: string[];
}

/**
 * Plans « activables » par l'application.
 *
 * `business` et `enterprise` existent dans le CHECK de la colonne, mais ne
 * sont pas encore vendus : ils se comportent comme `pro` tant qu'aucune
 * offre n'est publiée, plutôt que de retomber sur `free` — un client passé
 * à un plan supérieur ne doit jamais perdre ses fonctionnalités parce que
 * l'application ne sait pas encore lire le nom du plan.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Gratuit",
    price: 0,
    limits: {
      ordersPerMonth: 50,
      staffMembers: 1,
      deliveries: false,
      reports: false,
      notifications: false,
      partialPayments: false,
    },
    features: [
      "50 commandes par mois",
      "1 caissier",
      "Catalogue illimité",
      "Tableau de bord",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 15000,
    limits: {
      ordersPerMonth: null,
      staffMembers: 5,
      deliveries: true,
      reports: true,
      notifications: true,
      partialPayments: true,
    },
    features: [
      "Commandes illimitées",
      "5 employés",
      "Livraison et tournées",
      "Rapports et statistiques",
      "WhatsApp et SMS inclus",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    price: 40000,
    limits: {
      ordersPerMonth: null,
      staffMembers: 25,
      deliveries: true,
      reports: true,
      notifications: true,
      partialPayments: true,
    },
    features: ["Tout Pro", "25 employés", "Comptes multiples"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 0, // sur devis
    limits: {
      ordersPerMonth: null,
      staffMembers: null,
      deliveries: true,
      reports: true,
      notifications: true,
      partialPayments: true,
    },
    features: ["Tout Business", "Employés illimités", "Accompagnement"],
  },
};

/**
 * Plan inconnu ou absent : on retombe sur `free`, jamais sur `pro`.
 *
 * `hasOwnProperty` et non l'opérateur `in` : `in` parcourt la chaîne de
 * prototype, donc `"constructor"` ou `"toString"` seraient « trouvés » dans
 * l'objet PLANS et renvoyés tels quels — un `subscription_plan` corrompu
 * renverrait alors la fonction `Object` au lieu d'un plan.
 */
export function resolvePlan(plan: string | null | undefined): Plan {
  if (plan && Object.prototype.hasOwnProperty.call(PLANS, plan)) {
    return PLANS[plan as PlanId];
  }
  return PLANS.free;
}

/** Un abonnement arrivé à échéance retombe sur `free`. */
export function isPlanActive(
  plan: string | null | undefined,
  expiresAt: string | null | undefined,
): boolean {
  // Sans date d'échéance, l'abonnement est considered courant : c'est le cas
  // du plan gratuit, et des trials dont la date n'a pas encore été posée.
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

/** Message prêt à afficher quand une capacité est refusée. */
export function upgradeMessage(feature: string, plan: Plan): string {
  return `La fonctionnalité « ${feature} » nécessite le plan Pro. Votre pressing est en plan ${plan.name}.`;
}
