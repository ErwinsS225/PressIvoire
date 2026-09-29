/**
 * Tests de cohérence pour les vues SQL agrégées (008_views_aggregates.sql)
 * Vérifie que les calculs JavaScript originels correspondent aux valeurs SQL
 *
 * ⚠️ TEST D'INTÉGRATION — nécessite une vraie base Supabase.
 *
 * Contrairement au reste des tests de `lib`, ce fichier interroge une base
 * réelle avec la clé `service_role` : il n'est pas exécutable dans `npm test`
 * ni en CI, où ces variables n'existent pas. Il est donc `skipIf` : sans
 * identifiants, les tests sont ignorés proprement au lieu de faire échouer la
 * suite sur « supabaseUrl is required » — un échec qui n'a rien à voir avec le
 * code que l'on veut vérifier.
 *
 * Pour le lancer en local :
 *   set -a && source .env && set +a && npm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Les deux variables sont nécessaires : l'une sans l'autre ne sert à rien. */
const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

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

describe("Vues SQL des agrégats — Cohérence des données", () => {
  // Le client n'est instancié que si les identifiants existent : `createClient`
  // lève sur une URL vide, et cette levée se produirait dès la collecte.
  let mockSupabase: SupabaseClient | null = null;

  beforeAll(() => {
    if (hasSupabase) {
      mockSupabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
    }
  });

  afterAll(() => {
    mockSupabase = null;
  });

  const TEST_PRESSING_ID = process.env.TEST_PRESSING_ID ?? null;

  it.skipIf(!hasSupabase)(
    "stats_dashboard retourne les mêmes valeurs que les calculs JS",
    async () => {
      if (!mockSupabase) return;

      // Récupérer les données depuis la vue SQL
      const { data: sqlStats } = await mockSupabase
        .from("stats_dashboard")
        .select("*")
        .single();

      // Recalculer les mêmes valeurs avec la méthode JavaScript originale
      const thirtyDaysAgo = startOfMonth(1);
      let currentMonthOrders: { data: { total: number }[] | null } = {
        data: null,
      };

      if (TEST_PRESSING_ID) {
        currentMonthOrders = await mockSupabase
          .from("orders")
          .select("total")
          .eq("pressing_id", TEST_PRESSING_ID)
          .gte("created_at", thirtyDaysAgo.toISOString());
      }

      const jsCurrentRevenue = (currentMonthOrders.data ?? []).reduce(
        (sum, o) => sum + o.total,
        0,
      );

      // Vérifier la cohérence
      expect(sqlStats?.current_month_revenue).toBe(jsCurrentRevenue);
    },
  );

  it.skipIf(!hasSupabase)(
    "stats_monthly_revenue retourne le bon nombre de mois",
    async () => {
      if (!mockSupabase) return;

      const { data: monthlyStats } = await mockSupabase
        .from("stats_monthly_revenue")
        .select("*");

      // Doit retourner au maximum 12 mois
      expect(monthlyStats?.length).toBeLessThanOrEqual(12);
    },
  );

  it.skipIf(!hasSupabase)(
    "stats_clients_aggregates agrège correctement par client",
    async () => {
      if (!mockSupabase) return;

      const { data: clientStats } = await mockSupabase
        .from("stats_clients_aggregates")
        .select("*");

      // Tous les totaux doivent être positifs ou nuls
      clientStats?.forEach((client) => {
        expect(client.total_revenue).toBeGreaterThanOrEqual(0);
        expect(client.orders_count).toBeGreaterThanOrEqual(0);
        expect(client.outstanding).toBeGreaterThanOrEqual(0);
      });
    },
  );

  it.skipIf(!hasSupabase)(
    "stats_weekly_report retourne 7 jours de données",
    async () => {
      if (!mockSupabase) return;

      const { data: weeklyStats } = await mockSupabase
        .from("stats_weekly_report")
        .select("*");

      // Doit retourner exactement 7 jours
      expect(weeklyStats?.length).toBe(7);
    },
  );
});
