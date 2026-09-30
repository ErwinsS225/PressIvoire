#!/usr/bin/env node
/**
 * PressIvoire — verification de l'etat de la base apres migration.
 *
 * Interroge l'API Management (meme canal que scripts/db-apply.mjs) et affiche :
 *   - la presence des 11 tables attendues + l'activation de RLS sur chacune
 *   - le nombre de policies, les helpers RLS, les buckets Storage
 *   - le volume du seed (pressings / articles / abonnements)
 *   - une verification fonctionnelle via PostgREST (anon ne doit rien voir)
 *
 * Usage : npm run db:verify     Sortie : 0 si tout est vert, 1 sinon.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const API = "https://api.supabase.com";
const ROOT = resolve(import.meta.dirname, "..");
const EXPECTED = [
  "pressings", "profiles", "articles", "clients", "orders", "order_items",
  "payments", "deliveries", "saas_subscriptions", "customer_packs", "notifications",
];

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

let failed = 0;
const check = (label, pass, detail = "") => {
  if (!pass) failed++;
  console.log(`  ${pass ? green("✔") : red("✘")} ${label.padEnd(34)} ${dim(detail)}`);
};

function tokenFromKeychain() {
  if (process.platform !== "darwin") return undefined;
  try {
    return execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

async function readToken() {
  for (const c of [process.env.SUPABASE_ACCESS_TOKEN, tokenFromKeychain()]) {
    if (c?.trim()) return c.trim();
  }
  const p = join(homedir(), ".supabase", "access-token");
  if (existsSync(p)) return (await readFile(p, "utf8")).trim() || undefined;
  return undefined;
}

async function readConf() {
  const env = {};
  if (existsSync(join(ROOT, ".env"))) {
    for (const line of (await readFile(join(ROOT, ".env"), "utf8")).split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  const ref =
    process.env.SUPABASE_PROJECT_ID ??
    (env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "").match(
      /https:\/\/([a-z0-9]+)\.supabase\.co/,
    )?.[1];
  return {
    ref,
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? `https://${ref}.supabase.co`,
    publishable: env.SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

async function q(ref, token, sql) {
  const res = await fetch(`${API}/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`SQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}


async function main() {
  console.log(bold("\nPressIvoire — verification de la base\n"));
  const { ref, url, publishable } = await readConf();
  const token = await readToken();
  if (!ref || !token) {
    console.error(red("  project ref ou Personal Access Token introuvable.\n"));
    process.exit(1);
  }
  console.log(dim(`  projet : ${ref}\n`));

  const tables = await q(
    ref,
    token,
    `select c.relname as name, c.relrowsecurity as rls
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`,
  );
  const found = new Map(tables.map((t) => [t.name, t.rls]));

  console.log(bold("  Tables + RLS"));
  for (const t of EXPECTED) {
    const present = found.has(t);
    check(t, present && found.get(t) === true, present ? `rls=${found.get(t)}` : "MANQUANTE");
  }
  const extra = [...found.keys()].filter((k) => !EXPECTED.includes(k));
  if (extra.length) console.log(dim(`  (hors liste : ${extra.join(", ")})`));

  console.log(bold("\n  Securite / structure"));
  const pol = await q(
    ref, token, `select count(*)::int as n from pg_policies where schemaname = 'public'`,
  );
  check("policies RLS", pol[0].n >= 11, `${pol[0].n} policies`);
  const fn = await q(
    ref, token,
    `select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname like 'app\\_%'`,
  );
  check("helpers RLS app_*", fn[0].n >= 8, `${fn[0].n} fonctions`);
  const bk = await q(
    ref, token,
    `select count(*)::int as n from storage.buckets
      where id in ('order-photos','delivery-proofs','article-images','pressing-assets')`,
  );
  check("buckets Storage", bk[0].n === 4, `${bk[0].n}/4`);

  console.log(bold("\n  Seed"));
  for (const [label, table, min] of [
    ["pressings de demo", "pressings", 4],
    ["articles du catalogue", "articles", 15],
    ["abonnements SaaS", "saas_subscriptions", 1],
  ]) {
    const r = await q(ref, token, `select count(*)::int as n from public.${table}`);
    check(label, r[0].n >= min, `${r[0].n} lignes (attendu >= ${min})`);
  }

  console.log(bold("\n  Isolation RLS (cle publique, sans session)"));
  if (publishable) {
    for (const t of ["orders", "clients", "profiles", "notifications"]) {
      const res = await fetch(`${url}/rest/v1/${t}?select=id`, {
        headers: { apikey: publishable, Authorization: `Bearer ${publishable}` },
      });
      const body = await res.json();
      const empty = Array.isArray(body) && body.length === 0;
      check(`anon ne voit rien : ${t}`, empty, empty ? "[]" : JSON.stringify(body).slice(0, 60));
    }
  } else {
    console.log(dim("  (cle publique absente du .env — test ignore)"));
  }

  console.log(
    failed === 0
      ? green(`\n  ✔ Tout est vert (${EXPECTED.length} tables, RLS actif).\n`)
      : red(`\n  ✘ ${failed} controle(s) en echec.\n`),
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(red(`\n  Erreur : ${e.message}\n`));
  process.exit(1);
});
