#!/usr/bin/env node
/**
 * PressIvoire — creation d'un compte de test confirme.
 *
 * A quoi ca sert ? L'inscription normale exige une confirmation par email, or
 * le SMTP du projet n'est pas configure : impossible de creer un compte
 * utilisable depuis /register. Ce script passe par l'API Admin, qui cree
 * ET confirme le compte en un appel, et declenche donc le trigger
 * `handle_new_user()` comme une inscription reelle.
 *
 * Usage :
 *   node scripts/db-create-test-user.mjs
 *   node scripts/db-create-test-user.mjs --email moi@exemple.ci --password MonPass2026 --role owner
 *
 * ⚠ Compte de developpement. Ne jamais l'utiliser en production : le mot de
 *   passe transite en clair sur la ligne de commande et dans le shell history.
 */

import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const val = (flag) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined;
};

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

const email = val("--email") ?? `demo.${Date.now()}@pressingpro.ci`;
const password = val("--password") ?? "Pressing2026";
const role = val("--role") === "client" ? "client" : "owner";
const fullName = val("--name") ?? (role === "owner" ? "Démo Gérant" : "Démo Client");
const phone = val("--phone") ?? "+2250700000099";

console.log(dim("\n  Lecture de la cle service_role depuis .env…\n"));
const env = {};
try {
  const { readFileSync } = await import("node:fs");
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
} catch {
  console.error(red("  .env introuvable. Lance d'abord la migration : npm run db:migrate\n"));
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error(red("  NEXT_PUBLIC_SUPABASE_URL ou cle service_role absente du .env\n"));
  process.exit(1);
}

// 1. Creation + confirmation immediate
const res = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullName, phone },
  }),
});

const created = await res.json();
if (!res.ok) {
  console.error(red(`  Echec de la creation : ${JSON.stringify(created)}\n`));
  process.exit(1);
}

console.log(green("  Compte cree et confirme."));
console.log(`    email    : ${email}`);
console.log(`    role     : ${role}`);
console.log(`    user_id  : ${created.id}`);

// 2. Verification du trigger handle_new_user()
const token = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
}).trim();
const ref = (url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) ?? [])[1];

const sql = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `select role, full_name, phone, pressing_id from profiles where id = '${created.id}'`,
  }),
});
const rows = await sql.json();

if (Array.isArray(rows) && rows.length === 1) {
  const p = rows[0];
  console.log(green("\n  Trigger handle_new_user() : OK"));
  console.log(dim(`    role=${p.role}  full_name="${p.full_name}"  phone=${p.phone}`));
  console.log(dim(`    pressing_id=${p.pressing_id ?? "null — onboarding restant a faire"}`));
} else {
  console.error(red("\n  ATTENTION : aucune ligne profiles, le trigger n'a pas fired.\n"));
}

console.log(`\n  Mot de passe : ${dim(password)}`);
console.log(dim(`  Connexion    : http://localhost:3000/login\n`));
console.log(dim("  Ce compte n'a AUCUN pressing rattache : il aterrit sur"));
console.log(dim("  « onboarding requis » tant que l'Etape 2 n'est pas livree.\n"));
