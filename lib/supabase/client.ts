"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Client Supabase cote navigateur (Client Components).
 *
 * Utilise @supabase/ssr : la session est stockee dans des cookies httpOnly,
 * ce qui permet au Server Components / middleware d'etre connectes aussi.
 *
 * Exemple :
 *   const supabase = createClient();
 *   const { data } = await supabase.from("orders").select("*");
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
