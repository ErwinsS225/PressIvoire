/**
 * Constantes centralisees de l'application.
 * Tous les labels visibles a l'ecran sont en francais ; le code reste en anglais.
 */

export const ORDER_STATUS = {
  PENDING: "pending",
  PICKUP_SCHEDULED: "pickup_scheduled",
  PICKED_UP: "picked_up",
  IN_PROCESSING: "in_processing",
  READY: "ready",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Garde de type : la colonne `orders.status` est un `text` en base, donc
 * Supabase la type comme `string`. On valide plutot que de faire un cast,
 * pour qu'un statut inconnu affiche un repli plutot que de casser l'ecran.
 */
export function isOrderStatus(value: string): value is OrderStatus {
  return Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABELS, value);
}

/** Statut le plus proche d'une valeur inconnue, pour l'affichage. */
export function toOrderStatus(value: string): OrderStatus {
  return isOrderStatus(value) ? value : ORDER_STATUS.PENDING;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Reçue",
  pickup_scheduled: "Collecte planifiée",
  picked_up: "Collectée",
  in_processing: "En traitement",
  ready: "Prête",
  out_for_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
  disputed: "Litige",
};

/** Progression du workflow (0-100 %) pour la barre d'avancement. */
export const ORDER_STATUS_PROGRESS: Record<OrderStatus, number> = {
  pending: 5,
  pickup_scheduled: 15,
  picked_up: 30,
  in_processing: 50,
  ready: 70,
  out_for_delivery: 85,
  delivered: 100,
  cancelled: 100,
  disputed: 100,
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PICKUP_SCHEDULED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.IN_PROCESSING,
  ORDER_STATUS.READY,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

export const WASH_TYPES = {
  EAU: "eau",
  SEC: "sec",
  REPASSAGE: "repassage_seul",
  DETACHAGE: "detachage",
} as const;

export type WashType = (typeof WASH_TYPES)[keyof typeof WASH_TYPES];

export const WASH_TYPE_LABELS: Record<WashType, string> = {
  eau: "Lavage à l'eau",
  sec: "Nettoyage à sec",
  repassage_seul: "Repassage seul",
  detachage: "Détachage",
};

export const ARTICLE_CATEGORIES = {
  HABIT: "habit",
  LINGE_MAISON: "linge_maison",
  CUIR: "cuir",
  DELICAT: "delicat",
} as const;

export type ArticleCategory =
  (typeof ARTICLE_CATEGORIES)[keyof typeof ARTICLE_CATEGORIES];

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  habit: "Habits",
  linge_maison: "Linge de maison",
  cuir: "Cuir",
  delicat: "Délicat",
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  WAVE: "wave",
  ORANGE: "orange",
  MTN: "mtn",
  MOOV: "moov",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange: "Orange Money",
  mtn: "MTN MoMo",
  moov: "Moov Money",
};

/**
 * Communes d'Abidjan (ordre de densite : Cocody/Yopougon/Port-Bouet
 * sont les communes les plus actives du marche pressing ivoirien).
 * Utilise pour le select d'onboarding, le filtrage client
 * et la grille `delivery_fees_by_commune`.
 */
export const CI_COMMUNES = [
  "Cocody",
  "Yopougon",
  "Marcory",
  "Treichville",
  "Plateau",
  "Abobo",
  "Adjamé",
  "Attécoubé",
  "Port-Bouët",
  "Koumassi",
  "Bingerville",
  "Songon",
] as const;

export type Commune = (typeof CI_COMMUNES)[number];

/** Sous-quartiers souvent utilises comme point de rendez-vous (Cocody). */
export const COCODY_ZONES = [
  "Angré",
  "Riviera 3",
  "Riviera 4",
  "Riviera 7",
  "Bingerville",
  "Angré 8e tranche",
  "Cocody Centre",
  "Deux Plateaux",
  "N'Guessanville",
] as const;

/**
 * Libelles de TOUS les moyens de paiement acceptes en base.
 *
 * `payments.method` autorise aussi `card` et `transfer` (cf. migration 001,
 * contrainte payments_method_check), qui n'apparaissent pas dans
 * `PAYMENT_METHOD_LABELS` — ce dernier ne couvre que les moyens proposes au
 * caissier. La caisse doit savoir afficher les deux autres : un encaissement
 * par virement CinetPay ne doit pas s'afficher comme "transfer".
 */
export const PAYMENT_METHOD_LABELS_EXTENDED: Record<string, string> = {
  ...PAYMENT_METHOD_LABELS,
  card: "Carte bancaire",
  transfer: "Virement",
};

