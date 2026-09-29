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
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Portee minimale du client Supabase utilisee par la couche de lecture.
 *
 * On ne peut PAS typer `AppDb` directement avec les proprietes de
 * `SupabaseClient<Database>` : au sein d'un type objet, `from` est la
 * surcharge INTERNE du client (`ClientTables`), qui resout deja ses noms de
 * tables avec les generiques COURANTS de la classe — le `Database` ecrit ici
 * est ignore, et `.select()` retomberait sur `never`.
 *
 * On ne retient donc que les surfaces reellement utilisees, declarees ici
 * generiquement contre `Database` : `from(relation)` renvoie un builder dont
 * les surcharges `.select()` sont intactes, donc les relations (`client:clients(...)`)
 * restent verifiees a la compilation.
 */
export type AppDb = {
  /**
   * Tables ET vues du schema. Les vues agregees (`stats_*`) sont lues comme
   * des relations : les lister ici evite de caster `db` a chaque appel.
   */
  from<
    F extends
      | keyof Database["public"]["Tables"]
      | keyof Database["public"]["Views"],
  >(
    relation: F,
  ): ReturnType<SupabaseClient<Database>["from"]>;
  auth: SupabaseClient<Database>["auth"];
  rpc<F extends keyof Database["public"]["Functions"]>(
    fn: F,
    args?: Database["public"]["Functions"][F]["Args"],
  ): PromiseLike<{
    data: Database["public"]["Functions"][F]["Returns"] | null;
    error: { message: string } | null;
  }>;
};

/** Pressing seede utilise par le mode demonstration (cf. supabase/seed.sql). */
export interface AppContext {
  /**
   * Client de lecture toujours branche sur la session de l'utilisateur :
   * les lectures passent donc par le RLS.
   *
   * On ne type pas avec `SupabaseClient<Database>` : `createServerClient` (@supabase/ssr)
   * et `createClient` (@supabase/supabase-js) n'ont pas les memes parametres
   * generiques donc le type de l'un n'est pas assignable a celui de l'autre.
   * On ne retient que les surfaces utilisees — `.from()` reste entierement type
   * par le schema donc les relations restent verifiees a la compilation.
   */
  db: AppDb;
  pressing: PressingRow | null;
  profile: {
    full_name: string;
    role: string;
    /**
     * Date de creation du profil (ISO 8601).
     *
     * Ajoutee pour l'ecran d'onboarding : un compte de quelques minutes est
     * un compte en cours de configuration, alors qu'un compte de plusieurs
     * jours sans pressing signale un utilisateur qui revient et decouvre,
     * sans explication, un parcours qu'il a peut-etre deja fait ailleurs.
     * Les deux demandent des ecrans differents (cf. `onboarding/layout.tsx`).
     */
    createdAt: string;
  } | null;
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
    const { data: profile } = (await supabase
      .from("profiles")
      .select("pressing_id, role, full_name, created_at")
      .eq("id", user.id)
      .maybeSingle()) as {
      data: Pick<ProfileRow, "pressing_id" | "role" | "full_name" | "created_at"> | null;
    };

    if (profile?.pressing_id) {
      const { data: pressing } = (await supabase
        .from("pressings")
        .select("*")
        .eq("id", profile.pressing_id)
        .maybeSingle()) as { data: PressingRow | null };

      if (pressing) {
        return {
          db: supabase,
          pressing,
          profile: {
            full_name: profile.full_name,
            role: profile.role,
            createdAt: profile.created_at,
          },
          userId: user.id,
        };
      }
    }

