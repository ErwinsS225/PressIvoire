# PressingPro

SaaS multi-tenant de gestion de pressing, conçu pour le marché ivoirien
(Abidjan). Commandes, collecte et livraison, catalogue de tarifs,
encaissement multi-espèces, tableau de bord et rapports.

> **Statut** : application opérationnelle, 100 % desktop, installable sur
> téléphone (PWA). 14 écrans métier, base multi-tenant avec RLS sur
> 11 tables.

---

## Sommaire

- [Ce que fait l'application](#ce-que-fait-lapplication)
- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Commandes](#commandes)
- [Structure](#structure)
- [Sécurité](#sécurité)
- [Base de données](#base-de-données)
- [Tests](#tests)
- [Ce qui est annoncé mais pas encore branché](#ce-qui-est-annoncé-mais-pas-encore-branché)
- [Feuille de route](#feuille-de-route)

---

## Ce que fait l'application

### Pour le gérant

| Écran | Route | Ce qu'on y fait |
|---|---|---|
| Tableau de bord | `/dashboard` | CA du mois, commandes en cours, graphique 12 mois |
| Commandes | `/orders` | Liste filtrable par statut, recherche |
| Nouvelle commande | `/orders/new` | Parcours en 3 étapes (client, articles, remise) |
| Détail commande | `/orders/[id]` | Lignes, encaissement, avancement du workflow |
| Clients | `/clients` | Annuaire, création, totaux calculés |
| Fiche client | `/clients/[id]` | Coordonnées, historique, forfaits pré-payés |
| Catalogue | `/catalogue` | Tarifs, types de lavage, activation par article |
| Création article | `/catalogue/nouveau` | Formulaire validé côté client **et** serveur |
| Livraisons | `/livraisons` | Tournées, retards > 24 h, missions par livreur |
| Caisse | `/caisse` | Encaissements du jour, ventilation, impayés |
| Rapports | `/rapports` | CA 7 jours, panier moyen, top clients et articles |
| Notifications | `/notifications` | Journal d'envoi SMS / WhatsApp |
| Paramètres | `/settings` | Identité du pressing, abonnement, session |

### Parcours

1. **Inscription** → choix du rôle (gérant ou client)
2. **Onboarding gérant** (3 étapes) → identité, services et tarifs, abonnement.
   Les trois étapes passent par **une seule transaction Postgres**
   (`complete_onboarding()`), pas trois requêtes.
3. **Utilisation** → le reste.

### Sur téléphone

L'application est une **PWA** : elle s'installe depuis le navigateur
(menu de partage → « Sur l'écran d'accueil ») et s'ouvre en plein écran, sans barre d'URL.

C'est le layout qui fait le reste : sur grand écran une barre latérale,
sur téléphone une barre de navigation basse. **Même base de code, aucun
écran dupliqué** — le responsive se fait en CSS (`md:`).

Le manifeste est dans `public/manifest.webmanifest`, les icônes sont
générées par `npm run icons`.

---

## Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 14 (App Router) | RSC + Server Actions : le HTML arrive déjà rempli, zéro aller-retour client au chargement |
| Langage | TypeScript strict | Aucune erreur sur `npm run type-check` |
| Base | Supabase (Postgres + Auth + Storage) | RLS native : l'isolation multi-tenant est dans la base, pas dans l'application |
| Session | `@supabase/ssr` (cookies httpOnly) | Le JS de la page ne peut pas lire la session |
| Validation | Zod | Même schéma côté client (message sous le champ) et côté serveur (garantie) |
| Style | Tailwind + shadcn/ui | `components/ui/` : Button, Card, Table, Badge, Dialog… |
| Graphique | Recharts | Histogramme du CA, en composant client isolé |
| Tableau | TanStack Table v8 | Tri, filtres, pagination sur la liste des commandes |
| État | Zustand | Onboarding multi-étapes, persisté en `sessionStorage` |
| Tests | Vitest | 97 tests sur la logique métier pure

---

## Installation

### Prérequis

| Outil | Version |
|---|---|
| Node.js | ≥ 18.18 (20 ou 22 recommandé) |
| npm | ≥ 10 |
| Supabase CLI | ≥ 1.x (optionnel, pour la base locale) |

### Mise en place

```bash
npm install
cp .env.example .env.local      # puis renseigner les vraies valeurs
npm run db:migrate             # crée le schéma + seed
npm run dev                    # http://localhost:3000
```

Les variables minimales sont `NEXT_PUBLIC_SUPABASE_URL` et
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sans elles, l'application démarre mais
l'écran de vérification Signale le problème explicitement.

---

## Commandes

```bash
# Développement
npm run dev                  # serveur de développement

# Vérification
npm run type-check           # TypeScript, sans émission
npm run lint                 # ESLint
npm test                     # 97 tests unitaires
npm run test:coverage        # tests + rapport de couverture
npm run build                # build de production

# Base de données
npm run db:migrate           # applique migrations + seed
npm run db:migrate:dry       # vérifie l'accès sans rien modifier
npm run db:verify            # 22 contrôles post-migration
npm run db:seed:demo         # clients et commandes de démonstration
npm run db:types             # régénère lib/supabase/types.ts

# Assets
npm run icons                # régénère les icônes PWA
```

---

## Structure

```
app/
  (app)/                  espace connecté, protégé par le middleware
    layout.tsx            sidebar desktop + barre basse mobile
    dashboard/ orders/ clients/ catalogue/
    livraisons/ caisse/ rapports/ notifications/ settings/
  (auth)/                 connexion, inscription, mot de passe
  onboarding/pressing/    parcours gérant (transactionnel)
  auth/                   confirmation email, réinitialisation
  actions/                Server Actions : auth, orders, catalogue, onboarding
  api/signout/            déconnexion (la sidebar est un client component)

components/
  ui/                     primitives shadcn/ui
  layout/                 sidebar, barre basse, en-tête
  dashboard/ orders/ catalogue/ cash/ auth/

lib/
  supabase/               clients (browser / serveur), requêtes, types
  validation/             schémas Zod — la frontière de confiance
  constants.ts            statuts, moyens de paiement, rôles, communes
  stores/                 état de l'onboarding (Zustand)
  utils.ts                formatage, téléphone, redirection sûre
  *.test.ts               tests Vitest, à côté du code testé

supabase/
  migrations/             001 schéma + RLS · 002 trigger · 003 onboarding
                          004 journal des paiements
  seed.sql  seed-demo.sql
```

---

## Sécurité

L'isolation multi-tenant est appliquée **dans la base**, pas dans
l'application. Un bug côté serveur ne peut pas exposer les données d'un autre
pressing.

**40 policies RLS** sur les 11 tables, adossées à des fonctions
`SECURITY DEFINER` qui lisent `profiles` en court-circuitant le RLS — sans
quoi une policy sur `profiles` qui lit `profiles` provoquerait une récursion
infinie.

| Décision | Raison |
|---|---|
| `app_current_pressing_id()`, `app_is_staff()`, `app_is_pressing_admin()` | Une seule source d'autorité, réutilisée par toutes les policies |
| `search_path` figé sur ces fonctions | Un attaquant ne peut pas créer un schéma contenant un faux `profiles` |
| Rôle d'inscription en **liste blanche** (trigger `handle_new_user`) | Un client ne peut pas s'auto-attribuer `driver` en forgeant la requête |
| Sessions en cookies httpOnly | Le JavaScript de la page ne peut pas lire le token |
| `safeRedirectPath()` sur le paramètre `?redirect=` | Bloque `//evil.com`, `/\evil.com`, les CRLF et les URLs absolues — un lien de phishing ne peut pas détourner la connexion |
| Mot de passe actuel exigé à la réinitialisation | Le lien transite par une boîte mail, qui n'est pas un canal sûr |
| Réponse identique que l'email existe ou non | Pas d'énumération de comptes |
| Aucune stratégie `service_role` de secours | Un client ne doit jamais pouvoir lire la base entière |
| Suppression en `soft delete` (`deleted_at`) | L'historique reste rattaché |

`lib/constants.ts` duplique volontairement deux policies
(`app_is_staff`, `app_is_pressing_admin`) **pour l'affichage** : un caissier
ne doit pas voir un bouton « Modifier » qui échouerait avec un message RLS
incompréhensible. La base reste l'autorité.

Le même doublon existe **côté écriture**, dans `lib/guards.ts` : chaque Server
Action commence par `requireStaff()` (tout le personnel) ou `requireAdmin()`
(gérant et responsable) et renvoie un refus rédigé en français. Une Server
Action est un point d'entrée HTTP public, appelable sans passer par
l'interface : sans ce contrôle, un caissier qui forcerait le formulaire du
catalogue recevrait `new row violates row-level security policy`.

Le masquage suit la même logique écran par écran : un caissier voit le
formulaire d'article en lecture seule, un compte hors personnel voit les
actions d'une commande en lecture seule.

---

## Base de données

11 tables, RLS activé sur chacune.

```
pressings · profiles · articles · clients · orders · order_items
payments · deliveries · customer_packs · saas_subscriptions · notifications
```

Quatre migrations, appliquées dans l'ordre :

| Fichier | Contenu |
|---|---|
| `001_init.sql` | Schéma, index, 11 tables, helpers RLS, policies, buckets Storage |
| `002_auth_trigger.sql` | Création automatique du profil à l'inscription, rôle en liste blanche |
| `003_onboarding.sql` | `complete_onboarding(jsonb)` — pressing, catalogue et abonnement en **une transaction** |
| `004_payments_journal.sql` | `record_payment()` — mise à jour du solde **et** écriture du journal, atomiques |

Deux décisions qui comptent :

- **`order_items` fige `article_name` et `unit_price`** au moment de la
  commande. Renommer ou supprimer un article plus tard ne réécrit pas
  l'historique, et les rapports continuent de nommer les bonnes pièces.
- **Les encaissements passent par `record_payment()`**, pas par deux requêtes
  depuis l'application. Sans cela, un échec de la seconde laisserait une
  commande marquée payée sans trace — la caisse ne pourrait plus ventiler
  par moyen de paiement.

---

## Tests

```bash
npm test                  # 124 tests
npm run test:coverage     # 65 % des lignes de lib
```

Les tests ciblent `lib/**` : la logique métier pure, celle qu'aucun test
d'intégration ne rattraperait si elle régressait. Aucun composant React n'est
testé — le rendu est vérifié à l'œil, le typage par le compilateur.

| Fichier | Couvre |
|---|---|
| `lib/utils.test.ts` | `safeRedirectPath` (9 vecteurs d'attaque), téléphones ivoiriens, montants |
| `lib/validation/auth.test.ts` | Politiques de mot de passe, liste blanche des rôles, normalisations |
| `lib/validation/catalogue.test.ts` | Contraintes CHECK de la table `articles`, coercition des formulaires |
| `lib/validation/onboarding.test.ts` | Cohérence horaires/frais/article, bornes de délai et de prix |
| `lib/constants.test.ts` | Gardes de statut, libellés, permissions par rôle |
| `lib/guards.test.ts` | `requireStaff` / `requireAdmin` : qui passe, et quel message reçoit celui qui ne passe pas |

La CI (`.github/workflows/ci.yml`) enchaîne `test` → `lint` → `type-check`
→ `build`, dans cet ordre : un test casse plus tôt et avec un message plus
clair qu'une erreur de compilation quarante lignes plus loin.

---

## Ce qui est annoncé mais pas encore branché

Cette section est volontairement explicite. L'interface et les variables
d'environnement mentionnent des intégrations **qui n'existent pas encore en
code**. Aucun appel réseau n'est émis : les montants sont saisis à la main.

| Intégration | État | Où c'est visible |
|---|---|---|
| **CinetPay** (Wave, Orange, MTN, Moov) | Variables déclarées, **aucun appel** | `CASSER_METHODS` affiche les 4 moyens ; le montant est saisi au clavier |
| **SMS Orange** | Variables déclarées, **aucun appel** | Écran `/notifications` : la table `notifications` reste vide |
| **WhatsApp Business** | Variables déclarées, **aucun appel** | Idem |
| `CINETPAY_CALLBACK_URL` | Pointe vers `/api/payments/callback` | **Cette route n'existe pas** |

Conséquences à connaître avant de faire une démonstration :

- Un client paie **en espèces ou par saisie manuelle** du moyen (Wave,
  Orange…). Le journal de caisse ventile correctement, mais aucun paiement
  n'est réellement envoyé à l'opérateur.
- **Aucun SMS n'est envoyé.** L'écran Notifications affiche un état vide
  explicite plutôt qu'un faux historique — c'est un choix délibéré.
- `NEXT_PUBLIC_APP_URL` doit être renseigné, sinon les liens de
  confirmation d'email et de réinitialisation pointent vers `localhost`.

### SMTP

L'inscription par email **échoue silencieusement** si le SMTP du projet
Supabase n'est pas activé (*Dashboard → Authentication → SMTP Settings*).
Aucune erreur n'est levée par l'API ; il faut le savoir à l'avance.

---

## Feuille de route

Ce qui reste réellement à faire, par ordre de valeur :

1. **CinetPay** — le paiement mobile money est *la* promesse du produit
   (86 % des transactions en Côte d'Ivoire). Sans lui, la caisse est
   entièrement manuelle.
2. **Notifications SMS** — avec le webhook CinetPay, l'état de la commande
   peut être poussé au client sans qu'il ait à ouvrir l'application.
3. **Tests de rendu** — @testing-library, si le besoin s'en fait sentir. À
   ce jour le typecheck et la revue visuelle suffisent.
4. **Vues SQL pour les agrégats** — les rapports calculent en JavaScript
   avec un plafond de lignes. Correct à l'échelle d'un pressing ; à auditer
   au-delà de quelques milliers de commandes par an.