/**
 * Libelle affichable d'un moyen de paiement, quelle que soit sa provenance.
 *
 * Accepte `undefined` comme `null` : les colonnes de la base sont soit NULL,
 * soit absentes du resultat de la requete. Les deux cas doivent aboutir au
 * meme repli, sans obliger l'appelant a coalescer.
 */
export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "Non renseigné";
  return PAYMENT_METHOD_LABELS_EXTENDED[method] ?? method;
}

/** Moyens proposes au caissier, dans l'ordre d'usage en Cote d'Ivoire. */
export const CASHIER_METHODS = [
  { value: PAYMENT_METHODS.CASH, label: "Espèces", icon: "💵", color: "bg-emerald-100 text-emerald-700" },
  { value: PAYMENT_METHODS.WAVE, label: "Wave", icon: "🌊", color: "bg-sky-100 text-sky-700" },
  { value: PAYMENT_METHODS.ORANGE, label: "Orange", icon: "🟠", color: "bg-orange-100 text-orange-700" },
  { value: PAYMENT_METHODS.MTN, label: "MTN", icon: "🟡", color: "bg-amber-100 text-amber-800" },
  { value: PAYMENT_METHODS.MOOV, label: "Moov", icon: "🔵", color: "bg-blue-100 text-blue-700" },
] as const;

/** Couleur et icone d'un moyen de paiement, pour la caisse et les rapports. */
export function paymentMethodStyle(
  method: string | null | undefined,
): { icon: string; color: string } {
  const found = CASHIER_METHODS.find((m) => m.value === method);
  if (found) return { icon: found.icon, color: found.color };
  if (method === "card") return { icon: "💳", color: "bg-slate-100 text-slate-700" };
  if (method === "transfer") return { icon: "🏦", color: "bg-indigo-100 text-indigo-700" };
  return { icon: "❔", color: "bg-slate-100 text-slate-500" };
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Miroir exact des helpers SQL de la migration 001.
 *
 * L'interface s'en sert pour masquer ce que la base refusera de toute facon :
 * afficher un bouton "Modifier" a un caissier qui n'a pas le droit d'ecrire
 * dans `articles` ne produirait qu'une erreur RLS incomprehensible. La base
 * reste l'autorite ; ces fonctions ne font que rendre l'interface honnete.
 */
export const STAFF_ROLES = ["owner", "manager", "cashier", "driver"] as const;
export const ADMIN_ROLES = ["owner", "manager"] as const;

/** `app_is_staff()` : owner, manager, cashier, driver. */
export function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes((role ?? "") as (typeof STAFF_ROLES)[number]);
}

/** `app_is_pressing_admin()` : owner, manager. */
export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes((role ?? "") as (typeof ADMIN_ROLES)[number]);
}

/** Libelle lisible d'un role, pour les ecrans de profil. */
export const ROLE_LABELS: Record<string, string> = {
  owner: "Gérant",
  manager: "Responsable",
  cashier: "Caissier",
  driver: "Livreur",
  client: "Client",
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

/* -------------------------------------------------------------------------- */
/* Tableau de bord desktop (app/(app)/orders)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Forme d'une commande consommee par le tableau desktop.
 *
 * Les colonnes du tableau etendent la ligne `orders` du client (nom) et le
 * nombre de lignes, calcule a la lecture. Distincte de `OrderWithClient`
 * (lib/supabase/queries.ts), qui vit cote serveur : le tableau etant un
 * composant client, il lui faut un type serialisable et sans dependance.
 */
export interface OrderWithClient {
  id: string;
  order_number: string;
  status: string;
  total: number;
  amount_paid: number | null;
  payment_status: string;
  created_at: string;
  client: { id: string; full_name: string; phone: string | null } | null;
  items_count: number;
}

/**
 * Rendu d'un statut de commande : variante de badge + libelle francais.
 *
 * Inconnu par defaut plutot qu'une erreur : une valeur de statut ajoutee en
 * base apres deploiement ne doit pas faire tomber la colonne entiere.
 */
export const statusMapping: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Reçue", variant: "secondary" },
  pickup_scheduled: { label: "Collecte planifiée", variant: "secondary" },
  picked_up: { label: "Collectée", variant: "secondary" },
  in_processing: { label: "En traitement", variant: "default" },
  ready: { label: "Prête", variant: "default" },
  out_for_delivery: { label: "En livraison", variant: "outline" },
  delivered: { label: "Livrée", variant: "outline" },
  cancelled: { label: "Annulée", variant: "destructive" },
  disputed: { label: "Litige", variant: "destructive" },
};

/** Etat lisible d'une commande de livraison (table `deliveries`). */
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  assigned: "Affectée",
  in_progress: "En cours",
  completed: "Terminée",
  failed: "Échouée",
};

/** Type de mission de livraison (table `deliveries`). */
export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  pickup: "Collecte",
  delivery: "Livraison",
};

