#!/usr/bin/env node
/**
 * PressIvoire — application des migrations SQL sur un projet Supabase distant.
 *
 * Utilise l'API Management Supabase (POST /v1/projects/{ref}/database/query),
 * qui est le meme canal que le SQL Editor du dashboard — mais scriptable, et
 * SANS avoir besoin du mot de passe de la base de donnees.
 *
 * Prerequis : un Personal Access Token (sbp_...) du compte qui POSSEDE le
 * projet cible. Dashboard > Account Preferences > Personal Access Tokens.
 *
 * Usage :
 *   node scripts/db-apply.mjs                # 001_init.sql + seed.sql
 *   node scripts/db-apply.mjs --dry-run      # verifie l'acces, n'execute rien
 *   node scripts/db-apply.mjs --no-seed      # schema seul
 *   node scripts/db-apply.mjs --file a.sql   # fichiers explicites
 *
 * Options :
 *   --token <sbp_...>   Personal Access Token (sinon env SUPABASE_ACCESS_TOKEN)
 *   --project <ref>     project ref (sinon SUPABASE_PROJECT_ID / .env)
 *   --file <path>       fichier SQL (repetable, remplace la liste par defaut)
 *   --no-seed           ne pas executer supabase/seed.sql
 *   --dry-run           controle d'acces uniquement
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const API = "https://api.supabase.com";
const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_FILES = ["supabase/migrations/001_init.sql", "supabase/seed.sql"];

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined;
};
const dryRun = has("--dry-run");
const noSeed = has("--no-seed");
const fileFlags = argv.reduce((a, v, i) => (v === "--file" ? [...a, argv[i + 1]] : a), []);
const files = (fileFlags.length ? fileFlags : DEFAULT_FILES).filter(
  (f) => !(noSeed && f.endsWith("seed.sql")),
);

/* ----------------------------------------------------------------- token */
function tokenFromKeychain() {
  if (process.platform !== "darwin") return undefined;
  try {
    return execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

async function readToken() {
  for (const cand of [val("--token"), process.env.SUPABASE_ACCESS_TOKEN, tokenFromKeychain()]) {
    if (cand?.trim()) return cand.trim();
  }
  const p = join(homedir(), ".supabase", "access-token");
  if (existsSync(p)) {
    const t = (await readFile(p, "utf8")).trim();
    if (t) return t;
  }
  return undefined;
}

async function readProjectRef() {
  const explicit = val("--project") || process.env.SUPABASE_PROJECT_ID;
  if (explicit) return explicit.trim();
  const envPath = join(ROOT, ".env");
  if (existsSync(envPath)) {
    const m = (await readFile(envPath, "utf8")).match(
      /^(?:NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL)\s*=\s*https:\/\/([a-z0-9]+)\.supabase\.co/m,
    );
    if (m) return m[1];
  }
  return undefined;
}

/* -------------------------------------------------------------- execution */
async function runQuery(ref, token, query) {
  const res = await fetch(`${API}/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const e = new Error(body?.message ?? body?.error ?? body?.msg ?? text ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return body;
}

function explainError(err, ref) {
  if (err.status === 401)
    return [
      red("401 — Personal Access Token invalide ou expire."),
      "   → regenere : Dashboard > Account Preferences > Personal Access Tokens.",
    ];
  if (err.status === 403)
    return [
      red(`403 — le token n'a PAS les droits sur le projet "${ref}".`),
      `   → soit il vient d'un AUTRE compte que celui qui possede ${ref},`,
      "   → soit ce projet est dans une autre organisation.",
      `   → verifie : supabase projects list   ("${ref}" doit y apparaitre).`,
    ];
  if (err.status === 404) return [red(`404 — projet "${ref}" introuvable pour ce token.`)];
  return [red(String(err.message))];
}

/* ------------------------------------------------------------------- main */
async function main() {
  console.log(bold("\nPressIvoire — application des migrations Supabase\n"));

  const ref = await readProjectRef();
  if (!ref) {
    console.error(red("Impossible de deduire le project ref."));
    console.error("   → passe --project <ref> ou renseigne SUPABASE_PROJECT_ID.\n");
    process.exit(1);
  }
  console.log(`  projet   : ${bold(ref)}`);

  const token = await readToken();
  if (!token) {
    console.error(red("  Aucun Personal Access Token (sbp_...) trouve."));
    console.error("   → export SUPABASE_ACCESS_TOKEN=sbp_...   ou   --token\n");
    process.exit(1);
  }
  console.log(`  token    : ${dim(token.slice(0, 10) + "…")}`);

  try {
    await runQuery(ref, token, "select 1 as ok");
    console.log(`  acces    : ${green("OK — ce token peut executer du SQL sur ce projet")}\n`);
  } catch (err) {
    console.error(explainError(err, ref).join("\n") + "\n");
    process.exit(2);
  }

  if (dryRun) {
    console.log(yellow("  --dry-run : aucune modification effectuee.\n"));
    return;
  }

  for (const rel of files) {
    const abs = resolve(ROOT, rel);
    if (!existsSync(abs)) {
      console.error(red(`  fichier introuvable : ${rel}`));
      process.exit(1);
    }
    const sql = await readFile(abs, "utf8");
    console.log(bold(`  → ${rel}`) + dim(`  (${(Buffer.byteLength(sql) / 1024).toFixed(1)} Ko)`));
    try {
      await runQuery(ref, token, sql);
      console.log(green("     OK"));
    } catch (err) {
      console.error(red(`     ECHEC : ${err.message}`));
      if (err.status === 400) console.error(dim("     (erreur SQL — corrige le fichier et relance)"));
      process.exit(1);
    }
  }

  // PostgREST garde un cache de schema : sans ce reload, l'app continue de
  // renvoyer PGRST205 juste apres la migration.
  try {
    await runQuery(ref, token, "notify pgrst, 'reload schema'");
    console.log(dim("\n  cache PostgREST recharge (notify pgrst)"));
  } catch {
    console.log(dim("\n  (reload du cache PostgREST non confirme — sans gravite)"));
  }

  const res = await runQuery(
    ref,
    token,
    `select count(*)::int as tables from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`,
  );
  const n = Array.isArray(res) ? res[0]?.tables : res?.tables;
  console.log(green(`  verification : ${n ?? "?"} table(s) dans le schema public\n`));
}

main().catch((e) => {
  console.error(red(`\nErreur inattendue : ${e.message}\n`));
  process.exit(1);
});