    // Session valide mais AUCUN pressing rattache. Deux situations tres
    // differentes se cachent derriere cette meme absence, et l'ecran
    // d'onboarding doit pouvoir les distinguer (cf. `onboarding/layout.tsx`) :
    //
    //   1. le compte vient d'etre cree, l'utilisateur est au debut du parcours ;
    //   2. le compte date de plusieurs jours — l'utilisateur revient et ne
    //      comprend pas pourquoi il est renvoye ici alors qu'il pense avoir
    //      deja configure son pressing.
    //
    // On ne retombe SURTOUT PAS sur le mode demonstration dans ce cas :
    // leger les donnees d'un pressing (fictif ou non) a un gerant Auth parce
    // que son onboarding n'est pas termine serait une fuite.
    return {
      db: supabase,
      pressing: null,
      profile: profile
        ? {
            full_name: profile.full_name,
            role: profile.role,
            createdAt: profile.created_at,
          }
        // Aucun profil : le trigger d'inscription n'a pas joue. On retombe
        // sur l'epoch — l'ecran traitera ce cas comme une inscription
        // fraiche plutot que comme un blocage.
        : { full_name: "", role: "client", createdAt: "1970-01-01T00:00:00Z" },
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

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Calcule le premier jour du mois, X mois avant aujourd'hui.
 * @param monthsAgo - Nombre de mois dans le passé. 0 = mois courant.
 */
function startOfMonth(monthsAgo: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Forme des données pour le nouveau tableau de bord desktop.
 */
export interface DashboardData {
  revenue: {
    total: number;
    change: number;
  };
  orders: {
    count: number;
  };
  pendingOrders: number;
  readyOrders: number;
  newClients: number;
  monthlyRevenue: { month: string; revenue: number }[];
  recentOrders: {
    id: string;
    total: number;
    status: OrderStatus;
    customer: {
      name: string | null;
      avatarUrl: string | null;
    };
    createdAt: Date;
  }[];
}

export async function getOrdersForPressing(
  pressingId: string,
): Promise<OrderWithClient[]> {
  const { db } = await getContext();
  const { data, error } = await db
    .from("orders")
    .select("*, client:clients(id, full_name, phone), order_items(id)")
    .eq("pressing_id", pressingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders for pressing:", error);
    throw new Error("Impossible de récupérer les commandes.");
  }

  return ((data ?? []) as (OrderRow & { client: any; order_items: any })[]).map(
    (o): OrderWithClient => {
      const { order_items, client: rawClient, ...rest } = o;
      const client = Array.isArray(rawClient)
        ? (rawClient[0] ?? null)
        : rawClient;
      return {
        ...rest,
        client,
        items_count: order_items?.length ?? 0,
      };
    },
  );
}

export async function getDashboardData(
  pressingId: string,
): Promise<DashboardData> {
  const { db } = await getContext();

  // Récupération des données depuis les vues SQL aggregées
  const [dashboardStats, monthlyStats, recentOrdersStats] = await Promise.all([
    db.from("stats_dashboard").select("*").single() as unknown as {
      data: {
        current_month_revenue: number;
        previous_month_revenue: number;
        current_month_orders_count: number;
        pending_orders_count: number;
        ready_orders_count: number;
        new_clients_count: number;
      } | null;
    },
    db
      .from("stats_monthly_revenue")
      .select("month, revenue")
      .order("month", { ascending: false })
      .limit(12) as unknown as {
      data: { month: string; revenue: number }[] | null;
    },
    db
      .from("stats_recent_orders")
      .select("id, total, status, created_at, customer_name") as unknown as {
      data:
        | {
            id: string;
            total: number;
            status: string;
            created_at: string;
            customer_name: string;
          }[]
        | null;
    },
  ]);

  // Gestion des erreurs si les vues ne retournent rien
  if (!dashboardStats.data || !monthlyStats.data || !recentOrdersStats.data) {
    return {
      revenue: { total: 0, change: 0 },
      orders: { count: 0 },
      pendingOrders: 0,
      readyOrders: 0,
      newClients: 0,
      monthlyRevenue: [],
      recentOrders: [],
    };
  }

  // Calcul du taux d'évolution du chiffre d'affaires
  const currentRevenue = dashboardStats.data.current_month_revenue;
  const previousRevenue = dashboardStats.data.previous_month_revenue;
  const revenueChange =
    previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

  // Formatage des données du graphique mensuel (garder les 12 derniers mois)
  const monthlyRevenueMap = new Map<string, number>();
  const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });

  // Initialiser les 12 derniers mois à 0
  for (let i = 11; i >= 0; i--) {
    const date = startOfMonth(i);
    const monthName = monthFormatter.format(date);
    monthlyRevenueMap.set(monthName, 0);
  }

  // Remplir avec les données de la vue
  monthlyStats.data.forEach((row) => {
    monthlyRevenueMap.set(row.month, row.revenue);
  });

  return {
    revenue: {
      total: currentRevenue,
      change: revenueChange,
    },
    orders: {
      count: dashboardStats.data.current_month_orders_count,
    },
    pendingOrders: dashboardStats.data.pending_orders_count,
    readyOrders: dashboardStats.data.ready_orders_count,
    newClients: dashboardStats.data.new_clients_count,
    monthlyRevenue: Array.from(monthlyRevenueMap.entries()).map(
      ([month, revenue]) => ({ month, revenue }),
    ),
    recentOrders: recentOrdersStats.data.map((o) => ({
      id: o.id,
      total: o.total,
      status: o.status as OrderStatus,
      createdAt: new Date(o.created_at),
      customer: {
        name: o.customer_name ?? "Client",
        avatarUrl: null,
      },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Commandes                                                                    */
/* -------------------------------------------------------------------------- */

export interface OrderWithClient extends OrderRow {
  client: Pick<ClientRow, "id" | "full_name" | "phone"> | null;
  items_count: number;
}

export interface OrderDetail extends OrderWithClient {
  items: (OrderItemRow & { article: Pick<ArticleRow, "image_url"> | null })[];
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
      .map((client: { id: string }) => client.id)
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
  return ((data ?? []) as (OrderRow & { client: any; order_items: any })[]).map(
    (o): OrderWithClient => {
      const { order_items, client: rawClient, ...rest } = o;
      const client = Array.isArray(rawClient)
        ? (rawClient[0] ?? null)
        : rawClient;
      return {
        ...rest,
        client,
        items_count: order_items?.length ?? 0,
      };
    },
  );
}

export async function getOrderDetail(
  orderId: string,
): Promise<OrderDetail | null> {
  const { db, pressing } = await getContext();
  if (!pressing) return null;

  // Validation stricte des UUIDs pour éviter les accès non autorisés
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

export interface OrderFilters {
  status?: OrderStatus | "all";
  search?: string;
  limit?: number;
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

/**
 * Annuaire des clients du pressing courant.
 *
 * Le `pressingId` est FACULTATIF et volontairement ignore : la fonction
 * resout toujours le pressing depuis la session (`getContext`). Le parametre
 * est tolere pour la compatibilite avec les appelants qui le fournissent, et
 * on verifie qu'il designe bien le pressing courant plutot que de l'ignorer
 * silencieusement — un appelant qui passerait l'ID d'un autre tenant doit
 * echouer, pas lire les mauvais clients.
 */
export async function getClients(pressingId?: string): Promise<ClientRow[]> {
  const { db, pressing } = await getContext();
  if (!pressing) return [];
  if (pressingId && pressingId !== pressing.id) return [];

  const { data, error } = await db
    .from("clients")
    .select("*")
    .eq("pressing_id", pressing.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }

  return data;
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

  // Récupérer la liste des clients
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

  // Récupérer les agrégats depuis la vue SQL
  const [clientsRes, aggregatesRes] = await Promise.all([
    query,
    db
      .from("stats_clients_aggregates")
      .select(
        "client_id, orders_count, total_spent, last_order_date",
      ) as unknown as {
      data:
        | {
            client_id: string;
            orders_count: number;
            total_spent: number;
            last_order_date: string | null;
          }[]
        | null;
    },
  ]);

  // Convertir les agrégats en Map pour accès rapide
  const aggregatesMap = new Map<
    string,
    {
      orders_count: number;
      total_spent: number;
      last_order_date: string | null;
    }
  >();

  for (const row of aggregatesRes.data ?? []) {
    aggregatesMap.set(row.client_id, row);
  }

  return (clientsRes.data ?? []).map((client: ClientRow) => {
    const aggregate = aggregatesMap.get(client.id);
    return {
      ...client,
      orders_count: aggregate?.orders_count ?? 0,
      revenue: aggregate?.total_spent ?? 0,
      outstanding: 0,
      last_order: aggregate?.last_order_date ?? null,
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

  // Même logique de transformation que dans getOrders()
  const orders = (
    (ordersRes.data ?? []) as (OrderRow & { client: any; order_items: any })[]
  ).map((o): OrderWithClient => {
    const { order_items, client: rawClient, ...rest } = o;
    const client = Array.isArray(rawClient)
      ? (rawClient[0] ?? null)
      : rawClient;
    return {
      ...rest,
      client,
      items_count: order_items?.length ?? 0,
    };
  });
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

  // Créé la date du début d'aujourd'hui (minuit)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [paymentsRes, unpaidRes] = await Promise.all([
    db
      .from("payments")
      .select("*")
      .eq("pressing_id", pressingId)
      .eq("status", "success")
      .gte("paid_at", startOfToday.toISOString())
      .order("paid_at", { ascending: false })
      .limit(100) as unknown as { data: PaymentRow[] | null },
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
      payments
        .map((p: PaymentRow) => p.order_id)
        .filter((id: string | null): id is string => Boolean(id)),
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
    (unpaidRes.data ?? []) as (OrderRow & { client: any; order_items: any })[]
  ).map((o): OrderWithClient => {
    const { order_items, client: rawClient, ...rest } = o;
    const client = Array.isArray(rawClient)
      ? (rawClient[0] ?? null)
      : rawClient;
    return {
      ...rest,
      client,
      items_count: order_items?.length ?? 0,
    };
  });

  return {
    collectedToday: payments.reduce(
      (sum: number, payment: PaymentRow) => sum + payment.amount,
      0,
    ),
    paymentsCount: payments.length,
    byMethod: [...byMethodMap.entries()]
      .map(([method, value]) => ({ method, ...value }))
      .sort((a, b) => b.total - a.total),
    recent: payments.map((payment: PaymentRow) => ({
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

  // Transforme les données brutes en OrderWithClient
  const toDeliver = (
    (toDeliverRes.data ?? []) as (OrderRow & {
      client: any;
      order_items: any;
    })[]
  ).map((o): OrderWithClient => {
    const { order_items, client: rawClient, ...rest } = o;
    const client = Array.isArray(rawClient)
      ? (rawClient[0] ?? null)
      : rawClient;
    return {
      ...rest,
      client,
      items_count: order_items?.length ?? 0,
    };
  });
  const toCollect = (
    (toCollectRes.data ?? []) as (OrderRow & {
      client: any;
      order_items: any;
    })[]
  ).map((o): OrderWithClient => {
    const { order_items, client: rawClient, ...rest } = o;
    const client = Array.isArray(rawClient)
      ? (rawClient[0] ?? null)
      : rawClient;
    return {
      ...rest,
      client,
      items_count: order_items?.length ?? 0,
    };
  });
  const missions = missionsRes.data ?? [];

  // Numero de commande et client des missions, resolus en une requete.
  const orderIds = [
    ...new Set(missions.map((mission: DeliveryRow) => mission.order_id)),
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

  const lateThreshold = Date.now() - LATE_ORDER_HOURS * 3_600_000;

  return {
    toDeliver,
    toCollect,
    missions: missions.map((mission: DeliveryRow) => ({
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

  // Créé la date de début il y a X jours
  const startOfDaysAgo = new Date();
  startOfDaysAgo.setDate(startOfDaysAgo.getDate() - (REPORT_WINDOW_DAYS - 1));
  startOfDaysAgo.setHours(0, 0, 0, 0);

  const { data: orderRows } = await db
    .from("orders")
    .select(
      "id, status, payment_status, total, amount_paid, payment_method, created_at, client_id",
    )
    .eq("pressing_id", pressingId)
    .gte("created_at", startOfDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(REPORT_ORDER_LIMIT);

  const orders = orderRows ?? [];
  const orderIds = orders.map((order: OrderRow) => order.id);

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

  const clientNames = new Map<string, string>(
    (clientRows ?? []).map((client: Pick<ClientRow, "id" | "full_name">) => [
      client.id,
      client.full_name,
    ]),
  );
  const billable = orders.filter(
    (order: OrderRow) => order.status !== ORDER_STATUS.CANCELLED,
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

  const billableIds = new Set(billable.map((order: OrderRow) => order.id));

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
  /** Annulées avant envoi. */
  cancelled: number;
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
  | "attempted_at"
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

  const counts: NotificationCounts = {
    queued: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const row of data ?? []) {
    if (row.status === "sent") counts.sent += 1;
    else if (row.status === "failed") counts.failed += 1;
    else if (row.status === "cancelled") counts.cancelled += 1;
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
      "id, order_id, channel, event, recipient, message, status, error_message, retries, created_at, attempted_at",
    )
    .eq("pressing_id", pressingId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_LOG_LIMIT);

  return data ?? [];
}
