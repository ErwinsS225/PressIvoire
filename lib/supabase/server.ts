import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

type CookieStore = ReturnType<typeof cookies>;
type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

/**
 * Client Supabase cote serveur (Server Components, Server Actions, Route Handlers).
 *
 * La session est lue/ecrite depuis les cookies httpOnly : le cookie store de
 * Next.js est partage entre le Server Components, le Route Handler et le
 * middleware (@/middleware) qui rafraichit la session en permanence.
 *
 * Exemple :
 *   const supabase = createClient();
 *   const { data } = await supabase.from("orders").select("*");
 *
 * Note : en Server Components "use client" non requis, mais l'ecriture de
 * cookie n'est possible que dans Server Actions / Route Handlers (try/catch).
 */
export function createClient() {
  const cookieStore: CookieStore = cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Appelle depuis un Server Component : cookies en lecture seule.
          // Le middleware se charge du refresh de session (Phase 2).
        }
      },
    },
  });
}

export type SupabaseServerClient = ReturnType<typeof createClient>;
