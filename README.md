# PressingPro ⚡🧺

SaaS multi-tenant de **gestion de pressing / pressing-à-sec**, pensé pour le marché
ivoirien (Abidjan). Commandes, collecte & livraison, paiement mobile money
(Wave, Orange, MTN, Moov), fidélité, SMS WhatsApp et pilotage du chiffre d'affaires.

> **État actuel : Phase 1 — Étape 1** _(scaffold + schéma de base de données +
> seed ivoirien + clients Supabase typés + thème)_.
> La suite (Auth, onboarding, dashboard, app client…) est découpée selon le
> contrat `flo.md`.

---

## 1. Prérequis

| Outil                      | Version                    | Vérification             |
| -------------------------- | -------------------------- | ------------------------ |
| Node.js                    | ≥ 18.18 (20/22 recommandé) | `node -v`                |
| npm                        | ≥ 10                       | `npm -v`                 |
| Supabase CLI _(optionnel)_ | ≥ 1.x                      | `npx supabase --version` |

---

## 2. Installation

```bash
cd /Users/melvyn/projetSass/PressPlus
npm install
cp .env.example .env.local       # puis renseigner les vraies valeurs
```

Puis ouvrir `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co   # URL de votre projet
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...             # serveur seulement
```

---

## 3. Base de données

### Option A — Projet Supabase hébergé (recommandée)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → coller `supabase/migrations/001_init.sql` → _Run_.
3. **SQL Editor** → coller `supabase/seed.sql` → _Run_.
4. Copier URL + clé anon dans `.env.local`.

### Option B — Supabase CLI (stack locale Docker)

```bash
npx supabase db reset      # applique les migrations + seed.sql
npx supabase start         # console : http://127.0.0.1:54321
```

### Option C — Script d'application via l'API Management (recommandée, automatisable)

```bash
npm run db:migrate:dry   # vérifie l'accès sans rien modifier
npm run db:migrate       # applique 001_init.sql + seed.sql
```

Le script [`scripts/db-apply.mjs`](scripts/db-apply.mjs) poste le SQL sur
`POST /v1/projects/{ref}/database/query` — le même canal que le SQL Editor, mais
**sans avoir besoin du mot de passe de la base**. Il recharge aussi le cache
PostgREST (`notify pgrst`) et vérifie le nombre de tables créées.

Il exige un **Personal Access Token** du compte qui _possède_ le projet :

