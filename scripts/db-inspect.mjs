/**
 * Inspection de l'etat reel de la base Supabase liee.
 *
 * Sert a verifier ce que contient reellement la base avant toute ecriture :
 * un script qui insere des articles sans regarder d'abord risque de
 * doubler un catalogue deja peuple.
 *
 * Lecture seule : n'ecrit jamais. Utilise la cle `service_role` pour voir
 * les lignes de tous les pressings — la cle anon ne verrait rien, les RLS
 * filtrant sur la session, qui n'existe pas ici.
 *
 *   node scripts/db-inspect.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Lit le fichier .env sans dependre de dotenv. */
function readEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) {
    console.error(".env introuvable. Copiez .env.example en .env.");
    process.exit(1);
  }
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [
          line.slice(0, i).trim(),
          line
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

/** GET REST : retourne le tableau renvoyé, ou vide en cas d'erreur. */
async function select(table, columns) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${columns}`, { headers });
  if (!res.ok) {
    console.error(`  ! ${table} : HTTP ${res.status}`);
    return [];
  }
  return res.json();
}

const pressings = await select("pressings", "id,name,commune,subscription_plan");
const articles = await select("articles", "id,pressing_id,name");
const profiles = await select("profiles", "id,full_name,role,pressing_id,is_active");
const orders = await select("orders", "id,pressing_id");

console.log(`Base : ${url}\n`);

console.log(`=== PRESSINGS (${pressings.length}) ===`);
for (const p of pressings) {
  console.log(
    `  ${p.id.slice(0, 8)}  ${String(p.name).padEnd(26)} ${String(p.commune).padEnd(12)} ${p.subscription_plan}`,
  );
}

console.log(`\n=== ARTICLES PAR PRESSING (${articles.length} au total) ===`);
const byPressing = new Map();
for (const a of articles) {
  byPressing.set(a.pressing_id, (byPressing.get(a.pressing_id) || 0) + 1);
}
for (const p of pressings) {
  const n = byPressing.get(p.id) || 0;
  console.log(`  ${String(p.name).padEnd(26)} ${n} article(s)${n === 0 ? "  <- VIDE" : ""}`);
}
const orphans = articles.filter(
  (a) => !pressings.some((p) => p.id === a.pressing_id),
).length;
if (orphans > 0) console.log(`  (${orphans} article(s) rattaches a un pressing inexistant)`);

console.log(`\n=== PROFILES (${profiles.length}) ===`);
for (const p of profiles) {
  const owner = pressings.find((x) => x.id === p.pressing_id);
  console.log(
    `  ${String(p.full_name || "(sans nom)").padEnd(22)} ${String(p.role).padEnd(9)} ${
      owner ? owner.name : "AUCUN PRESSING"
    }${p.is_active ? "" : "  (desactive)"}`,
  );
}

console.log(`\n=== COMMANDES (${orders.length}) ===`);
const ordersByPressing = new Map();
for (const o of orders) {
  ordersByPressing.set(o.pressing_id, (ordersByPressing.get(o.pressing_id) || 0) + 1);
}
for (const p of pressings) {
  console.log(`  ${String(p.name).padEnd(26)} ${ordersByPressing.get(p.id) || 0}`);
}

/*
 * Audit du catalogue : on verifie la QUALITE du seed, pas seulement sa
 * presence. Un catalogue vide fait planter la prise de commande ; un
 * catalogue incoherent (prix negatifs, articles inactifs) produit des
 * totaux faux sans lever la moindre erreur.
 */
const full = await select(
  "articles",
  "name,category,wash_type,price,estimated_hours,is_active,pressing_id,sort_order",
);
console.log(`\n=== AUDIT CATALOGUE (${full.length} lignes) ===`);
console.log(
  `  categories  : ${[...new Set(full.map((a) => a.category))].join(", ")}`,
);
console.log(
  `  lavages     : ${[...new Set(full.map((a) => a.wash_type))].join(", ")}`,
);
console.log(`  inactifs    : ${full.filter((a) => !a.is_active).length}`);
console.log(`  prix <= 0   : ${full.filter((a) => a.price <= 0).length}`);
console.log(`  delai <= 0  : ${full.filter((a) => a.estimated_hours <= 0).length}`);
console.log(
  `  nom vide    : ${full.filter((a) => !a.name || !a.name.trim()).length}`,
);

const prices = full.map((a) => a.price).sort((x, y) => x - y);
console.log(
  `  prix        : min ${prices[0]} · median ${prices[Math.floor(prices.length / 2)]} · max ${prices[prices.length - 1]} F CFA`,
);

/*
 * Le catalogue de reference est ce que l'onboarding propose au gerant, et
 * ce que la fonction `get_reference_catalogue()` renvoie. On verifie donc
 * que la migration 005 l'a bien enrichi : sans cela, les nouveaux pressings
 * seraient crees avec l'ancien jeu de 28 articles.
 */
const referenceId = "00000000-0000-4000-8000-000000000001";
const reference = full.filter((a) => a.pressing_id === referenceId);
if (reference.length > 0) {
  console.log(`\n=== CATALOGUE DE REFERENCE (${reference.length} articles) ===`);
  console.log(
    `  dont enrichis (sort_order >= 40) : ${reference.filter((a) => a.sort_order >= 40).length}`,
  );
}


