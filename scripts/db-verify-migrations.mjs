/*
 * Verification des migrations 005 et 006.
 *
 * `db-apply.mjs` applique un fichier mais n'affiche pas le resultat d'un
 * SELECT : on ne peut donc pas verifier apres coup. Ce script renvoie les
 * lignes pour controler a l'oeil ce qui a ete reellement ecrit.
 *
 *   node scripts/db-verify-migrations.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(path.join(ROOT, ".env"), "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [
          l.slice(0, i).trim(),
          l.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

/**
 * Personal Access Token.
 *
 * Meme ordre de resolution que `db-apply.mjs` : variable d'environnement,
 * puis keychain macOS (c'est là que `supabase login` range le jeton), puis
 * le fichier `~/.supabase/access-token`. Le jeton n'est jamais écrit dans le
 * dépôt.
 */
function readToken() {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  if (process.platform === "darwin") {
    try {
      const t = execFileSync(
        "security",
        ["find-generic-password", "-s", "Supabase CLI", "-w"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
      if (t) return t;
    } catch {
      /* pas de keychain : on tente le fichier */
    }
  }

  const file = path.join(os.homedir(), ".supabase", "access-token");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  return "";
}

const env = readEnv();
const ref = env.SUPABASE_PROJECT_ID ?? "";
const token = readToken();

if (!ref || !token) {
  console.error("SUPABASE_PROJECT_ID ou Personal Access Token manquant.");
  console.error("   → supabase login, ou export SUPABASE_ACCESS_TOKEN=sbp_...");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message ?? JSON.stringify(body));
  return body;
}

// --- Migration 006 : fonctions d'equipe -----------------------------------
console.log("=== 006 — FONCTIONS D'EQUIPE ===");
const fns = await query(`
  select p.proname                                   as fonction,
         p.prosecdef                                 as security_definer,
         coalesce(array_to_string(p.proconfig, ','), '-') as search_path,
         has_function_privilege('anon', p.oid, 'EXECUTE')          as anon,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('add_team_member','update_team_member','remove_team_member')
   order by p.proname;
`);
for (const f of fns) {
  console.log(
    `  ${String(f.fonction).padEnd(22)} definer=${f.security_definer ? "oui" : "NON"}  path=${String(f.search_path).padEnd(24)} anon=${f.anon ? "OUI (!)" : "non"}  auth=${f.authenticated ? "oui" : "NON"}`,
  );
}
console.log(
  fns.length === 3 ? "  -> 3 fonctions presentes" : `  -> ATTENDU 3, TROUVE ${fns.length}`,
);

// --- Migration 005 : catalogue ---------------------------------------------
console.log("\n=== 005 — CATALOGUE ===");
const cat = await query(`
  select pr.name                      as pressing,
         count(*)                    as articles,
         count(*) filter (where a.sort_order >= 40) as enrichis
    from public.articles a
    join public.pressings pr on pr.id = a.pressing_id
   group by pr.name
   order by pr.name;
`);
for (const c of cat) {
  console.log(
    `  ${String(c.pressing).padEnd(28)} ${String(c.articles).padStart(3)} article(s), dont ${c.enrichis} enrichis`,
  );
}

const refCat = await query(`
  select count(*) as total
    from public.articles
   where pressing_id = public.reference_pressing_id();
`);
console.log(
  `\n  Catalogue de reference : ${refCat[0].total} articles (ce que l'onboarding propose)`,
);

// --- Coherence desRoles ---------------------------------------------------
console.log("\n=== COHERENCE DES ROLES (colonnes profile.role) ===");
const roles = await query(
  `select role, count(*) as n from public.profiles group by role order by role;`,
);
for (const r of roles) console.log(`  ${String(r.role).padEnd(10)} ${r.n}`);

console.log(
  "\nRappel : les colonnes de roles sont des text avec CHECK, pas des enums —",
);
console.log("l'affichage en anglais dans PostgREST est normal, l'application traduit.");