1. Ouvrir le projet sur [supabase.com/dashboard](https://supabase.com/dashboard)
   → vérifier **dans quel compte on est connecté** (menu avatar, en haut à droite).
2. _Account Preferences_ → _Personal Access Tokens_ → _Generate new token_.
3. L'exposer **sans l'écrire dans un fichier versionné** :

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
npm run db:migrate
```

### ✅ État du projet `yeskczloikwljpdjaowh` (PressIvoire) — migré

Migrations **appliquées** le 27/09/2026 via `npm run db:migrate` (API Management,
avec le Personal Access Token du compte propriétaire — `supabase link` est aussi
actif, `supabase/.temp/linked-project.json`).

```bash
npm run db:verify
```

| Contrôle        | Résultat                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| Tables          | 11 / 11, **RLS activé sur chacune**                                      |
| Policies RLS    | 33                                                                       |
| Helpers `app_*` | 9                                                                        |
| Buckets Storage | 4 / 4                                                                    |
| Seed            | 4 pressings, 112 articles, 4 abonnements                                 |
| Isolation       | `anon` ne voit rien sur `orders`, `clients`, `profiles`, `notifications` |
| `npm run build` | ✅ passe                                                                 |

> **Correctif appliqué à `001_init.sql`** : les helpers RLS de la section 1
> référencent `public.profiles`, créé plus bas dans le fichier. Postgres valide
> le corps des fonctions à leur création et échouait avec
> `42P01: relation "public.profiles" does not exist`. Le fichier pose désormais
> `set check_function_bodies = off` avant les helpers, et le remet à `on` en fin
> de migration. Sans ce correctif, la migration n'est **pas applicable** en une
> passe — à ne pas supprimer.

Pour viser un autre projet (ex. un environnement de staging) :

```bash
node scripts/db-apply.mjs --project <autre-ref> --dry-run
```

### ⚠ SMTP désactivé

Le projet Supabase existant a **l'authentification email (SMTP) désactivée** :
l'inscription et la connexion par email échoueront tant qu'elle n'est pas
réactivée : **Dashboard → Authentication → SMTP Settings**.

---

## 4. Lancer et vérifier

```bash
npm run dev          # http://localhost:3000
```

La page d'accueil est une **page de vérification** qui affiche en direct :
connexion Supabase, RLS, nombre de pressings lisibles, nombre d'articles du
catalogue (≥ 15 attendu), présence des tables `orders` / `saas_subscriptions`.

Autres commandes :

```bash
npm run db:migrate        # applique 001_init.sql + seed.sql au projet lié
npm run db:seed:demo      # 8 clients + 6 commandes de démonstration (idempotent)
npm run db:verify         # 22 contrôles : tables, RLS, policies, seed
npm run dev               # http://localhost:3000
npm run build             # build de production (typecheck + lint inclus)
npm run lint              # ESLint seul
npx tsc --noEmit          # vérification TypeScript seule
```

**Acceptation Étape 1** : `npm run build` passe ✅ et `npm run db:verify`
affiche tous les contrôles en vert.

---

## 5. Ce que contient l'étape 1

```
app/                      layout (Inter + Poppins), page de vérification
components/ui/            primitives shadcn-style : Button, Input, Label, Badge, Card
lib/constants.ts          statuts de commande, types de lavage, communes, moyens de paiement
lib/utils.ts              cn(), formatFCFA(), normalisation téléphone +225
lib/supabase/
  client.ts               client navigateur (@supabase/ssr, cookies)
  server.ts               client serveur (Server Components / Actions)
  env.ts                  lecture env fail-fast
  types.ts                types TypeScript du schéma (source : 001_init.sql)
middleware.ts             rotation de session Supabase à chaque requête
supabase/migrations/001_init.sql   11 tables + helpers + RLS + index + storage
supabase/seed.sql         4 pressings de démo + 28 articles × 4 pressings
scripts/
  db-apply.mjs            applique les migrations via l'API Management
  db-verify.mjs           22 contrôles post-migration (tables, RLS, seed)
supabase/seed-demo.sql    8 clients + 6 commandes de démonstration (idempotent)
```

---

## 5.1 Onboarding gérant (Phase 2 — Étape 2)

Parcours en 3 étapes : `/onboarding/pressing/step-1`, `step-2`, `step-3`.

| Étape | Contenu |
|---|---|
| 1 — Identité | Nom, commune, adresse, téléphone, horaires par jour (fermé possible), logo (JPEG/PNG/WebP, 2 Mo) |
| 2 — Services & tarifs | Toggle collecte, toggle livraison + frais global et par commune, délais par type de lavage, catalogue éditable (prix, désactivation, ajout) |
| 3 — Offre | Free / Pro en cartes comparatives, encart « 30 jours d'essai gratuit », bouton de finalisation |

L'état vit dans un store **Zustand** persisté en `sessionStorage`
(`lib/stores/onboarding.ts`) : les étapes sont sur des routes distinctes, un
rechargement ou un retour arrière ne doit pas perdre la saisie.

### Écriture : une transaction, pas trois requêtes

Le contrat prévoyait une Edge Function `complete-onboarding`. **Écart assumé** :
la migration `003_onboarding.sql` fournit une fonction Postgres
`complete_onboarding(jsonb)` en `SECURITY DEFINER`. Même atomicité, sans
déploiement ni aller-retour réseau, et testable directement. Une Edge Function
peut l'encapsuler plus tard sans changer l'appelant.

Comme la fonction contourne le RLS, **elle revalide tout elle-même** :

```
✔ pressing + 3 articles + abonnement + profil rattachés, en un appel
✔ article désactivé NON inséré
✔ 2ᵉ appel refusé       → « Onboarding deja termine »
✔ appel par un client   → « Seul un gerant (owner) peut creer un pressing »
✔ appel anonyme         → refusé
✔ isolation multi-tenant → le client voit 0 article d'un autre pressing
```

### Catalogue de référence

Les policies de `articles` filtrent sur le pressing courant : un gérant qui
n'a pas encore de pressing ne peut donc lire **aucun** article. La fonction
`get_reference_catalogue()` (`SECURITY DEFINER`) ouvre la lecture du seul
catalogue type — 28 articles, données commerciales, aucun risque entre tenants.
Vérifié : lecture directe `articles` → 0 ligne, RPC → 28 lignes, anonyme → 401.

### Fin du mode démonstration

Le repli `service_role` de `lib/supabase/queries.ts` est **supprimé**, ainsi
que `lib/supabase/admin.ts`. Toute lecture passe désormais par la session de
l'utilisateur et donc par le RLS. Le bandeau orange « mode démonstration » a
disparu de l'interface.

### Test de bout en bout

```bash
npm run db:test:user -- --email essai@pressingpro.ci --role owner
```

Puis, dans le navigateur : connexion → `/onboarding/pressing` → les 3 étapes →
`/dashboard`. Le pressing et son catalogue apparaissent immédiatement, le RLS
les réservant à ce seul compte.

> ⚠ `npm run db:test:user` crée un compte **confirmé** via l'API Admin. Il
> n'existe pas de « désinscription » : pour repartir d zéro, supprimez le
> pressing puis `profiles.pressing_id` à `NULL` via le SQL Editor.

### Pièges rencontrés

| Symptôme | Cause | Correction |
|---|---|---|
| Le logo ne peut pas être uploadé à l'étape 1 | les policies Storage exigent `folder[1] = pressing_id`, or le pressing n'existe pas encore | policies dédiées pour `onboarding/<user_id>/…` (migration 003) |
| Le menu déroulant du `<select>` disparaît sous `appearance-none` | la flèche système est retirée sans remplacement | `SelectField` conserve l'apparence sans masquer l'indicateur |
| Un article désactivé se retrouve en base | le filtre `is_active` était appliqué côté UI uniquement | la fonction SQL filtre aussi, et ne copie que les lignes valides |

---

## 5.2 Authentification (Phase 2 — Étape 1)

Quatre écrans dans `app/(auth)/` : `/login`, `/register`, `/forgot-password`,
`/reset-password`. Le rôle se choisit dès le premier écran d'inscription
(« Je gère un pressing » / « Je suis client »).

**Créer un compte de test** (le SMTP n'étant pas configuré, l'inscription réelle
est bloquée par la confirmation d'email) :

```bash
npm run db:test:user    # -> gerant.test@pressingpro.ci / Pressing2026
npm run db:test:user -- --role client --email client@exemple.ci
```

La commande crée **et confirme** le compte via l'API Admin, puis vérifie que le
trigger `handle_new_user()` a bien rempli `public.profiles`.

### Ce que la migration `002_auth_trigger.sql` met en place

| Objet | Rôle |
|---|---|
| `handle_new_user()` | Crée la ligne `profiles` à chaque inscription, en `SECURITY DEFINER` + `search_path` figé |
| trigger `on_auth_user_created` | `AFTER INSERT` sur `auth.users` |
| `profiles_guard_insert` | Refuse l'insertion d'un profil **tiers** |
| `profiles_guard_update` | Refuse l'auto-promotion de rôle (`driver`, `manager`…) |

Le rôle est **liste blanche** dans le trigger : un client ne peut pas s'attribuer
`owner` en forgeant sa requête d'inscription. Testé :

```
✔ auto-promotion en 'driver' refusée       Changement de role non autorise
✔ creation d'un profil tiers refusée        Insertion non autorisee sur un profil tiers
✔ MAJ de son propre full_name acceptée      OK
```

### Middleware

Routes publiques : `/`, `/login`, `/register`, `/forgot-password`,
`/reset-password`, plus les préfixes `/api` et `/_next`. Tout le reste exige une
session ; la page visée est mémorisée en `?redirect=` pour y revenir après
connexion. Un utilisateur déjà connecté qui ouvre `/login` est renvoyé vers
`/dashboard`.

La redirection **par rôle** (owner → `/dashboard`, driver → `/driver/tours`,
client → `/client/home`) n'est pas dans le middleware : elle appartient à
l'Étape 4 (layouts par rôle). Interroger `profiles` dans le middleware
signifierait un aller-retour base sur *chaque* requête, assets compris.

> ⚠ **Conséquence à connaître** : le middleware protégeant désormais le
> dashboard, le pressing de démonstration n'est plus accessible par l'interface.
> Un gérant connecté mais sans pressing voit « onboarding requis » — c'est le
> comportement attendu, l'onboarding arrive à l'Étape 2. Le repli `service_role`
> de `lib/supabase/queries.ts` ne se déclenche plus que hors session.

### ⚠ SMTP désactivé — l'inscription réelle ne fonctionne pas encore

`mailer_autoconfirm` est à `false` : un compte créé via `/register` reste
inactif tant que l'email de confirmation n'est pas reçu, et aucun email ne part
car le SMTP n'est pas configuré. **Avant de tester `/register` dans le
navigateur** :

- *Dashboard → Authentication → SMTP Settings* → activer le service, **ou**
- *Authentication → Providers → Email* → décocher « Confirm email » (réservé au
  développement : plus aucune vérification d'email).

Tant que ce n'est pas fait, utilisez `npm run db:test:user`.

### Pièges React 18 rencontrés

| Symptôme | Cause | Correction |
|---|---|---|
| `Cannot find name 'cache'` | `React.cache` n'existe qu'en React 19 | pas de mémoïsation, ou `unstable_cache` |
| `useFormState is not exported` | API stable seulement en React 19 | `react-hook-form` + état local |
| `Only plain objects … can be passed to Client Components` | un schéma Zod (instance de classe) passé en prop | passer une **clé** (`kind="login"`), le schéma est importé dans le composant client |
| `Functions are not valid as a child of Client Components` | render-prop `children` traversant la frontière RSC | la page reste serveur, le formulaire est un composant client séparé |

---

## 5.3 Interface de gestion (mobile)

Application en React/Server Components, sur le modèle de la maquette HTML
(`exempleInterface.md`) : mobile-first, bottom nav, bouton flottant, panier
flottant, animations d'apparition en cascade.

| Route | Écran | Données |
|---|---|---|
| `/dashboard` | KPI (CA du jour, en traitement, prêtes) + « à livrer aujourd'hui » | `orders` agrégats |
| `/commandes` | Liste + filtres par statut + recherche | `orders` + `clients` |
| `/commandes/[id]` | Statut, client, lignes, total, encaissement | `orders`, `order_items` |
| `/commandes/nouvelle` | Parcours 3 étapes : client → articles → confirmation | `clients`, `articles` |
| `/clients` | Annuaire + fidélité | `clients` |
| `/reglages` | Infos pressing, abonnement, session | `pressings` |

Le reste de l'application (écran de vérification technique) reste à la racine `/`.

### Plus de mode démonstration

Le repli `service_role` a été **supprimé** (voir « Onboarding gérant »). Toute
lecture passe par la session de l'utilisateur, donc par le RLS : un gérant ne
voit que son pressing, et rien ne s'affiche sans session.

> Les Server Actions de `app/actions/orders.ts` vérifient **encore** que la
> ressource appartient au pressing du contexte avant d'écrire. Cette double
> vérification est volontairement conservée : elle protège même si une policy
> RLS était un jour relâchée par erreur.

### Pièges rencontrés (à connaître)

| Symptôme | Cause | Correction |
|---|---|---|
| `Property 'pressing_id' does not exist on type 'never'` | `@supabase/ssr` 0.5.2 trop ancien face à `supabase-js` 2.117 : le parseur `select` renvoie `never` | `@supabase/ssr` **0.12.7** — le projet a été mis à jour |
| `PGRST100 … unexpected "f"` sur une recherche | PostgREST refuse un filtre pointé sur une ressource embarquée dans un `or()` | résoudre les `clients` d'abord, filtrer sur `client_id` |
| Tendance du CA affichant « +942 % » | moyenne calculée sur 2 commandes | échantillon minimal de 5 commandes, sinon pas de tendance |
| Le seed démo doublonne les lignes | `order_items` n'a aucune contrainte d'unicité | `DELETE` des lignes de démo avant l'insert |

### Schéma (11 tables, toutes en RLS)

`pressings` · `profiles` · `articles` · `clients` · `orders` · `order_items` ·
`payments` · `deliveries` · `saas_subscriptions` · `customer_packs` · `notifications`

**Partis pris RLS**

- Fonctions `SECURITY DEFINER` (`app_current_pressing_id()`, `app_is_staff()`, …)
  pour éviter la récursion des policies.
- Chaque écriture appartient à `pressing_id = app_current_pressing_id()` →
  un gérant ne voit **jamais** les données d'un autre pressing.
- Un client ne voit que **ses** commandes via `app_is_order_client()`.
- Pas de policy `DELETE` sur `orders`, `payments`, `notifications` :
  on annule/rembourse, on ne supprime pas (intégrité comptable).
- `pressings` en lecture ouverte aux utilisateurs connectés : le client doit
  pouvoir parcourir l'annuaire des pressings de sa commune (onboarding Phase 2).
- Buckets Storage (`order-photos`, `delivery-proofs`, `article-images`,
  `pressing-assets`) isolés par le dossier `<pressing_id>/`.

---

## 6. Dépannage

| Symptôme                                                        | Cause                                            | Correction                                 |
| --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `relation "public.pressings" does not exist`                    | Migration non appliquée                          | Exécuter `001_init.sql` dans le SQL Editor |
| `duplicate key value violates constraint "..."`                 | Seed rejoué à moitié                             | Relancer `seed.sql` (idempotent)           |
| `infinite recursion detected in policy for relation "profiles"` | Policy `profiles` sans helper `SECURITY DEFINER` | Reprendre la migration telle quelle        |
| Erreur `Variable d'environnement manquante`                     | `.env.local` absent                              | `cp .env.example .env.local`               |
| Inscription email qui échoue                                    | SMTP Supabase désactivé                          | Authentication → SMTP Settings             |
| `npm run build` : module introuvable                            | dépendances non installées                       | `npm install`                              |

---

## 7. Suite (attend votre validation)

1. ✅ **Phase 1 — Étape 1 : scaffold + DB**
2. ✅ **Phase 2 — Étape 1 : Auth multi-rôles** (4 écrans, trigger, middleware)
3. ✅ **Phase 2 — Étape 2 : Onboarding gérant** (3 étapes, transaction unique)
4. ⏸ **Phase 2 — Étape 3 : Onboarding client** *(prochaine étape)*
5. ⏸ **Phase 2 — Étape 4 : Layouts par rôle** (owner / driver / client)
6. ⏸ **Phase 2 — Étape 5 : Profil & paramètres**
7. Phase 2 : app mobile PWA client + livreur
8. Phase 3 : CinetPay + SMS/WhatsApp
7. Phase 4 : fidélité, packs, parrainage, IA photo
8. Phase 5 : signature, géoloc, export comptable, optimisation mobile
