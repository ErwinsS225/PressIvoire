import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  ORDER_STATUS,
  isOrderStatus,
  type OrderStatus,
  type WashType,
} from "@/lib/constants";

/**
 * Couche d'acces aux donnees de l'application de pressing.
 *
 * ⚠ SERVEUR UNIQUEMENT. Ne jamais importer depuis un composant "use client".
 *
 * Toutes les lectures passent par `getContext()`, qui resout le pressing
 * courant depuis la session de l'utilisateur (`profiles.pressing_id`).
 * Les policies RLS filtrent alors naturellement : un gerant ne voit que son
 * pressing.
 *
 * Le mode demonstration et son repli `service_role` ont ete supprimes a
 * l'onboarding (Phase 2 - Etape 2) : toute page exige desormais une session
 * reelle, garantie par le middleware.
 *
 * Toutes les ecritures passent par les Server Actions de app/actions/.
 */

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type PressingRow = Database["public"]["Tables"]["pressings"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type DeliveryRow = Database["public"]["Tables"]["deliveries"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type CustomerPackRow = Database["public"]["Tables"]["customer_packs"]["Row"];

/** Surfaces du client Supabase utilisees par la couche de lecture. */
type AppDb = {
  from: SupabaseClient<Database>["from"];
  auth: SupabaseClient<Database>["auth"];
  rpc: SupabaseClient<Database>["rpc"];
};

/** Pressing seede utilise par le mode demonstration (cf. supabase/seed.sql). */
export interface AppContext {
  /**
   * Client de lecture, toujours branche sur la session de l'utilisateur :
   * les lectures passent donc par le RLS.
   *
   * On ne type pas avec `SupabaseClient<Database>` : `createServerClient` (@supabase/ssr)
   * et `createClient` (@supabase/supabase-js) n'ont pas les memes parametres
   * generiques, donc le type de l'un n'est pas assignable a celui de l'autre.
   * On ne retient que les surfaces utilisees — `.from()` reste entierement type
   * par le schema, donc les relations restent verifiees a la compilation.
   */
  db: AppDb;
  pressing: PressingRow | null;
  profile: { full_name: string; role: string } | null;
  userId: string | null;
}

/**
 * Resout le pressing courant.
 *
 * Pas de memoisation par `cache()` de React : l'API n'existe qu'a partir de
 * React 19, et le projet tourne sur React 18.3. Chaque appel coute deux
 * requetes legeres (`auth.getUser` + `profiles`), ce qui est negligeable devant
 * les requites metier. A basculer sur `cache()` le jour de l'upgrade React.
 */
export async function getContext(): Promise<AppContext> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pressing_id, role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.pressing_id) {
      const { data: pressing } = await supabase
        .from("pressings")
        .select("*")
        .eq("id", profile.pressing_id)
        .maybeSingle();

      if (pressing) {
        return {
          db: supabase,
          pressing,
          profile: { full_name: profile.full_name, role: profile.role },
          userId: user.id,
        };
      }
    }

    // Session valide mais AUCUN pressing rattache : le compte vient de
    // s'inscrire et n'a pas fini son onboarding. On ne retombe SURTOUT PAS
    // sur le mode demonstration ici — leger les donnees d'un pressing
    // (fictif ou non) a un gerant Auth parce que son onboarding n'est pas
    // termine serait une fuite. On renvoie un contexte vide : l'interface
    // affiche "onboarding requis" et la redirection se fait cote page.
    return {
      db: supabase,
      pressing: null,
      profile: profile
        ? { full_name: profile.full_name, role: profile.role }
        : { full_name: "", role: "client" },
      userId: user.id,
    };
  }

  // --- Pas de session ------------------------------------------------------
  // L'authentification est en place (Phase 2 - Etapes 1 et 2) et le middleware
  // protege deja toutes les routes privees : le mode demonstration et son repli
  // `service_role` ont ete supprimes. Un visiteur non identifie ne voit rien,
  // ce qui est le comportement attendu.
  //
  // Pour redefinir une session de test sans passer par /login :
  //   npm run db:test:user
  return {
    db: supabase,
    pressing: null,
    profile: null,
    userId: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Types de vue (formes calibrees pour l'interface)                            */
/* -------------------------------------------------------------------------- */

export interface DashboardData {
  /** Chiffre d'affaires encaisse sur la journee (commandes payees). */
  revenueToday: number;
  /** Commandes creees aujourd'hui, tous statuts confondus. */
  ordersToday: number;
  /** Variation du CA face a la moyenne des 6 derniers jours, en %. */
  revenueTrend: number | null;
  inProcessing: number;
  readyToDeliver: number;
  /** Commandes du jour a preparer/livrer, les plus recentes d'abord. */
  toDeliver: OrderWithClient[];
}

export interface OrderWithClient extends OrderRow {
  client: Pick<ClientRow, "id" | "full_name" | "phone"> | null;
  items_count: number;
}

export interface OrderDetail extends OrderWithClient {
  items: (OrderItemRow & { article: Pick<ArticleRow, "image_url"> | null })[];
}

/**
 * Nombre minimal de commandes encaissees sur la periode de reference avant
 * d'afficher une tendance de chiffre d'affaires. En dessous, la comparaison
 * journee / moyenne n'est pas significative (voir getDashboardData).
 */
const MIN_SAMPLES_FOR_TREND = 5;

/** Fenetre de reference pour la tendance, en jours. */
const TREND_WINDOW_DAYS = 6;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Colonnes de la relation `client`. Volontairement ecrites en litteral et non
 * par concatenation : supabase-js n'analyse une chaine `select` que si elle est
 * statique, sinon le type de retour retombe sur `GenericStringError` et les
 * relations cessent d'etre typees.
 */
const CLIENT_FIELDS = "id, full_name, phone" as const;

type OrderWithRelations = OrderRow & {
  client:
    | Pick<ClientRow, "id" | "full_name" | "phone">[]
    | Pick<ClientRow, "id" | "full_name" | "phone">
    | null;
  order_items: { id: string }[] | null;
};

/** Supabase renvoie la relation client en tableau (1-n) ou en objet (n-1). */
function toOrderWithClient(raw: OrderWithRelations): OrderWithClient {
  const { order_items, client, ...order } = raw;
  return {
    ...order,
    client: Array.isArray(client) ? (client[0] ?? null) : client,
    items_count: order_items?.length ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                    */
/* -------------------------------------------------------------------------- */

export async function getDashboardData(
  pressingId: string,
): Promise<DashboardData> {
  const { db } = await getContext();
  const today = startOfToday();

  const [todayRes, readyRes, processingRes, weekRes, toDeliverRes] =
    await Promise.all([
      db
        .from("orders")
        .select(
          "id, total, payment_status, amount_paid, created_at, payment_method",
        )
        .eq("pressing_id", pressingId)
        .gte("created_at", today),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("pressing_id", pressingId)
        .eq("status", ORDER_STATUS.READY),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("pressing_id", pressingId)
        .eq("status", ORDER_STATUS.IN_PROCESSING),
      db
        .from("orders")
        .select(
          "id, total, payment_status, amount_paid, created_at, payment_method",
        )
        .eq("pressing_id", pressingId)
        .gte("created_at", startOfDaysAgo(TREND_WINDOW_DAYS + 1)),
      db
        .from("orders")
        .select("*, client:clients(id, full_name, phone), order_items(id)")
        .eq("pressing_id", pressingId)
        .in("status", [
          ORDER_STATUS.READY,
          ORDER_STATUS.IN_PROCESSING,
          ORDER_STATUS.PICKED_UP,
        ])
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const todayOrders = todayRes.data ?? [];
  const weekOrders = weekRes.data ?? [];

  const revenueToday = todayOrders
    .filter(isPaid)
    .reduce((sum, o) => sum + (o.amount_paid ?? 0), 0);

  // Tendance : journee du jour comparee a la moyenne des 6 jours precedents.
  // On exige un echantillon suffisant : sinon la moyenne est calculee sur 1 ou
  // 2 valeurs et le pourcentage devient un chiffre affreux du type "+942 %",
  // qui n'apprend rien au gerant. Sans echantillon, on n'affiche pas de tendance.
  const previous = weekOrders.filter((o) => o.created_at < today && isPaid(o));
  let revenueTrend: number | null = null;

  if (previous.length >= MIN_SAMPLES_FOR_TREND) {
    const dailyAverage =
      previous.reduce((sum, o) => sum + (o.amount_paid ?? 0), 0) /
      TREND_WINDOW_DAYS;
    if (dailyAverage > 0) {
      const raw = ((revenueToday - dailyAverage) / dailyAverage) * 100;
      // Borne a +/-999 % : au-dela, la comparaison n'a plus de sens affichable.
      revenueTrend = Math.max(-999, Math.min(999, Math.round(raw)));
    }
  }

  return {
    revenueToday,
    ordersToday: todayOrders.length,
    revenueTrend,
    inProcessing: processingRes.count ?? 0,
    readyToDeliver: readyRes.count ?? 0,
    toDeliver: (toDeliverRes.data ?? []).map(toOrderWithClient),
  };
}

/* -------------------------------------------------------------------------- */
/* Commandes                                                                    */
/* -------------------------------------------------------------------------- */

export interface OrderFilters {
  status?: OrderStatus | "all";
  search?: string;
  limit?: number;
}

/**
 * Neutralise les caracteres qui cassent la syntaxe des filtres PostgREST
 * (`,` `(` `)` `.` `*`). Sans cela, une recherche utilisateur comme
 * "Kone, Ana" produirait une erreur PGRST100, voire un filtre elargi.
 */
/**
 * Nettoie les termes de recherche pour éviter toute injection SQL.
 * Supprime tous les caractères spéciaux qui pourraient être utilisés pour contourner les filtres.
 */
function sanitizeFilterTerm(input: string): string {
  // Supprime TOUS les caractères non alphanumériques/spaces/tirets/apos
  return input
    .replace(/[^a-zA-Z0-9\s '-]/g, " ")
    .trim()
    .slice(0, 100); // Limite la longueur
}

/**
 * Valide qu'un UUID est bien formaté (empêche toute injection dans les IN clauses)
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function getOrders(
  pressingId: string,
  { status = "all", search = "", limit = 50 }: OrderFilters = {},
): Promise<OrderWithClient[]> {
  // Validation préalable du pressingId (doit être un UUID valide)
  if (!isValidUUID(pressingId)) {
    throw new Error("Invalid pressing ID");
  }

  const { db } = await getContext();

  let query = db
    .from("orders")
    .select("*, client:clients(id, full_name, phone), order_items(id)")
    .eq("pressing_id", pressingId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100)); // Limite la limite à 100 maximum

  // Validation stricte du statut (n'autorise que les valeurs définies)
  if (status !== "all" && isOrderStatus(status)) {
    query = query.eq("status", status);
  }

  const term = sanitizeFilterTerm(search);
  if (term) {
    // Le nom du client vit dans une autre table, et PostgREST refuse un filtre
    // pointe sur une ressource embarquee a l'interieur d'un `or()`
    // (erreur PGRST100). On resout donc les clients correspondants dans une
    // requete separee, puis on filtre les commandes sur `client_id`.
    const { data: matching } = await db
      .from("clients")
      .select("id")
      .eq("pressing_id", pressingId)
      .ilike("full_name", `%${term}%`);

    // NE prend que les UUIDs valides dans la liste des clientIds (sécurité absolue)
    const clientIds = (matching ?? [])
      .map((client) => client.id)
      .filter(isValidUUID);
    const byNumber = `order_number.ilike.%${term.replace(/%/g, "\\%")}%`;

    if (clientIds.length > 0) {
      // Utilise la syntaxe PostgREST correcte et sécurisée pour les IN clauses
      query = query.or(byNumber).in("client_id", clientIds);
    } else {
      query = query.or(byNumber);
    }
  }

  const { data } = await query;
  return ((data ?? []) as OrderWithRelations[]).map(toOrderWithClient);
}

export async function getOrderDetail(
  orderId: string,
): Promise<OrderDetail | null> {
  const { db, pressing } = await getContext();
  if (!pressing) return null;

  // Validation stricte des UUIDs pour éviter les accès non autorisés
  function isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  if (!isValidUUID(orderId)) return null;

  // Vérification OBLIGATOIRE que la commande appartient bien au pressing de l'utilisateur
  const { data } = await db
    .from("orders")
    .select(
      "*, client:clients(id, full_name, phone), order_items(*, article:articles(image_url))",
    )
    .eq("id", orderId)
    .eq("pressing_id", pressing.id)
    .maybeSingle();

  if (!data) return null;

  const { order_items, client, ...order } = data as OrderRow & {
    client: Pick<ClientRow, "id" | "full_name" | "phone"> | null;
    order_items:
      | (OrderItemRow & { article: Pick<ArticleRow, "image_url"> | null })[]
      | null;
  };

  return {
    ...order,
    client: Array.isArray(client) ? (client[0] ?? null) : client,
    items: order_items ?? [],
    items_count: order_items?.length ?? 0,
  };
}

/** Compte les commandes du mois courant (indicateur de l'en-tete). */
export async function getMonthlyOrderCount(
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

/* -------------------------------------------------------------------------- */
/* Clients & articles                                                           */
/* -------------------------------------------------------------------------- */

export async function getClients(
  pressingId: string,
  search = "",
): Promise<ClientRow[]> {
  const { db } = await getContext();

  let query = db
    .from("clients")
    .select("*")
    .eq("pressing_id", pressingId)
    .is("deleted_at", null)
    .order("full_name");

  const term = sanitizeFilterTerm(search);
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data } = await query.limit(50);
  return data ?? [];
}

export async function getArticles(
  pressingId: string,
  washType?: WashType,
): Promise<ArticleRow[]> {
  const { db } = await getContext();

  let query = db
    .from("articles")
    .select("*")
    .eq("pressing_id", pressingId)
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  if (washType) query = query.eq("wash_type", washType);

  const { data } = await query;
  return data ?? [];
}

/** Une commande est comptabilisee dans le CA si de l'argent a ete encaisse. */
function isPaid(order: {
  payment_status: string;
  amount_paid: number | null;
}): boolean {
  return (
    order.payment_status === "paid" ||
    (order.payment_status === "partial" && (order.amount_paid ?? 0) > 0)
  );
}

/* -------------------------------------------------------------------------- */
/* Catalogue (gestion des articles)                                             */
/* -------------------------------------------------------------------------- */

export interface CatalogueFilters {
  /** "all" ou une valeur de ARTICLE_CATEGORIES. */
  category?: string;
  /** "all" ou une valeur de WASH_TYPES. */
  washType?: string;
  search?: string;
}

/**
 * Catalogue complet du pressing, articles desactives INCLUS.
 *
 * Volontairement distinct de `getArticles()`, qui ne sert qu'a la prise de
 * commande et ne remonte que les articles actifs : l'ecran de gestion doit
 * pouvoir reafficher et reactiver un article masque.
 */
export async function getCatalogue(
  pressingId: string,
  { category = "all", washType = "all", search = "" }: CatalogueFilters = {},
): Promise<ArticleRow[]> {
  const { db } = await getContext();

  let query = db
    .from("articles")
    .select("*")
    .eq("pressing_id", pressingId)
    .order("is_active", { ascending: false })
    .order("category")
    .order("sort_order")
    .order("name");

  if (category !== "all") query = query.eq("category", category);
  if (washType !== "all") query = query.eq("wash_type", washType);

  const term = sanitizeFilterTerm(search);
  if (term) query = query.ilike("name", `%${term}%`);

  const { data } = await query;
  return data ?? [];
}

/** Un article precis, meme desactive : necessaire pour l'ecran d'edition. */
export async function getArticle(
  articleId: string,
): Promise<ArticleRow | null> {
  const { db, pressing } = await getContext();
  if (!pressing) return null;

  // Validation stricte des UUIDs pour éviter les accès non autorisés
  function isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  if (!isValidUUID(articleId)) return null;

  // Vérification OBLIGATOIRE que l'article appartient bien au pressing de l'utilisateur
  const { data } = await db
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .eq("pressing_id", pressing.id)
    .maybeSingle();

  return data ?? null;
}

/** Chiffres de l'en-tete du catalogue. */
export function summariseCatalogue(articles: ArticleRow[]) {
  const active = articles.filter((article) => article.is_active);
  const prices = articles.map((article) => article.price);

  return {
    total: articles.length,
    active: active.length,
    inactive: articles.length - active.length,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
  };
}

/** Regroupe les articles par categorie, pour l'affichage en sections. */
export function groupByCategory(
  articles: ArticleRow[],
): { category: string; items: ArticleRow[] }[] {
  const groups = new Map<string, ArticleRow[]>();

  for (const article of articles) {
    const bucket = groups.get(article.category);
    if (bucket) bucket.push(article);
    else groups.set(article.category, [article]);
  }

  return [...groups.entries()].map(([category, items]) => ({
    category,
    items,
  }));
}

/* -------------------------------------------------------------------------- */
/* Clients                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Nombre maximal de commandes agregees pour calculer les totaux par client.
 *
 * ⚠ Les colonnes denormalisees `clients.total_spent`, `total_orders` et
 * `last_order_at` existent en base (cf. migration 001) mais AUCUN trigger ne
 * les maintient : elles valent 0 pour tout le monde. Plutot que d'afficher des
 * zeros — ce que faisait l'ecran Clients — on agrege en direct depuis `orders`,
 * ce qui est immediatement juste sur les donnees deja en base.
 *
 * La borne suffit a l'echelle d'un MVP. Au-dela, la bonne reponse est un
 * trigger `after insert or update on orders` qui alimente ces colonnes, ou une
 * vue materialisee rafraichie la nuit.
 */
const CLIENT_AGGREGATE_LIMIT = 2000;

export interface ClientSummary extends ClientRow {
  /** Nombre de commandes hors annulees. */
  orders_count: number;
  /** Total reellement encaisse. */
  revenue: number;
  /** Reste a encaisser sur les commandes en cours. */
  outstanding: number;
  /** Date de la derniere commande (calculee, pas la colonne denormalisee). */
  last_order: string | null;
}

/** Annuaire des clients, avec totaux calcules depuis les commandes. */
export async function getClientSummaries(
  pressingId: string,
  search = "",
): Promise<ClientSummary[]> {
  const { db } = await getContext();

  let query = db
    .from("clients")
    .select("*")
    .eq("pressing_id", pressingId)
    .is("deleted_at", null)
    .order("full_name")
    .limit(200);

  const term = sanitizeFilterTerm(search);
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const [clientsRes, ordersRes] = await Promise.all([
    query,
    db
      .from("orders")
      .select(
        "client_id, total, amount_paid, payment_status, status, created_at",
      )
      .eq("pressing_id", pressingId)
      .neq("status", ORDER_STATUS.CANCELLED)
      .order("created_at", { ascending: false })
      .limit(CLIENT_AGGREGATE_LIMIT),
  ]);

  type Aggregate = {
    count: number;
    revenue: number;
    outstanding: number;
    last: string | null;
  };
  const byClient = new Map<string, Aggregate>();

  for (const row of ordersRes.data ?? []) {
    const entry: Aggregate = byClient.get(row.client_id) ?? {
      count: 0,
      revenue: 0,
      outstanding: 0,
      last: null,
    };

    entry.count += 1;
    entry.revenue += isPaid(row) ? (row.amount_paid ?? 0) : 0;
    entry.outstanding += Math.max(row.total - (row.amount_paid ?? 0), 0);
    if (!entry.last || row.created_at > entry.last) entry.last = row.created_at;

    byClient.set(row.client_id, entry);
  }

  return (clientsRes.data ?? []).map((client) => {
    const aggregate = byClient.get(client.id);
    return {
      ...client,
      orders_count: aggregate?.count ?? 0,
      revenue: aggregate?.revenue ?? 0,
      outstanding: aggregate?.outstanding ?? 0,
      last_order: aggregate?.last ?? null,
    };
  });
}

export interface ClientDetail {
  client: ClientRow;
  /** 30 dernieres commandes, la plus recente d'abord. */
  orders: OrderWithClient[];
  /** Packs vendus a ce client (forfaits pre-payes). */
  packs: CustomerPackRow[];
  stats: {
    ordersCount: number;
    revenue: number;
    outstanding: number;
    lastOrderAt: string | null;
  };
}

/** Fiche complete d'un client : coordonnees, historique, forfaits, soldes. */
export async function getClientDetail(
  clientId: string,
): Promise<ClientDetail | null> {
  const { db, pressing } = await getContext();
  if (!pressing) return null;

  // Validation stricte des UUIDs pour éviter les accès non autorisés
  function isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  if (!isValidUUID(clientId)) return null;

  // Vérification OBLIGATOIRE que le client appartient bien au pressing de l'utilisateur
  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("pressing_id", pressing.id)
    .maybeSingle();

  if (!client) return null;

  const [ordersRes, packsRes] = await Promise.all([
    db
      .from("orders")
      .select("*, client:clients(id, full_name, phone), order_items(id)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("customer_packs")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);

  const orders = ((ordersRes.data ?? []) as OrderWithRelations[]).map(
    toOrderWithClient,
  );
  const billable = orders.filter(
    (order) => order.status !== ORDER_STATUS.CANCELLED,
  );

  return {
    client,
    orders,
    packs: packsRes.data ?? [],
    stats: {
      ordersCount: billable.length,
      revenue: orders
        .filter(isPaid)
        .reduce((sum, order) => sum + (order.amount_paid ?? 0), 0),
      outstanding: billable.reduce(
        (sum, order) =>
          sum + Math.max(order.total - (order.amount_paid ?? 0), 0),
        0,
      ),
      lastOrderAt: orders[0]?.created_at ?? null,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Caisse                                                                       */
/* -------------------------------------------------------------------------- */

/** Ligne de journal enrichie du numero de commande et du nom du client. */
export interface CashPayment extends PaymentRow {
  order_number: string | null;
  client_name: string | null;
}

export interface CashRegister {
  /** Total encaisse aujourd'hui, toutes methodes confondues. */
  collectedToday: number;
  paymentsCount: number;
  /** Ventilation par moyen de paiement, du plus fort au plus faible. */
  byMethod: { method: string; total: number; count: number }[];
  /** Encaissements du jour, du plus recent au plus ancien. */
  recent: CashPayment[];
  /** Commandes dont le solde reste du. */
  outstanding: { total: number; count: number; orders: OrderWithClient[] };
}

/**
 * Etat de la caisse du jour.
 *
 * Les encaissements viennent de la table `payments` — le JOURNAL. Jusqu'a la
 * migration 004 cette table restait vide (l'encaissement ne mettait a jour que
 * `orders.amount_paid`), et une ventilation par moyen de paiement etait donc
 * impossible : `orders.payment_method` est ecrase a chaque encaissement, donc
 * un reglement fractionne se retrouvait integralement attribue au dernier
 * moyen utilise.
 */
export async function getCashRegister(
  pressingId: string,
): Promise<CashRegister> {
  const { db } = await getContext();

  const [paymentsRes, unpaidRes] = await Promise.all([
    db
      .from("payments")
      .select("*")
      .eq("pressing_id", pressingId)
      .eq("status", "success")
      .gte("paid_at", startOfToday())
      .order("paid_at", { ascending: false })
      .limit(100),
    db
      .from("orders")
      .select("*, client:clients(id, full_name, phone), order_items(id)")
      .eq("pressing_id", pressingId)
      .in("payment_status", ["unpaid", "partial"])
      .neq("status", ORDER_STATUS.CANCELLED)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const payments = paymentsRes.data ?? [];

  // `payments` ne porte ni le numero de commande ni le nom du client : on les
  // resout en une seule requete pour toutes les commandes concernees, plutot
  // qu'un embed imbrique dont le typage est fragile.
  const orderIds = [
    ...new Set(
      payments.map((p) => p.order_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const labels = new Map<
    string,
    { order_number: string; client_name: string | null }
  >();

  if (orderIds.length > 0) {
    const { data: rows } = await db
      .from("orders")
      .select("id, order_number, client:clients(full_name)")
      .in("id", orderIds);

    for (const row of rows ?? []) {
      const raw = row.client as
        | { full_name: string }[]
        | { full_name: string }
        | null;
      const client = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      labels.set(row.id, {
        order_number: row.order_number,
        client_name: client?.full_name ?? null,
      });
    }
  }

  const byMethodMap = new Map<string, { total: number; count: number }>();
  for (const payment of payments) {
    const entry = byMethodMap.get(payment.method) ?? { total: 0, count: 0 };
    entry.total += payment.amount;
    entry.count += 1;
    byMethodMap.set(payment.method, entry);
  }

  const outstandingOrders = (
    (unpaidRes.data ?? []) as OrderWithRelations[]
  ).map(toOrderWithClient);

  return {
    collectedToday: payments.reduce((sum, payment) => sum + payment.amount, 0),
    paymentsCount: payments.length,
    byMethod: [...byMethodMap.entries()]
      .map(([method, value]) => ({ method, ...value }))
      .sort((a, b) => b.total - a.total),
    recent: payments.map((payment) => ({
      ...payment,
      order_number: labels.get(payment.order_id ?? "")?.order_number ?? null,
      client_name: labels.get(payment.order_id ?? "")?.client_name ?? null,
    })),
    outstanding: {
      total: outstandingOrders.reduce(
        (sum, order) =>
          sum + Math.max(order.total - (order.amount_paid ?? 0), 0),
        0,
      ),
      count: outstandingOrders.length,
      orders: outstandingOrders,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Livraisons & tournees                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Delai au-dela duquel une commande prete est consideree comme en attente.
 *
 * On se base sur `created_at` et non sur `estimated_ready_at` : cette derniere
 * n'est jamais renseignee par `createOrder()`, elle serait donc toujours nulle
 * et le compteur de retard resterait a zero quoi qu'il arrive.
 */
const LATE_ORDER_HOURS = 24;

export interface DeliveryBoard {
  /** Commandes a remettre au client (retrait comptoir ou livraison). */
  toDeliver: OrderWithClient[];
  /** Collectes a domicile restant a effectuer. */
  toCollect: OrderWithClient[];
  /** Missions affectees a un livreur (table `deliveries`). */
  missions: (DeliveryRow & {
    order_number: string | null;
    client_name: string | null;
  })[];
  /** Sous-ensemble de `toDeliver` pret depuis plus de 24 h. */
  lateOrders: OrderWithClient[];
}

/**
 * Tournee du jour.
 *
 * La table `deliveries` n'est alimentee par personne a ce stade : la tournee
 * est donc DERIVEE du statut des commandes, ce qui la rend juste avec les
 * donnees existantes. Les missions de `deliveries` sont ajoutees par-dessus
 * quand elles existent, pour l'affectation a un livreur.
 */
export async function getDeliveryBoard(
  pressingId: string,
): Promise<DeliveryBoard> {
  const { db } = await getContext();

  const [toDeliverRes, toCollectRes, missionsRes] = await Promise.all([
    db
      .from("orders")
      .select("*, client:clients(id, full_name, phone), order_items(id)")
      .eq("pressing_id", pressingId)
      .in("status", [ORDER_STATUS.READY, ORDER_STATUS.OUT_FOR_DELIVERY])
      .order("created_at", { ascending: true })
      .limit(40),
    db
      .from("orders")
      .select("*, client:clients(id, full_name, phone), order_items(id)")
      .eq("pressing_id", pressingId)
      .eq("pickup_type", "home_pickup")
      .in("status", [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PICKUP_SCHEDULED,
        ORDER_STATUS.PICKED_UP,
      ])
      .order("pickup_scheduled_at", { ascending: true, nullsFirst: false })
      .limit(20),
    db
      .from("deliveries")
      .select("*")
      .eq("pressing_id", pressingId)
      .in("status", ["assigned", "in_progress"])
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(40),
  ]);

  const toDeliver = ((toDeliverRes.data ?? []) as OrderWithRelations[]).map(
    toOrderWithClient,
  );
  const toCollect = ((toCollectRes.data ?? []) as OrderWithRelations[]).map(
    toOrderWithClient,
  );
  const missions = missionsRes.data ?? [];

  // Numero de commande et client des missions, resolus en une requete.
  const orderIds = [...new Set(missions.map((mission) => mission.order_id))];
  const labels = new Map<
    string,
    { order_number: string; client_name: string | null }
  >();

  if (orderIds.length > 0) {
    const { data: rows } = await db
      .from("orders")
      .select("id, order_number, client:clients(full_name)")
      .in("id", orderIds);

    for (const row of rows ?? []) {
      const raw = row.client as
        | { full_name: string }[]
        | { full_name: string }
        | null;
      const client = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      labels.set(row.id, {
        order_number: row.order_number,
        client_name: client?.full_name ?? null,
      });
    }
  }

  const lateThreshold = Date.now() - LATE_ORDER_HOURS * 3_600_000;

  return {
    toDeliver,
    toCollect,
    missions: missions.map((mission) => ({
      ...mission,
      order_number: labels.get(mission.order_id)?.order_number ?? null,
      client_name: labels.get(mission.order_id)?.client_name ?? null,
    })),
    lateOrders: toDeliver.filter(
      (order) =>
        order.status === ORDER_STATUS.READY &&
        new Date(order.created_at).getTime() < lateThreshold,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Rapports                                                                     */
/* -------------------------------------------------------------------------- */

/** Fenetre d'analyse des rapports, en jours (aujourd'hui inclus). */
export const REPORT_WINDOW_DAYS = 7;

/** Plafond de commandes analysees : borne le cout du rapport. */
const REPORT_ORDER_LIMIT = 1000;

/** Cle de regroupement par jour LOCAL ("2026-03-12"). */
function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface ReportDay {
  key: string;
  /** "Auj." ou l'abrege du jour ("lun."). */
  label: string;
  /** "12/03", affiche sous la barre. */
  shortDate: string;
  revenue: number;
  orders: number;
  isToday: boolean;
}

export interface ReportData {
  /** 7 jours, du plus ancien a aujourd'hui : l'ordre de lecture du graphique. */
  days: ReportDay[];
  totalRevenue: number;
  totalOrders: number;
  /** Panier moyen encaisse. */
  averageBasket: number;
  /** Reste a encaisser sur les commandes de la periode. */
  outstanding: number;
  topArticles: { name: string; quantity: number; revenue: number }[];
  topClients: {
    id: string;
    full_name: string;
    revenue: number;
    orders: number;
  }[];
  byMethod: { method: string; total: number; count: number }[];
  byStatus: { status: OrderStatus; count: number }[];
}

/**
 * Rapport d'activite sur les 7 derniers jours.
 *
 * Tout est agrege ici plutot qu'en SQL : le volume d'un pressing ivoirien sur
 * une semaine (quelques centaines de commandes) rend le calcul en memoire
 * negligeable, et cela evite d'ajouter une fonction Postgres de plus.
 *
 * ⚠ Le chiffre d'affaires est rattache au JOUR DE CREATION de la commande, pas
 * au jour de l'encaissement — c'est la convention deja retenue par
 * `getDashboardData()`. Les deux ecrans restent donc coherents entre eux.
 */
export async function getReports(pressingId: string): Promise<ReportData> {
  const { db } = await getContext();

  const { data: orderRows } = await db
    .from("orders")
    .select(
      "id, status, payment_status, total, amount_paid, payment_method, created_at, client_id",
    )
    .eq("pressing_id", pressingId)
    .gte("created_at", startOfDaysAgo(REPORT_WINDOW_DAYS - 1))
    .order("created_at", { ascending: false })
    .limit(REPORT_ORDER_LIMIT);

  const orders = orderRows ?? [];
  const orderIds = orders.map((order) => order.id);

  let items: {
    order_id: string;
    article_name: string;
    quantity: number;
    unit_price: number;
  }[] = [];
  if (orderIds.length > 0) {
    const { data } = await db
      .from("order_items")
      .select("order_id, article_name, quantity, unit_price")
      .in("order_id", orderIds);
    items = data ?? [];
  }

  const { data: clientRows } = await db
    .from("clients")
    .select("id, full_name")
    .eq("pressing_id", pressingId)
    .limit(500);

  const clientNames = new Map(
    (clientRows ?? []).map((client) => [client.id, client.full_name]),
  );
  const billable = orders.filter(
    (order) => order.status !== ORDER_STATUS.CANCELLED,
  );

  // -- Serie journaliere ---------------------------------------------------
  const days: ReportDay[] = [];
  const dayIndex = new Map<string, ReportDay>();

  for (let offset = REPORT_WINDOW_DAYS - 1; offset >= 0; offset--) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    date.setHours(0, 0, 0, 0);

    const day: ReportDay = {
      key: localDayKey(date),
      label:
        offset === 0
          ? "Auj."
          : date.toLocaleDateString("fr-FR", { weekday: "short" }),
      shortDate: date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue: 0,
      orders: 0,
      isToday: offset === 0,
    };

    days.push(day);
    dayIndex.set(day.key, day);
  }

  // -- Agregations ---------------------------------------------------------
  let totalRevenue = 0;
  let outstanding = 0;
  const methodTotals = new Map<string, { total: number; count: number }>();
  const statusCounts = new Map<OrderStatus, number>();
  const clientTotals = new Map<string, { revenue: number; orders: number }>();

  const billableIds = new Set(billable.map((order) => order.id));

  for (const order of orders) {
    const day = dayIndex.get(localDayKey(new Date(order.created_at)));
    if (day) {
      day.orders += 1;
      if (isPaid(order)) day.revenue += order.amount_paid ?? 0;
    }

    const status: OrderStatus = isOrderStatus(order.status)
      ? order.status
      : ORDER_STATUS.PENDING;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  for (const order of billable) {
    outstanding += Math.max(order.total - (order.amount_paid ?? 0), 0);

    if (!isPaid(order)) continue;

    const paid = order.amount_paid ?? 0;
    totalRevenue += paid;

    const method = order.payment_method ?? "inconnu";
    const methodEntry = methodTotals.get(method) ?? { total: 0, count: 0 };
    methodEntry.total += paid;
    methodEntry.count += 1;
    methodTotals.set(method, methodEntry);

    const clientEntry = clientTotals.get(order.client_id) ?? {
      revenue: 0,
      orders: 0,
    };
    clientEntry.revenue += paid;
    clientEntry.orders += 1;
    clientTotals.set(order.client_id, clientEntry);
  }

  // Les articles ne sont comptes que sur les commandes facturables : une
  // commande annulee ne doit pas gonfler le classement des articles lavees.
  const articleTotals = new Map<
    string,
    { quantity: number; revenue: number }
  >();
  for (const item of items) {
    if (!billableIds.has(item.order_id)) continue;

    const entry = articleTotals.get(item.article_name) ?? {
      quantity: 0,
      revenue: 0,
    };
    entry.quantity += item.quantity;
    entry.revenue += item.quantity * item.unit_price;
    articleTotals.set(item.article_name, entry);
  }

  return {
    days,
    totalRevenue,
    totalOrders: billable.length,
    averageBasket:
      billable.length > 0 ? Math.round(totalRevenue / billable.length) : 0,
    outstanding,
    topArticles: [...articleTotals.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    topClients: [...clientTotals.entries()]
      .map(([id, value]) => ({
        id,
        full_name: clientNames.get(id) ?? "Client supprimé",
        ...value,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    byMethod: [...methodTotals.entries()]
      .map(([method, value]) => ({ method, ...value }))
      .sort((a, b) => b.total - a.total),
    byStatus: [...statusCounts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Compteurs affiches sur le tableau de bord et dans le hub "Plus". */
export interface NotificationCounts {
  /** En attente d'envoi ou en cours d'envoi. */
  queued: number;
  /** Partis chez le destinataire. */
  sent: number;
  /** Echecs a relancer manuellement. */
  failed: number;
}

/** Ligne du journal d'envoi, avec les champs reellement affiches. */
export type NotificationLogEntry = Pick<
  NotificationRow,
  | "id"
  | "order_id"
  | "channel"
  | "event"
  | "recipient"
  | "message"
  | "status"
  | "error_message"
  | "retries"
  | "created_at"
>;

/** Volume du journal affiche : la liste est triee, pas paginee. */
const NOTIFICATION_LOG_LIMIT = 60;

/**
 * Compteurs de la file d'envoi, regroupes en une seule requete.
 *
 * Le detail n'interesse que sur l'ecran Notifications ; le tableau de bord et le
 * hub "Plus" ont besoin de trois nombres. On demande donc les lignes et on
 * compte en memoire plutot que d'empiler trois `count()` sur la meme table —
 * le volume reste tres faible (une ligne par evenement de commande).
 */
export async function getNotificationCounts(
  pressingId: string,
): Promise<NotificationCounts> {
  const { db } = await getContext();

  const { data } = await db
    .from("notifications")
    .select("status")
    .eq("pressing_id", pressingId)
    .limit(NOTIFICATION_LOG_LIMIT * 4);

  const counts: NotificationCounts = { queued: 0, sent: 0, failed: 0 };

  for (const row of data ?? []) {
    if (row.status === "sent") counts.sent += 1;
    else if (row.status === "failed") counts.failed += 1;
    else if (row.status === "queued" || row.status === "sending")
      counts.queued += 1;
  }

  return counts;
}

/**
 * Journal d'envoi SMS / WhatsApp, du plus recent au plus ancien.
 *
 * On selectionne une projection et non la ligne entiere : le client n'a besoin
 * que de ces champs pour l'affichage, et cela evite de transporter a chaque
 * rendu les colonnes internes de la file (identifiants de passerelle, charges
 * utiles brutes).
 */
export async function getNotifications(
  pressingId: string,
): Promise<NotificationLogEntry[]> {
  const { db } = await getContext();

  const { data } = await db
    .from("notifications")
    .select(
      "id, order_id, channel, event, recipient, message, status, error_message, retries, created_at",
    )
    .eq("pressing_id", pressingId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_LOG_LIMIT);

  return data ?? [];
}
