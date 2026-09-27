Voici un **prompt complet, structuré et prêt à copier-coller** dans votre agent IA (Cursor, Claude Code, Bolt, v0, Lovable, Windsurf, etc.). Il est conçu pour être utilisé **dès le premier message** afin que l'agent comprenne parfaitement le contexte, le workflow, la stack technique et le modèle économique avant de générer la moindre ligne de code.

---

# 🧠 PROMPT MASTER — Application de Gestion de Pressing (MVP Ivoirien) ""PressingPro""

## 🎯 RÔLE ET CONTEXTE

Tu es un **développeur full-stack senior** expert en **Next.js 14 (App Router)**, **TypeScript**, **Supabase**, **TailwindCSS**, **shadcn/ui** et **PWA**. Tu es aussi un **expert produit** spécialisé dans les marchés africains (Mobile Money, faible bande passante, usage mobile-first).

Je suis un entrepreneur ivoirien. Je veux créer **"PressingPro"** (nom provisoire), une **application SaaS de gestion de pressing/buanderie** pour le marché ivoirien, précisément à Abidjan au démarrage.

### 🚨 Problèmes réels du marché à résoudre

1. Aucune digitalisation : tout se fait sur papier (carnet, ticket manuscrit).
2. Prix des vêtements non uniformes (chaque pressing a sa grille, souvent floue).
3. Délais non respectés (le client ne sait jamais quand récupérer son linge).
4. Vêtements abîmés ou perdus → litiges fréquents.
5. Paiement uniquement en espèces au retrait → pas de traçabilité.
6. Seuls quelques pressings huppés (Cocody, Riviera, Plateau) offrent la collecte/livraison.

### 💡 Ma vision

Digitaliser le secteur avec une app **simple, mobile-first, en français**, qui gère :

- La prise de commande avec tarification claire et uniforme.
- La traçabilité complète (photos avant/après, statut en temps réel).
- Le paiement Mobile Money (Wave, Orange, MTN, Moov).
- La collecte et livraison à domicile.
- Un système d'abonnement SaaS adapté au pouvoir d'achat ivoirien.

---

## 🏗️ STACK TECHNIQUE IMPOSÉE

repoo github : git@github.com:ErwinsS225/PressIvoire.git

| Couche           | Technologie                                            | Justification                |
| ---------------- | ------------------------------------------------------ | ---------------------------- |
| Frontend         | **Next.js 14 (App Router) + TypeScript**               | PWA installable, SSR, rapide |
| UI               | **TailwindCSS + shadcn/ui**                            | Design propre et rapide      |
| Backend/DB       | **Supabase** (Postgres, Auth, Storage, Edge Functions) | Déjà en ma possession        |
| Paiement         | **CinetPay** (Wave, Orange Money, MTN MoMo, Moov)      | Standard CI                  |
| Notifications    | **SMS via Orange SMS API** + **WhatsApp Cloud API**    | Canaux utilisés en CI        |
| Hébergement      | **Vercel**                                             | Gratuit au démarrage         |
| State management | **Zustand** + **React Query (TanStack Query)**         | Léger et performant          |
| Formulaires      | **React Hook Form + Zod**                              | Validation robuste           |
| PWA              | **next-pwa**                                           | Installation mobile          |

---

## 🗄️ SCHÉMA DE BASE DE DONNÉES SUPABASE (à créer via migrations SQL)

Génère les **migrations SQL** complètes avec RLS (Row Level Security) activé sur toutes les tables.

### Tables principales

```sql
-- 1. PROFILS UTILISATEURS (lié à auth.users)
profiles (
  id uuid PK references auth.users,
  role text CHECK (role IN ('owner','manager','cashier','driver','client')),
  full_name text,
  phone text UNIQUE,
  email text,
  pressing_id uuid FK, -- null si client
  created_at timestamptz
)

-- 2. PRESSINGS (multi-tenant)
pressings (
  id uuid PK,
  owner_id uuid FK profiles,
  name text,
  address text,
  commune text, -- Cocody, Yopougon, etc.
  phone text,
  logo_url text,
  opening_hours jsonb,
  delivery_enabled boolean DEFAULT false,
  delivery_fee integer DEFAULT 1000, -- FCFA
  subscription_plan text DEFAULT 'free', -- free, pro, business
  subscription_expires_at timestamptz,
  created_at timestamptz
)

-- 3. ARTICLES / CATALOGUE DE TARIFS
articles (
  id uuid PK,
  pressing_id uuid FK, -- chaque pressing a sa grille
  name text, -- "Chemise", "Costume 2 pièces", "Robe simple", "Couverture"
  category text, -- 'habit','linge_maison','cuir','delicat'
  wash_type text, -- 'sec','eau','repassage_seul','detachage'
  price integer, -- en FCFA
  estimated_hours integer, -- délai standard
  is_active boolean DEFAULT true
)

-- 4. CLIENTS
clients (
  id uuid PK,
  pressing_id uuid FK,
  full_name text,
  phone text,
  email text,
  address text,
  commune text,
  loyalty_points integer DEFAULT 0,
  total_orders integer DEFAULT 0,
  created_at timestamptz
)

-- 5. COMMANDES
orders (
  id uuid PK,
  pressing_id uuid FK,
  client_id uuid FK,
  order_number text UNIQUE, -- ex: "PR-2026-0001"
  status text CHECK (status IN (
    'pending','picked_up','in_processing','ready','out_for_delivery','delivered','cancelled'
  )),
  pickup_type text, -- 'in_store','home_pickup'
  delivery_type text, -- 'in_store','home_delivery'
  pickup_address text,
  delivery_address text,
  pickup_scheduled_at timestamptz,
  delivery_scheduled_at timestamptz,
  subtotal integer,
  delivery_fee integer DEFAULT 0,
  discount integer DEFAULT 0,
  total integer,
  payment_status text CHECK (payment_status IN ('unpaid','partial','paid')),
  payment_method text, -- 'cash','wave','orange','mtn','moov'
  notes text,
  created_by uuid FK profiles,
  created_at timestamptz,
  delivered_at timestamptz
)

-- 6. LIGNES DE COMMANDE
order_items (
  id uuid PK,
  order_id uuid FK,
  article_id uuid FK,
  quantity integer,
  unit_price integer,
  wash_type text,
  photo_before_url text, -- photo à la réception
  photo_after_url text,  -- photo après lavage
  special_instructions text
)

-- 7. PAIEMENTS
payments (
  id uuid PK,
  order_id uuid FK,
  amount integer,
  method text,
  transaction_id text, -- ID CinetPay
  status text CHECK (status IN ('pending','success','failed','refunded')),
  paid_at timestamptz
)

-- 8. LIVRAISONS / TOURNÉES
deliveries (
  id uuid PK,
  order_id uuid FK,
  driver_id uuid FK profiles,
  type text, -- 'pickup','delivery'
  status text, -- 'assigned','in_progress','completed','failed'
  scheduled_at timestamptz,
  completed_at timestamptz,
  proof_photo_url text
)

-- 9. ABONNEMENTS SAAS (ce que MES CLIENTS pressings paient)
saas_subscriptions (
  id uuid PK,
  pressing_id uuid FK,
  plan text, -- 'free','pro','business'
  price integer, -- FCFA/mois
  status text, -- 'active','trial','expired','cancelled'
  started_at timestamptz,
  expires_at timestamptz,
  payment_method text,
  transaction_id text,
  auto_renew boolean DEFAULT false,
  created_at timestamptz
)

-- 10. PACKS CLIENTS (abonnements vendus PAR les pressings à LEURS clients)
customer_packs (
  id uuid PK,
  client_id uuid FK,
  pressing_id uuid FK,
  name text, -- "Pack 20 chemises/mois"
  total_quantity integer,
  used_quantity integer DEFAULT 0,
  price integer,
  expires_at timestamptz,
  status text -- 'active','exhausted','expired'
)

-- 11. NOTIFICATIONS (log des SMS/WhatsApp envoyés)
notifications (
  id uuid PK,
  order_id uuid FK,
  channel text, -- 'sms','whatsapp'
  recipient text,
  message text,
  status text, -- 'sent','failed'
  sent_at timestamptz
)
```

**Active RLS sur toutes les tables** avec la logique : un utilisateur ne voit que les données de son `pressing_id` (sauf les `clients` qui voient leurs propres commandes).

---

## ⚙️ FONCTIONNALITÉS DU MVP (par module)

### 🔐 Module 1 : Authentification & Onboarding

- Inscription via **email + téléphone** (Supabase Auth).
- Choix du rôle : **Gérant de pressing** ou **Client**.
- Onboarding du gérant : nom du pressing, commune, horaires, activation livraison.
- Sélection du **plan SaaS** à la fin de l'onboarding (avec essai gratuit 30 jours sur Pro).

### 📋 Module 2 : Gestion du catalogue (Gérant)

- CRUD des articles avec prix en FCFA.
- **Catalogue pré-rempli pour la Côte d'Ivoire** (à seed dans la DB) :
  - Chemise : 500 FCFA (eau) / 1000 FCFA (sec)
  - Pantalon : 700 / 1200
  - Costume 2 pièces : 2000 / 3000
  - Robe simple : 1000 / 1500
  - Boubou : 1500 / 2500
  - Couverture : 2000 / 3000
  - Rideaux (par m²) : 500
  - Draps : 1000 / 1500
- Types de lavage : **sec, eau, repassage seul, détachage**.
- Délai estimé par article (en heures).

### 🧾 Module 3 : Prise de commande (Caisse)

- Sélection client (existant ou nouveau).
- Ajout d'articles au panier → **calcul automatique du total**.
- Choix du type de lavage par article.
- Ajout de notes spéciales ("tache sur manche gauche").
- **Prise de photo obligatoire des vêtements à la réception** (via Supabase Storage) → anti-litige.
- Génération d'un **numéro de commande unique** (`PR-2026-0001`).
- Statut initial : `pending`.
- Choix : paiement immédiat ou au retrait.

### 📸 Module 4 : Traçabilité & Workflow

- Changement de statut par le personnel : `pending → picked_up → in_processing → ready → out_for_delivery → delivered`.
- Chaque changement déclenche une **notification SMS/WhatsApp** au client.
- Photo "après lavage" optionnelle avant passage à `ready`.

### 🚚 Module 5 : Collecte & Livraison

- Planification d'une collecte à domicile (adresse + créneau).
- Assignation à un **livreur** (rôle `driver`).
- Interface livreur (PWA) : liste des arrêts du jour, bouton "Marquer comme collecté/livré", upload photo de preuve.
- Calcul automatique des frais de livraison selon la commune.

### 💰 Module 6 : Paiements

- **CinetPay** pour Mobile Money (Wave, Orange, MTN, Moov).
- Enregistrement paiement espèces (avec reçu digital).
- Statut de paiement : impayé / partiel / payé.
- Génération d'un **reçu PDF** téléchargeable.

### 👥 Module 7 : Clients

- Historique des commandes par client.
- Système de **points de fidélité** (1 point par 1000 FCFA dépensés).
- Gestion des **packs clients** (ex: "20 chemises/mois à 8000 FCFA").

### 📊 Module 8 : Dashboard Gérant

- CA du jour / semaine / mois.
- Nombre de commandes par statut.
- Top 5 des articles les plus lavés.
- Commandes en retard (alerte rouge).
- Graphiques (Recharts).

### 🔔 Module 9 : Notifications automatiques

- SMS via **Orange SMS API** (ou Vonage/Termii en fallback).
- Templates prédéfinis :
  - "Bonjour {nom}, votre commande {num} est prête. Vous pouvez venir la récupérer."
  - "Votre linge est en route. Livreur : {nom} — {phone}."

### 🆘 Module 10 : Gestion des litiges

- Vue comparative **photo avant / photo après**.
- Statut "litige" sur une commande.
- Notes internes.

---

## 💳 SYSTÈME DE SOUSCRIPTION SaaS (MONÉTISATION)

C'est **MOI** qui vends l'app aux pressings. Il faut 4 niveaux adaptés au marché ivoirien.

### 🟢 Plan **FREE** — 0 FCFA/mois

**Cible** : petits pressings qui testent.

- 30 commandes/mois max.
- 1 utilisateur.
- Paiement espèces uniquement.
- Pas de notifications automatiques.
- Support communautaire (WhatsApp groupe).

### 🔵 Plan **PRO** — **10 000 FCFA/mois** (ou 100 000 FCFA/an, -17%)

**Cible** : pressings établis.

- Commandes **illimitées**.
- 5 utilisateurs.
- Paiement Mobile Money (CinetPay).
- Notifications SMS/WhatsApp automatiques (500 SMS inclus/mois).
- Collecte & livraison à domicile.
- Packs clients illimités.
- Rapports basiques.
- Support email + WhatsApp.

### 🟣 Plan **BUSINESS** — **25 000 FCFA/mois** (ou 250 000 FCFA/an)

**Cible** : chaînes de pressings (2-5 boutiques).

- Tout le plan Pro +
- **Multi-boutiques** (jusqu'à 5).
- 20 utilisateurs.
- Gestion des livreurs & tournées.
- Statistiques avancées + export Excel/CSV.
- 2000 SMS inclus/mois.
- Support prioritaire (téléphone).

### 🟠 Plan **ENTERPRISE** — sur devis (à partir de 75 000 FCFA/mois)

- Boutiques illimitées.
- API access.
- Formation sur site.
- Account manager dédié.

### 🎁 Offres d'acquisition

- **30 jours d'essai gratuit** sur le plan PRO (carte non requise).
- **-30% à vie** pour les 100 premiers pressings (early adopters).
- **Parrainage** : 1 mois gratuit offert pour chaque pressing parrainé.
- **Paiement à la journée** : 500 FCFA/jour pour les pressings très saisonniers (option Wave/OM uniquement).

### 🔧 Implémentation technique

- Table `saas_subscriptions` + fonction Edge `check-subscription-status` appelée à chaque connexion.
- Blocage automatique des fonctionnalités si `subscription_expires_at < now()` et plan = `free` au-delà du quota.
- Page `/billing` avec :
  - Plan actuel + date d'expiration.
  - Bouton "Upgrade" → redirige vers CinetPay.
  - Historique des paiements.
- Webhook CinetPay → Edge Function `cinetpay-webhook` qui met à jour `saas_subscriptions`.

---

## 🎨 DESIGN & UX (RÈGLES STRICTES)

- **Mobile-first** absolu (90% des utilisateurs sont sur téléphone).
- **Français** par défaut, ton simple et direct.
- Couleurs : vert profond (#0F766E) + orange dynamique (#F97316) — rappelle la Côte d'Ivoire sans être criard.
- Icônes : **Lucide React**.
- Polices : **Inter** (UI) + **Poppins** (titres).
- **Mode hors-ligne partiel** (PWA) : la caisse doit fonctionner même sans réseau et synchroniser dès reconnexion.
- **Chargement optimisé** pour connexion 3G (lazy loading, images compressées).
- Interface livreur : **boutons XXL**, utilisable en plein soleil.
- Devise : **FCFA** (jamais €).
- Format téléphone : **+225 07 00 00 00 00**.

---

## 📅 PLAN DE DÉVELOPPEMENT (DÉVELOPPE DANS CET ORDRE)

**Phase 1 — Fondations (Semaine 1)**

1. Init projet Next.js 14 + Tailwind + shadcn/ui + Supabase.
2. Migrations SQL complètes + seed du catalogue CI.
3. Auth Supabase + onboarding gérant.

**Phase 2 — Cœur métier (Semaine 2-3)** 4. CRUD articles. 5. CRUD clients. 6. Prise de commande (caisse) + calcul auto + photo. 7. Workflow de statuts.

**Phase 3 — Logistique & Paiement (Semaine 4)** 8. Module collecte/livraison + interface livreur. 9. Intégration CinetPay (test mode). 10. Notifications SMS/WhatsApp.

**Phase 4 — SaaS & Dashboard (Semaine 5)** 11. Système d'abonnement SaaS complet. 12. Page billing + webhook CinetPay. 13. Dashboard avec graphiques.

**Phase 5 — Polish (Semaine 6)** 14. PWA + mode hors-ligne. 15. Tests end-to-end. 16. Déploiement Vercel + Supabase prod.

---

## 📦 LIVRABLES ATTENDUS À CHAQUE ÉTAPE

À chaque prompt que je te donnerai, tu dois :

1. **Expliquer brièvement** ce que tu vas faire (2-3 lignes max).
2. **Générer le code complet** des fichiers (pas de `// TODO`).
3. **Fournir les commandes shell** nécessaires (`npm install`, migrations SQL, etc.).
4. **Lister les variables d'environnement** à ajouter dans `.env.local`.
5. **Indiquer comment tester** ce que tu viens de livrer.

---

## 🚀 INSTRUCTION DE DÉMARRAGE

**Commence maintenant par la Phase 1, Étape 1** :

1. Génère la structure complète du projet Next.js 14 avec TypeScript, Tailwind, shadcn/ui.
2. Génère le fichier `supabase/migrations/001_init.sql` avec **toutes les tables ci-dessus**, leurs index, leurs contraintes et les policies RLS.
3. Génère le fichier `supabase/seed.sql` avec le catalogue ivoirien pré-rempli (au moins 15 articles).
4. Génère le client Supabase typé (`lib/supabase/client.ts` et `lib/supabase/server.ts`).
5. Génère les types TypeScript à partir du schéma (`lib/supabase/types.ts`).
6. Génère le `.env.example`.

**Ne saute aucune étape. Attends ma validation avant de passer à la Phase 2.**

---

### ✅ Copie ce prompt tel quel dans ton agent IA et envoie-le en premier message.

Parfait. Voici les deux livrables demandés, prêts à l'emploi.

---

# 📌 LIVRABLE 1 — PROMPT PHASE 2 (Auth + Onboarding)

> ⚠️ À envoyer **uniquement après validation de la Phase 1**. Copie-colle tel quel dans ton agent IA.

---

## 🔐 PROMPT PHASE 2 — Authentification, Onboarding & Multi-tenant

### 🎯 Contexte

La Phase 1 est validée. Nous avons maintenant :

- Le projet Next.js 14 + Tailwind + shadcn/ui + Supabase configuré.
- Les migrations SQL appliquées (tables `profiles`, `pressings`, `articles`, `clients`, `orders`, etc.).
- Le seed du catalogue ivoirien inséré.
- Le client Supabase typé (`lib/supabase/client.ts`, `server.ts`, `types.ts`).

### 🎯 Objectif de la Phase 2

Mettre en place **le système d'authentification complet, l'onboarding des gérants et la logique multi-tenant**, socle indispensable avant toute autre fonctionnalité.

---

### 📦 ÉTAPE 1 — Pages d'authentification

Génère les pages suivantes dans `app/(auth)/` :

1. **`/login`** — Connexion
   - Champ : email ou téléphone (au choix de l'utilisateur).
   - Champ : mot de passe.
   - Bouton "Se connecter".
   - Lien "Mot de passe oublié ?".
   - Lien "Créer un compte".

2. **`/register`** — Inscription
   - Choix du type de compte au premier écran :
     - **"Je gère un pressing"** (rôle `owner`)
     - **"Je suis client"** (rôle `client`)
   - Formulaire commun : nom complet, téléphone (+225), email, mot de passe (min 8 caractères, 1 chiffre).
   - Validation Zod stricte.
   - Après inscription :
     - Si `owner` → rediriger vers `/onboarding/pressing`
     - Si `client` → rediriger vers `/onboarding/client`

3. **`/forgot-password`** — Mot de passe oublié
   - Envoi d'un lien de réinitialisation via Supabase Auth (email + SMS fallback).

4. **`/reset-password`** — Réinitialisation
   - Nouveau mot de passe + confirmation.

**Contraintes techniques :**

- Utilise **Supabase Auth** (`signInWithPassword`, `signUp`, `resetPasswordForEmail`).
- Création automatique d'une entrée dans `profiles` via un **trigger Postgres** `on_auth_user_created` (génère la fonction SQL).
- **Middleware Next.js** (`middleware.ts`) pour protéger les routes :
  - Routes publiques : `/login`, `/register`, `/forgot-password`, `/reset-password`, `/`.
  - Toutes les autres routes nécessitent une session active.
- Stockage sécurisé de la session via `@supabase/ssr` (cookies httpOnly).

**Livrables attendus :**

- Code complet des 4 pages + composants de formulaire réutilisables (`AuthForm`, `InputField`).
- Migration SQL `002_auth_trigger.sql` avec la fonction `handle_new_user()`.
- `middleware.ts` complet.
- Tests manuels à effectuer (ex : créer un compte owner, vérifier la ligne `profiles`).

---

### 📦 ÉTAPE 2 — Onboarding Gérant (Pressing)

Génère le parcours `/onboarding/pressing` en **3 étapes** (wizard multi-étapes avec barre de progression) :

**Étape 1 — Identité du pressing**

- Nom du pressing (ex : "Pressing Élégance Cocody").
- Commune (dropdown : Abidjan communes + autres villes CI).
- Adresse précise.
- Téléphone professionnel.
- Horaires d'ouverture (par jour, avec option "fermé").
- **Upload logo** (Supabase Storage, bucket `pressing-assets`, max 2 Mo, formats JPG/PNG).

**Étape 2 — Services & tarifs**

- Toggle : "Proposer la collecte à domicile" → si oui, saisir frais de livraison par commune.
- Toggle : "Proposer la livraison à domicile".
- **Catalogue pré-rempli** issu du seed :
  - Afficher les 15 articles du seed avec prix par défaut.
  - Permettre au gérant de **modifier les prix**, de **désactiver** des articles, ou d'**en ajouter** d'autres.
  - Interface de type tableau éditable.
- Choix du délai standard par type de lavage (ex : eau = 24h, sec = 48h).

**Étape 3 — Choix du plan SaaS**

- Affichage des 4 plans (Free / Pro / Business / Enterprise) sous forme de cards comparatives.
- **Plan Free pré-sélectionné**.
- **Encart promotionnel** : "🎁 Offre de lancement : 30 jours d'essai gratuit sur le plan PRO pour les 100 premiers pressings !"
- Bouton "Démarrer mon essai gratuit" → crée une entrée `saas_subscriptions` avec `plan='pro'`, `status='trial'`, `expires_at = now() + 30 days`.
- Bouton "Continuer avec le plan gratuit".
- À la fin : redirection vers `/dashboard` avec message de bienvenue.

**Logique technique :**

- Création d'une ligne `pressings` liée à `profiles.pressing_id`.
- Insertion massive des articles choisis dans `articles`.
- Création de l'abonnement dans `saas_subscriptions`.
- Le tout dans une **Edge Function** `complete-onboarding` pour garantir l'atomicité (transaction Postgres).

**Livrables :**

- Pages `/onboarding/pressing/step-1`, `/step-2`, `/step-3`.
- Composant `OnboardingWizard` avec gestion d'état (Zustand).
- Edge Function `complete-onboarding`.
- Validation Zod à chaque étape.

---

### 📦 ÉTAPE 3 — Onboarding Client

Génère le parcours `/onboarding/client` en **1 seul écran** :

- Adresse de livraison principale.
- Commune.
- Préférences de contact (SMS / WhatsApp / Email — multi-select).
- **Sélection du pressing préféré** :
  - Liste des pressings de la commune du client (via recherche `pressings` par `commune`).
  - Possibilité de passer cette étape (mode "je choisirai plus tard").
- À la fin : redirection vers `/client/home`.

**Livrables :**

- Page complète avec validation Zod.
- Requête Supabase filtrée par commune.

---

### 📦 ÉTAPE 4 — Layout & Navigation selon rôle

Génère **3 layouts distincts** :

1. **`app/(owner)/layout.tsx`** — Layout gérant
   - Sidebar (desktop) / bottom nav (mobile) avec :
     - Dashboard
     - Commandes
     - Clients
     - Catalogue
     - Livraisons
     - Abonnement
     - Paramètres
   - Header avec nom du pressing + avatar.

2. **`app/(driver)/layout.tsx`** — Layout livreur
   - Interface simplifiée : uniquement "Mes tournées" + profil.
   - Bottom nav XXL, contrastes forts.

3. **`app/(client)/layout.tsx`** — Layout client
   - Bottom nav : Accueil / Mes commandes / Nouvelle commande / Profil.

**Logique de redirection automatique** dans `middleware.ts` :

- `owner` → `/dashboard`
- `driver` → `/driver/tours`
- `client` → `/client/home`

---

### 📦 ÉTAPE 5 — Page Profil & Paramètres

Génère `/settings/profile` (commun à tous les rôles) :

- Modification du nom, téléphone, email.
- Changement de mot de passe.
- Upload d'avatar.
- Déconnexion.
- **Zone danger** : suppression du compte (soft delete + confirmation par saisie du mot "SUPPRIMER").

---

### ✅ CRITÈRES DE VALIDATION DE LA PHASE 2

Avant de passer à la Phase 3, vérifie :

- [ ] Un gérant peut s'inscrire, compléter son onboarding, et atteindre son dashboard.
- [ ] Un client peut s'inscrire et voir sa page d'accueil.
- [ ] La table `profiles` se remplit automatiquement à chaque inscription.
- [ ] La table `pressings` est liée au `profiles.pressing_id` du gérant.
- [ ] Les articles du catalogue sont bien insérés et modifiables.
- [ ] Un abonnement `trial` est créé si le gérant choisit l'essai Pro.
- [ ] Le middleware bloque les routes protégées sans session.
- [ ] Le RLS empêche un gérant de voir les données d'un autre pressing.

**Une fois ces critères validés, attends mon feu vert avant de passer à la Phase 3 (Cœur métier : commandes, catalogue, clients).**

---

### 🚀 INSTRUCTION DE DÉMARRAGE

**Commence par l'Étape 1 (Pages d'authentification).**
Génère tout le code, les migrations SQL, le middleware, et indique-moi précisément comment tester (variables d'env à ajouter, commande à lancer, URL à visiter).

**Ne saute aucune étape. Attends ma validation avant l'Étape 2.**

---

# 🎨 LIVRABLE 2 — WIREFRAMES TEXTUELS DES ÉCRANS PRINCIPAUX

Voici la maquette textuelle écran par écran. Chaque wireframe est pensé **mobile-first** (format téléphone 375×812) et peut être implémenté directement.

---

## 📱 1. ÉCRAN DE CONNEXION (`/login`)

```
┌─────────────────────────────────┐
│                                 │
│         [LOGO PressingPro]      │
│                                 │
│    Bienvenue sur PressingPro     │
│    Gérez votre pressing          │
│    en toute simplicité.          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 📧 Email ou téléphone     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🔒 Mot de passe      👁   │  │
│  └───────────────────────────┘  │
│                                 │
│      Mot de passe oublié ?      │
│                                 │
│  ┌───────────────────────────┐  │
│  │     SE CONNECTER          │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────── ou ───────              │
│                                 │
│  Pas encore de compte ?          │
│       Créer un compte →          │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 2. ÉCRAN D'INSCRIPTION (`/register`)

```
┌─────────────────────────────────┐
│  ← Retour                       │
│                                 │
│  Créer un compte                │
│                                 │
│  Je suis :                      │
│  ┌───────────────────────────┐  │
│  │  🏪  Gérant de pressing    │  │ ← Sélectionné
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  👤  Client                │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Nom complet               │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🇨🇮 +225 07 00 00 00 00   │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Email                     │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Mot de passe         👁   │  │
│  └───────────────────────────┘  │
│  ▓▓▓▓▓░░░░  (force)             │
│                                 │
│  ☐ J'accepte les CGU            │
│                                 │
│  ┌───────────────────────────┐  │
│  │     CRÉER MON COMPTE      │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 3. ONBOARDING GÉRANT — ÉTAPE 1 (`/onboarding/pressing/step-1`)

```
┌─────────────────────────────────┐
│  ●●●○   Étape 1 sur 3           │
│                                 │
│  Parlez-nous de votre pressing  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  📷 Ajouter un logo       │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  Nom du pressing                │
│  ┌───────────────────────────┐  │
│  │ Pressing Élégance         │  │
│  └───────────────────────────┘  │
│                                 │
│  Commune                        │
│  ┌───────────────────────────┐  │
│  │ Cocody               ▼    │  │
│  └───────────────────────────┘  │
│                                 │
│  Adresse précise                │
│  ┌───────────────────────────┐  │
│  │ Rue des Jardins, Angré    │  │
│  └───────────────────────────┘  │
│                                 │
│  Téléphone pro                  │
│  ┌───────────────────────────┐  │
│  │ +225 27 22 XX XX XX       │  │
│  └───────────────────────────┘  │
│                                 │
│  Horaires d'ouverture           │
│  Lundi    09:00 - 19:00         │
│  Mardi    09:00 - 19:00         │
│  ...                            │
│  Dimanche  [Fermé]              │
│                                 │
│  ┌───────────────────────────┐  │
│  │       CONTINUER →         │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 4. ONBOARDING GÉRANT — ÉTAPE 2 (`/onboarding/pressing/step-2`)

```
┌─────────────────────────────────┐
│  ●●●○   Étape 2 sur 3           │
│                                 │
│  Vos services & tarifs          │
│                                 │
│  ☑ Proposer la collecte         │
│    Frais : 1000 FCFA            │
│  ☑ Proposer la livraison        │
│                                 │
│  ─── Votre catalogue ───        │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Chemise                   │  │
│  │ Eau : [ 500 ] FCFA        │  │
│  │ Sec : [1000 ] FCFA        │  │
│  │                     🗑     │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Costume 2 pièces          │  │
│  │ Eau : [2000 ] FCFA        │  │
│  │ Sec : [3000 ] FCFA        │  │
│  │                     🗑     │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Boubou                    │  │
│  │ Eau : [1500 ] FCFA        │  │
│  │ Sec : [2500 ] FCFA        │  │
│  │                     🗑     │  │
│  └───────────────────────────┘  │
│                                 │
│  + Ajouter un article           │
│                                 │
│  ┌───────────────────────────┐  │
│  │       CONTINUER →         │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 5. ONBOARDING GÉRANT — ÉTAPE 3 (Choix du plan)

```
┌─────────────────────────────────┐
│  ●●●●   Étape 3 sur 3           │
│                                 │
│  Choisissez votre plan          │
│                                 │
│  🎁 ESSAI GRATUIT 30 JOURS      │
│  sur le plan PRO pour les       │
│  100 premiers pressings !       │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🟢 FREE                  │  │
│  │  0 FCFA / mois            │  │
│  │  ✓ 30 commandes/mois      │  │
│  │  ✓ 1 utilisateur          │  │
│  │  ✓ Paiement espèces       │  │
│  │         [Choisir]         │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🔵 PRO        ⭐ Populaire │  │
│  │  10 000 FCFA / mois       │  │
│  │  ✓ Commandes illimitées   │  │
│  │  ✓ 5 utilisateurs         │  │
│  │  ✓ Mobile Money           │  │
│  │  ✓ SMS/WhatsApp auto      │  │
│  │  ✓ Livraison              │  │
│  │  [Essai gratuit 30j]      │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🟣 BUSINESS              │  │
│  │  25 000 FCFA / mois       │  │
│  │  ✓ Multi-boutiques        │  │
│  │  ✓ Gestion livreurs       │  │
│  │         [Choisir]         │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🟠 ENTERPRISE            │  │
│  │  Sur devis                │  │
│  │  À partir de 75 000 FCFA  │  │
│  │      [Nous contacter]     │  │
│  └───────────────────────────┘  │
│                                 │
│  Je choisirai plus tard →       │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 6. DASHBOARD GÉRANT (`/dashboard`)

```
┌─────────────────────────────────┐
│  ☰  Pressing Élégance     👤    │
│                                 │
│  Bonjour, Kouassi 👋            │
│  Voici votre activité du jour   │
│                                 │
│  ┌─────────────┬─────────────┐  │
│  │ CA du jour  │ Commandes   │  │
│  │ 45 500 FCFA │     12      │  │
│  │  ↑ +18%     │  ↑ +3       │  │
│  └─────────────┴─────────────┘  │
│                                 │
│  ┌─────────────┬─────────────┐  │
│  │ En attente  │ Prêtes      │  │
│  │     8       │     15      │  │
│  └─────────────┴─────────────┘  │
│                                 │
│  ⚠️ 3 commandes en retard       │
│  ┌───────────────────────────┐  │
│  │ PR-2026-0042 · Moussa K.  │  │
│  │ Prévue hier 18h · 2 jours │  │
│  └───────────────────────────┘  │
│                                 │
│  Commandes récentes             │
│  ┌───────────────────────────┐  │
│  │ PR-2026-0050              │  │
│  │ Aïcha T. · 3 articles     │  │
│  │ 3 500 FCFA · En traitement│  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ PR-2026-0049              │  │
│  │ Yao B. · 5 articles       │  │
│  │ 8 000 FCFA · Prêt         │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │   ➕ NOUVELLE COMMANDE    │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  🏠    📦     👥     ⚙️    🚚   │
│ Dash  Command Clients  Cat  Livr│
└─────────────────────────────────┘
```

---

## 📱 7. NOUVELLE COMMANDE — CAISSE (`/orders/new`)

```
┌─────────────────────────────────┐
│  ← Nouvelle commande            │
│                                 │
│  Client                         │
│  ┌───────────────────────────┐  │
│  │ 🔍 Rechercher client...   │  │
│  └───────────────────────────┘  │
│  [+ Nouveau client]             │
│                                 │
│  ─── Articles ───               │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Chemise                   │  │
│  │ ○ Eau 500   ● Sec 1000    │  │
│  │ Qté : [-] 2 [+]           │  │
│  │              1 000 FCFA   │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Costume 2 pièces          │  │
│  │ ● Eau 2000  ○ Sec 3000    │  │
│  │ Qté : [-] 1 [+]           │  │
│  │              2 000 FCFA   │  │
│  └───────────────────────────┘  │
│                                 │
│  + Ajouter un article           │
│                                 │
│  📸 Photos de réception *       │
│  ┌────┬────┬────┬──────────┐    │
│  │ 📷 │ 📷 │ 📷 │  + Ajouter│    │
│  └────┴────┴────┴──────────┘    │
│                                 │
│  Notes :                        │
│  ┌───────────────────────────┐  │
│  │ Tache sur manche gauche   │  │
│  └───────────────────────────┘  │
│                                 │
│  Mode de paiement               │
│  ○ Espèces   ● Wave  ○ OM      │
│  ○ Au retrait                   │
│                                 │
│  Sous-total :        3 000 FCFA │
│  Livraison :         1 000 FCFA │
│  ─────────────────────────────  │
│  TOTAL :             4 000 FCFA │
│                                 │
│  ┌───────────────────────────┐  │
│  │   VALIDER LA COMMANDE     │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 8. DÉTAIL D'UNE COMMANDE (`/orders/[id]`)

```
┌─────────────────────────────────┐
│  ← PR-2026-0050          ⋮     │
│                                 │
│  Statut : ● En traitement       │
│  ▓▓▓▓▓▓▓░░░░░░░  45%            │
│                                 │
│  Client                         │
│  ┌───────────────────────────┐  │
│  │ 👤 Aïcha Traoré            │  │
│  │ 📞 +225 07 88 55 44 22    │  │
│  │ 📍 Cocody Angré 7e tranche│  │
│  └───────────────────────────┘  │
│                                 │
│  Articles (3)                   │
│  • 2 Chemises (sec)  2 000 FCFA │
│  • 1 Costume (eau)   2 000 FCFA │
│                                 │
│  📸 Photos avant                │
│  [img1] [img2] [img3]           │
│                                 │
│  📸 Photos après                │
│  [En attente du lavage]         │
│                                 │
│  Délais                         │
│  Reçu le  : 25/09 10h30         │
│  Prévu le : 27/09 18h00         │
│                                 │
│  Paiement : ⚠️ Impayé           │
│  Total    : 4 000 FCFA          │
│                                 │
│  ┌───────────────────────────┐  │
│  │  📢 Notifier le client    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  ➡️ Changer le statut      │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  💰 Enregistrer paiement  │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 9. INTERFACE LIVREUR (`/driver/tours`)

```
┌─────────────────────────────────┐
│  🚚 Ma tournée du jour          │
│  26 Septembre 2026              │
│                                 │
│  ┌─────────────┬─────────────┐  │
│  │ À faire     │ Terminées   │  │
│  │     7       │     3       │  │
│  └─────────────┴─────────────┘  │
│                                 │
│  📍 Prochain arrêt              │
│  ┌───────────────────────────┐  │
│  │ 👤 Moussa Koné            │  │
│  │ 📞 +225 07 12 34 56 78    │  │
│  │ 📍 Angré 8e tranche        │  │
│  │ 🎯 COLLECTE               │  │
│  │ Commande PR-2026-0051     │  │
│  │                           │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  📞 APPELER         │  │  │
│  │  └─────────────────────┘  │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  🗺️  ITINÉRAIRE      │  │  │
│  │  └─────────────────────┘  │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  📸 PHOTO PREUVE    │  │  │
│  │  └─────────────────────┘  │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  ✅ TERMINÉ          │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
│                                 │
│  Arrêts suivants (6)            │
│  • Aïcha T. — Livraison         │
│  • Yao B. — Collecte            │
│  • Fatou D. — Livraison         │
│  ...                            │
│                                 │
├─────────────────────────────────┤
│     🚚           👤             │
│   Tournée      Profil           │
└─────────────────────────────────┘
```

---

## 📱 10. PAGE ABONNEMENT (`/billing`)

```
┌─────────────────────────────────┐
│  Mon abonnement                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🔵 PLAN PRO              │  │
│  │  Essai gratuit            │  │
│  │  Expire dans 23 jours     │  │
│  │  ▓▓▓▓▓▓▓░░░░░░░           │  │
│  └───────────────────────────┘  │
│                                 │
│  Utilisation ce mois            │
│  Commandes : 47 / ∞             │
│  SMS envoyés : 128 / 500        │
│  Utilisateurs : 2 / 5           │
│                                 │
│  ┌───────────────────────────┐  │
│  │  ⭐ ACTIVER PRO           │  │
│  │  10 000 FCFA / mois       │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  💰 PAYER PAR WAVE        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  💰 PAYER PAR ORANGE MONEY│  │
│  └───────────────────────────┘  │
│                                 │
│  Ou économisez 17%              │
│  ┌───────────────────────────┐  │
│  │  📅 PAIEMENT ANNUEL       │  │
│  │  100 000 FCFA / an        │  │
│  └───────────────────────────┘  │
│                                 │
│  Historique des paiements →     │
│                                 │
└─────────────────────────────────┘
```

---

## 📱 11. INTERFACE CLIENT — ACCUEIL (`/client/home`)

```
┌─────────────────────────────────┐
│  Bonjour Aïcha 👋               │
│                                 │
│  ┌───────────────────────────┐  │
│  │  ➕ NOUVELLE COMMANDE     │  │
│  │  Ramassage à domicile     │  │
│  └───────────────────────────┘  │
│                                 │
│  Ma commande en cours           │
│  ┌───────────────────────────┐  │
│  │ PR-2026-0050              │  │
│  │ ● En traitement           │  │
│  │ ▓▓▓▓▓▓░░░░░░              │  │
│  │ Prévue : 27/09 à 18h      │  │
│  │ 3 articles · 4 000 FCFA   │  │
│  │          Voir détails →   │  │
│  └───────────────────────────┘  │
│                                 │
│  Mes points fidélité            │
│  ┌───────────────────────────┐  │
│  │  ⭐ 45 points             │  │
│  │  Plus que 55 pts pour     │  │
│  │  un lavage gratuit !      │  │
│  └───────────────────────────┘  │
│                                 │
│  Mes packs actifs               │
│  ┌───────────────────────────┐  │
│  │ Pack 20 chemises / mois   │  │
│  │ 12 / 20 utilisées         │  │
│  │ Expire le 30/09           │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  🏠    📦     ➕     👤         │
│ Accueil Cdes Nouveau Profil     │
└─────────────────────────────────┘
```

---

## 🎯 Résumé visuel par écran

| Écran                        | Rôle cible    | Priorité MVP       |
| ---------------------------- | ------------- | ------------------ |
| Login / Register             | Tous          | 🔴 Critique        |
| Onboarding gérant (3 étapes) | Owner         | 🔴 Critique        |
| Onboarding client            | Client        | 🟠 Important       |
| Dashboard gérant             | Owner         | 🔴 Critique        |
| Nouvelle commande (caisse)   | Owner/Cashier | 🔴 Critique        |
| Détail commande              | Owner/Cashier | 🔴 Critique        |
| Interface livreur            | Driver        | 🟠 Important       |
| Page abonnement              | Owner         | 🔴 Critique        |
| Accueil client               | Client        | 🟡 Nice-to-have V1 |

---

Voilà tes deux livrables prêts. Une fois que ton agent IA a terminé la Phase 1 et que tu l'as validée, envoie le **Prompt Phase 2**. Et garde les wireframes sous les yeux pour vérifier visuellement chaque écran que l'agent génère.

# 📌 PROMPT PHASE 3 — Cœur Métier : Caisse, Commandes & Workflow de Statuts

> ⚠️ À envoyer **uniquement après validation complète de la Phase 2**. Copie-colle tel quel dans ton agent IA.

---

## 🎯 PROMPT PHASE 3 — Cœur Métier de PressingPro

### 🧭 Contexte

Les Phases 1 et 2 sont validées. Nous avons maintenant :

- Le projet Next.js 14 + Tailwind + shadcn/ui + Supabase entièrement configuré.
- Les migrations SQL appliquées (`profiles`, `pressings`, `articles`, `clients`, `orders`, `order_items`, `payments`, `deliveries`, `saas_subscriptions`, `customer_packs`, `notifications`).
- Le seed du catalogue ivoirien inséré (15+ articles).
- L'authentification complète (login, register, reset password) avec trigger `handle_new_user()`.
- L'onboarding gérant (3 étapes) et client.
- Les layouts par rôle (`owner`, `driver`, `client`) et le middleware de protection.

**Objectif de la Phase 3** : implémenter le **cœur métier** de l'application — c'est-à-dire tout ce qui permet à un pressing de **traiter une commande de A à Z**, du client qui entre dans la boutique jusqu'à la livraison du linge lavé, avec traçabilité, notifications et paiement.

C'est **LA phase la plus importante** du MVP. Elle doit être robuste, testée et pensée pour un usage quotidien intensif sur mobile.

---

## 📦 MODULE 1 — GESTION DES CLIENTS (CRUD)

### 🎯 Objectif

Permettre au gérant/caissier de gérer sa base clients avec recherche rapide, historique et fidélité.

### 📄 Pages & fonctionnalités

**1.1 — Liste des clients** (`/clients`)

- Barre de recherche instantanée (nom ou téléphone) — debounce 300ms.
- Filtres : Tous / Actifs (commande < 30j) / Inactifs / VIP (CA > 100 000 FCFA).
- Tri : Nom A-Z / Dernière commande / Total dépensé.
- Pagination infinie (scroll) — 20 clients par batch.
- Chaque ligne affiche : avatar (initiales), nom, téléphone, nb commandes, CA total, points fidélité.
- Bouton flottant "+ Nouveau client".

**1.2 — Création / Édition client** (`/clients/new`, `/clients/[id]/edit`)

- Champs : nom complet, téléphone (+225 préfixe), email (optionnel), commune (dropdown CI), adresse précise, notes internes.
- Validation Zod : téléphone ivoirien obligatoire au format `+225 07 XX XX XX XX`, nom min 2 caractères.
- **Détection de doublon** : si le téléphone existe déjà → proposer de fusionner ou d'utiliser le client existant.

**1.3 — Fiche client** (`/clients/[id]`)

- En-tête : nom, téléphone (avec bouton "Appeler" et "WhatsApp"), commune, points fidélité.
- Stats : CA total, nb commandes, panier moyen, dernière visite.
- Onglets :
  - **Historique** : liste des commandes avec statut et montant.
  - **Packs actifs** : packs clients en cours (issus de `customer_packs`).
  - **Notes internes** : notes libres sur le client.
- Actions rapides : "Nouvelle commande", "Ajouter au pack", "Envoyer un SMS promo".

**1.4 — Points de fidélité**

- Règle : **1 point par 1000 FCFA dépensés**.
- Attribution automatique à la validation de commande (déclencheur dans `order_items`).
- Affichage du palier : "45 pts / 100 pts pour un lavage gratuit".
- Fonction Edge `award-loyalty-points` appelée après `payment_status = 'paid'`.

### 🧩 Logique RLS

Un gérant ne voit QUE les clients de son `pressing_id`. Un client ne voit QUE son propre profil.

---

## 📚 MODULE 2 — CATALOGUE & TARIFS (CRUD)

### 🎯 Objectif

Permettre au gérant de gérer sa grille tarifaire dynamiquement (car les prix ne sont PAS uniformes d'un pressing à l'autre).

### 📄 Pages & fonctionnalités

**2.1 — Liste des articles** (`/catalogue`)

- Tableau éditable inline (type Excel) sur desktop.
- Cards sur mobile avec édition en modal.
- Colonnes : nom, catégorie, type de lavage, prix, délai estimé (heures), actif/inactif.
- Filtres : par catégorie, par type de lavage, actif/inactif.
- Recherche par nom.

**2.2 — Création / Édition article** (`/catalogue/new`, `/catalogue/[id]/edit`)

- Champs : nom, catégorie (habit, linge_maison, cuir, délicat), type de lavage (sec, eau, repassage_seul, détachage), prix en FCFA, délai estimé (heures), description courte.
- Upload photo de l'article (optionnel, Supabase Storage bucket `article-images`).
- Toggle actif/inactif.

**2.3 — Actions groupées**

- Sélection multiple → activer/désactiver en masse.
- **Augmentation globale** : "+10% sur tous les prix" ou "+500 FCFA sur tous les articles secs" (utile pour l'inflation).

**2.4 — Historique des prix** (nice-to-have V1)

- Table `price_history` pour tracer les changements.

### 🧩 Contrainte importante

Chaque article est **unique par `pressing_id`**. Deux pressings peuvent avoir le même nom "Chemise" mais avec des prix différents.

---

## 🧾 MODULE 3 — CAISSE : NOUVELLE COMMANDE

### 🎯 Objectif

C'est **l'écran le plus utilisé** du quotidien. Il doit permettre de créer une commande en moins de 60 secondes sur mobile.

### 📄 Page `/orders/new`

**3.1 — Sélection du client**

- Recherche instantanée par nom ou téléphone.
- Bouton "+ Nouveau client" → ouvre un modal léger (nom + téléphone uniquement, email optionnel).
- Affichage du client sélectionné : nom, téléphone, points fidélité, packs actifs.
- **Si le client a un pack actif** : afficher un badge "Pack 12/20 disponible" et proposer automatiquement d'y déduire les articles éligibles.

**3.2 — Ajout d'articles au panier**

- Grille des articles actifs du catalogue (cards avec icône + nom + prix de base).
- Au clic sur un article → modal de configuration :
  - Type de lavage (radio : Eau / Sec / Repassage seul / Détachage) avec prix mis à jour en temps réel.
  - Quantité (stepper - et +).
  - Instructions spéciales (textarea, ex : "tache sur manche gauche", "bouton manquant").
  - **Photo obligatoire de l'article à la réception** (mobile : appareil photo direct ; desktop : upload).
- Le panier apparaît en bas, sticky, avec :
  - Liste des articles ajoutés (modifiable, supprimable).
  - Sous-total calculé automatiquement.

**3.3 — Options de commande**

- **Mode de réception** :
  - "En boutique" (par défaut) → statut initial `pending`.
  - "Collecte à domicile" → ouvre un formulaire : adresse, commune, créneau souhaité. Statut initial `pickup_scheduled`.
- **Mode de livraison** :
  - "Retrait en boutique" (par défaut).
  - "Livraison à domicile" → ajoute automatiquement les frais selon la commune.
- **Urgence** (option premium) : toggle "Express 6h" → +50% sur le sous-total, délai réduit.

**3.4 — Paiement**

- Choix du mode : Espèces / Wave / Orange Money / MTN MoMo / Moov / Au retrait.
- Si Mobile Money → génération d'un lien de paiement CinetPay (Phase 4 branchera le webhook, ici on prépare l'appel).
- Si "Au retrait" → commande créée avec `payment_status = 'unpaid'`.
- Si Espèces → `payment_status = 'paid'` + entrée dans `payments`.
- **Calcul automatique** : sous-total + frais livraison + majoration express - remises pack = TOTAL.

**3.5 — Validation**

- Bouton "VALIDER LA COMMANDE" (sticky bottom, gros, contrasté).
- Génération du **numéro unique** : format `PR-{YYYY}-{compteur 4 chiffres}` par pressing (ex: `PR-2026-0042`). Le compteur repart à 0001 chaque 1er janvier.
- Insertion atomique dans une **Edge Function** `create-order` :
  1. Créer la ligne `orders`.
  2. Créer les lignes `order_items` (avec photos).
  3. Créer la ligne `payments` si payé.
  4. Créer la ligne `deliveries` si collecte/livraison.
  5. Insérer une notification dans `notifications` (statut à envoyer en Phase 4).
  6. Attribuer les points fidélité si `paid`.
- **Redirection** vers `/orders/[id]` avec toast de succès.
- **Option** : imprimer un ticket thermique 58mm ou envoyer un PDF au client par WhatsApp.

**3.6 — Mode hors-ligne (PWA)**

- Si pas de réseau → mise en queue locale (IndexedDB) et synchronisation auto dès reconnexion.
- Bandeau discret en haut : "Mode hors-ligne — la commande sera synchronisée".

---

## 📋 MODULE 4 — LISTE & GESTION DES COMMANDES

### 📄 Page `/orders`

**4.1 — Vue Kanban (mobile : onglets)**
Colonnes / onglets par statut :

- 🟡 Reçues (pending)
- 🚚 En collecte (pickup_scheduled, picked_up)
- 🧺 En traitement (in_processing)
- ✅ Prêtes (ready)
- 🛵 En livraison (out_for_delivery)
- ✔️ Livrées (delivered — 7 derniers jours)
- ❌ Annulées

Sur **desktop** : vraie vue Kanban drag-and-drop (dnd-kit).
Sur **mobile** : tabs scrollables horizontalement.

**4.2 — Filtres & tri**

- Par date (aujourd'hui, 7j, 30j, personnalisé).
- Par client.
- Par type de paiement (payé/impayé).
- Par mode de réception (boutique/domicile).
- Tri : plus récentes, plus anciennes, plus urgentes.

**4.3 — Vue liste**
Chaque ligne affiche :

- Numéro de commande.
- Nom client + téléphone.
- Nombre d'articles.
- Montant total.
- Statut (badge coloré).
- Délai restant (badge rouge si en retard).

**4.4 — Actions rapides** (swipe sur mobile)

- Appeler le client.
- Envoyer SMS.
- Changer le statut.
- Voir détails.

---

## 🔄 MODULE 5 — DÉTAIL COMMANDE & WORKFLOW DE STATUTS

### 📄 Page `/orders/[id]`

C'est **le hub central** d'une commande. Toute l'info doit être accessible sans scroller 10 fois.

**5.1 — En-tête**

- Numéro de commande + statut actuel (badge coloré).
- Barre de progression visuelle (7 étapes).
- Bouton "⋮" → menu (modifier, annuler, dupliquer, imprimer).

**5.2 — Client**

- Card : nom, téléphone (Appeler / WhatsApp / SMS), adresse si livraison.
- Badge pack actif si applicable.

**5.3 — Articles**

- Liste des articles avec photo de réception en miniature.
- Type de lavage, quantité, prix unitaire, sous-total.
- Instructions spéciales affichées en évidence (fond jaune pâle).
- Bouton "Ajouter une photo après lavage" (visible une fois en traitement).

**5.4 — Comparateur de photos (anti-litige)**

- Vue side-by-side : **Photo avant** vs **Photo après**.
- Zoom au clic.
- Bouton "Signaler un problème" → crée un statut `disputed` + note interne.

**5.5 — Délais & traçabilité**

- Timeline verticale :
  - 🟡 Commande créée — 25/09 10:30
  - 🚚 Collectée — 25/09 11:15
  - 🧺 En traitement — 25/09 14:00
  - ✅ Prête — 26/09 09:00 (par Awa, employée)
  - 🛵 En livraison — 26/09 15:00 (livreur : Ibrahim)
  - ✔️ Livrée — 26/09 16:30
- **Enregistrement automatique** de l'utilisateur qui change chaque statut dans une table `order_status_history`.

**5.6 — Paiement**

- Statut : Impayé / Partiel / Payé.
- Montant total, montant payé, reste à payer.
- Historique des paiements (`payments`).
- Bouton "Enregistrer un paiement" → modal (montant, méthode, référence).

**5.7 — Notifications envoyées**

- Liste des SMS/WhatsApp envoyés à ce client pour cette commande.

**5.8 — Changement de statut**
Bouton principal contextuel selon le statut actuel :

- `pending` → "Marquer comme collecté" ou "Démarrer le traitement"
- `picked_up` → "Démarrer le traitement"
- `in_processing` → "Marquer comme prêt" (obligation : ajouter photo après)
- `ready` → "Envoyer en livraison" ou "Notifier le client"
- `out_for_delivery` → "Marquer comme livré" (upload preuve)
- `delivered` → "Clôturer"

**Chaque transition** :

1. Vérifie les règles métier (ex : impossible de passer à `ready` sans photo après).
2. Insère une ligne dans `order_status_history`.
3. Déclenche une notification (Phase 4 — ici juste enqueue dans `notifications`).
4. Envoie un toast de confirmation.

**5.9 — Annulation**

- Bouton "Annuler la commande" (visible uniquement si statut ≠ `delivered`).
- Modal : motif obligatoire (dropdown : client absent, article introuvable, autre) + note.
- Statut → `cancelled`.

---

## 🚚 MODULE 6 — LIVRAISON & TOURNÉES (socle)

### 🎯 Objectif

Préparer la logistique (assignation livreur, tournées). L'interface complète livreur sera finalisée en Phase 5, mais le socle est posé ici.

**6.1 — Page `/deliveries`**

- Vue calendrier/journalière : tournées du jour, de demain, de la semaine.
- Deux onglets : Collectes / Livraisons.
- Chaque carte : adresse, client, nb articles, livreur assigné, statut.

**6.2 — Assignation livreur**

- Bouton "Assigner un livreur" → dropdown des profils `driver` du pressing.
- Une fois assigné → insertion dans `deliveries` avec `driver_id`.

**6.3 — Calcul des frais**

- Paramétrable par commune dans les paramètres du pressing.
- Valeur par défaut : 1000 FCFA intra-commune, 1500 FCFA inter-communes.
- Option "gratuit à partir de X FCFA d'achat" (paramétrable).

---

## 📊 MODULE 7 — DASHBOARD GÉRANT (données réelles)

### 📄 Page `/dashboard`

**7.1 — KPIs du jour**

- CA du jour (avec comparaison J-1, % évolution).
- Nb commandes du jour.
- Commandes en attente / prêtes / en livraison.
- Panier moyen.

**7.2 — Alertes**

- 🔴 Commandes en retard (dépassant le délai estimé).
- 🟠 Paiements en attente > 7 jours.
- 🟡 Litiges ouverts.

**7.3 — Graphiques (Recharts)**

- CA des 7 derniers jours (bar chart).
- Répartition des commandes par statut (donut).
- Top 5 articles les plus lavés (bar horizontal).

**7.4 — Commandes récentes**

- 5 dernières commandes avec lien direct.

**7.5 — Actions rapides**

- Bouton "+ Nouvelle commande" (sticky sur mobile).

---

## 🔔 MODULE 8 — NOTIFICATIONS (préparation Phase 4)

### 🎯 Objectif

Poser les fondations pour les SMS/WhatsApp automatiques. **Pas d'envoi réel ici** — juste la logique et l'enqueue.

**8.1 — Templates de notifications**
Table `notification_templates` avec :

- `pressing_id`, `event` (order_created, order_ready, out_for_delivery, delivered, pickup_reminder), `channel` (sms/whatsapp), `body` (avec variables `{client_name}`, `{order_number}`, `{pressing_name}`).

**8.2 — File d'attente**
Chaque transition de statut insère une ligne dans `notifications` avec `status = 'queued'`. La Phase 4 branchera l'envoi effectif via Orange SMS API et WhatsApp Cloud API.

**8.3 — Page `/settings/notifications`**

- Activation/désactivation par événement.
- Personnalisation des templates avec aperçu en direct.

---

## 🧪 MODULE 9 — RECHERCHE GLOBALE & RACCOURCIS

**9.1 — Barre de recherche globale** (dans le header)

- Recherche par numéro de commande, nom client, téléphone.
- Résultats instantanés.

**9.2 — Raccourcis clavier (desktop)**

- `Ctrl+N` → Nouvelle commande.
- `Ctrl+K` → Recherche globale.
- `Ctrl+C` → Clients.
- `Ctrl+D` → Dashboard.

---

## 🔒 MODULE 10 — RÈGLES MÉTIER & VALIDATIONS

**Règles strictes à implémenter dans des fonctions Postgres ou Edge Functions :**

1. **Numéro de commande unique** : impossible de créer deux commandes avec le même `order_number` pour un même pressing. Génération via sequence Postgres par pressing.
2. **Photo obligatoire à la réception** : au moins 1 photo par ligne `order_item` avant `payment_status` validé.
3. **Photo obligatoire avant `ready`** : impossible de passer à `ready` sans photo "après".
4. **Statuts irréversibles** : `delivered` et `cancelled` sont terminaux.
5. **Points fidélité** : attribués uniquement si `payment_status = 'paid'`.
6. **Pack client** : déduit automatiquement si le client a un pack actif et que l'article est éligible.
7. **Concurrence** : si deux caissiers modifient la même commande simultanément, utiliser Supabase Realtime pour la synchro.
8. **Retard** : calculé automatiquement (comparaison `delivery_scheduled_at` et `now()`).

---

## 🎨 UX / DESIGN

**Règles strictes :**

- **Mobile-first** absolu.
- **Actions en 1 tap maximum** : le caissier ne doit jamais chercher un bouton.
- **Feedback haptique** (vibration) sur mobile lors des actions critiques (validation commande, changement de statut).
- **Toasts** clairs, en français simple : "Commande PR-2026-0042 créée avec succès ✅".
- **États de chargement** : skeleton screens, pas de spinner plein écran.
- **Optimistic UI** : les changements de statut s'affichent instantanément puis se confirment en arrière-plan.
- **Mode sombre** : support automatique (system preference).
- **Contrastes forts** pour usage en plein soleil (livreurs, caissiers sous véranda).
- **Pas de jargons techniques** : jamais "pending" visible à l'écran → toujours "Reçue".

---

## 🧪 TESTS & LIVRABLES

**Tests à implémenter avec Vitest + Testing Library :**

- `create-order.test.ts` : vérifier la génération du numéro unique, le calcul du total, la création atomique.
- `workflow.test.ts` : vérifier les transitions autorisées/interdites.
- `loyalty.test.ts` : vérifier l'attribution correcte des points.
- `pack-deduction.test.ts` : vérifier la déduction automatique des packs.

**Livrables attendus à chaque étape :**

1. Code complet des pages, composants, hooks.
2. Edge Functions : `create-order`, `update-order-status`, `award-loyalty-points`, `deduct-pack`.
3. Migrations SQL additionnelles : `003_order_history.sql`, `004_notification_templates.sql`, `005_order_number_sequence.sql`.
4. Types TypeScript mis à jour (`lib/supabase/types.ts`).
5. Tests unitaires.
6. Notes de test manuel (que faire pour valider).

---

## 📅 PLAN DE DÉVELOPPEMENT (DANS CET ORDRE)

**Étape 1 — Clients (CRUD complet)** — 1 jour
**Étape 2 — Catalogue (CRUD complet)** — 1 jour
**Étape 3 — Caisse (nouvelle commande)** — 2 jours ⭐ CRITIQUE
**Étape 4 — Liste & Kanban des commandes** — 1 jour
**Étape 5 — Détail commande & workflow statuts** — 2 jours ⭐ CRITIQUE
**Étape 6 — Livraison (socle)** — 1 jour
**Étape 7 — Dashboard avec données réelles** — 1 jour
**Étape 8 — Templates de notifications (enqueue)** — 0.5 jour
**Étape 9 — Recherche globale + raccourcis** — 0.5 jour
**Étape 10 — Tests & polish** — 1 jour

**Total estimé : ~11 jours de développement assisté par IA.**

---

## ✅ CRITÈRES DE VALIDATION DE LA PHASE 3

Avant de passer à la Phase 4, vérifie :

- [ ] Je peux créer un client, l'éditer, le supprimer (soft delete), et voir son historique.
- [ ] Je peux créer un article, modifier son prix, le désactiver.
- [ ] Je peux créer une commande de A à Z en moins de 60 secondes sur mobile.
- [ ] Le numéro de commande est unique et bien formaté (`PR-2026-0001`).
- [ ] Les photos "avant" sont bien uploadées et visibles.
- [ ] Le workflow de statuts respecte toutes les règles métier.
- [ ] Le passage à `ready` exige une photo "après".
- [ ] Les points fidélité sont attribués automatiquement.
- [ ] Un pack client est déduit automatiquement si applicable.
- [ ] Le Kanban affiche correctement les commandes par statut.
- [ ] Le dashboard affiche des KPIs réels (pas de données hardcodées).
- [ ] Les tests unitaires passent tous.
- [ ] Aucune donnée d'un autre pressing n'est visible (test RLS manuel).

**Une fois ces critères validés, attends mon feu vert avant de passer à la Phase 4 (Paiements CinetPay, notifications SMS/WhatsApp réelles, abonnement SaaS complet).**

---

## 🚀 INSTRUCTION DE DÉMARRAGE

**Commence par l'Étape 1 (CRUD Clients).**

Génère :

1. La page `/clients` avec liste, recherche, filtres et pagination.
2. Les pages `/clients/new`, `/clients/[id]/edit`, `/clients/[id]`.
3. Les composants réutilisables (`ClientCard`, `ClientForm`, `ClientSearch`).
4. Les Server Actions Next.js pour CRUD + les hooks React Query.
5. Les validations Zod.
6. Les policies RLS nécessaires (migration `006_clients_rls.sql` si pas déjà faites).

Indique-moi comment tester (URL à visiter, données à insérer, tests manuels).

**Ne saute aucune étape. Attends ma validation avant l'Étape 2 (Catalogue).**

---

## 💡 CONSEILS D'IMPLÉMENTATION POUR TON AGENT

Ajoute ces instructions à ton agent pour qu'il soit plus efficace :

> - **Toujours utiliser les Server Components** pour les pages en lecture, et Client Components uniquement pour l'interactivité.
> - **Utiliser React Query (TanStack Query)** pour toutes les mutations et fetch côté client.
> - **Utiliser Supabase Realtime** pour synchroniser le Kanban entre caissiers en temps réel.
> - **Utiliser Server Actions Next.js** pour les mutations simples, Edge Functions Supabase pour les opérations atomiques multi-tables.
> - **Optimiser les images** avec `next/image` + Supabase Storage transformations.
> - **Code en français pour les labels UI**, en anglais pour le code (noms de variables, fonctions).
> - **Utiliser des constantes centralisées** pour les statuts, types de lavage, catégories (`lib/constants.ts`).
> - **Chaque composant doit être testable** : pas de fetch direct dans les composants, toujours passer par des hooks.

---

## 📎 ANNEXE — CONSTANTES À CRÉER (`lib/constants.ts`)

```typescript
export const ORDER_STATUS = {
  PENDING: "pending",
  PICKUP_SCHEDULED: "pickup_scheduled",
  PICKED_UP: "picked_up",
  IN_PROCESSING: "in_processing",
  READY: "ready",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const ORDER_STATUS_LABELS = {
  pending: "Reçue",
  pickup_scheduled: "Collecte planifiée",
  picked_up: "Collectée",
  in_processing: "En traitement",
  ready: "Prête",
  out_for_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
} as const;

export const WASH_TYPES = {
  EAU: "eau",
  SEC: "sec",
  REPASSAGE: "repassage_seul",
  DETACHAGE: "detachage",
} as const;

export const WASH_TYPE_LABELS = {
  eau: "Lavage à l'eau",
  sec: "Nettoyage à sec",
  repassage_seul: "Repassage seul",
  detachage: "Détachage",
} as const;

export const ARTICLE_CATEGORIES = {
  HABIT: "habit",
  LINGE_MAISON: "linge_maison",
  CUIR: "cuir",
  DELICAT: "delicat",
} as const;

export const PAYMENT_METHODS = {
  CASH: "cash",
  WAVE: "wave",
  ORANGE: "orange",
  MTN: "mtn",
  MOOV: "moov",
} as const;

export const CI_COMMUNES = [
  "Abobo",
  "Adjamé",
  "Attécoubé",
  "Cocody",
  "Koumassi",
  "Marcory",
  "Plateau",
  "Port-Bouët",
  "Treichville",
  "Yopougon",
  "Bingerville",
  "Songon",
  "Anyama",
  // + autres villes : Bouaké, Yamoussoukro, San-Pédro, Korhogo, Daloa...
] as const;
```

---

# 📌 PROMPT PHASE 4 — Paiements Mobile Money, Notifications SMS/WhatsApp & Système d'Abonnement SaaS Complet

> ⚠️ À envoyer **uniquement après validation complète de la Phase 3**. Copie-colle tel quel dans ton agent IA.

---

## 🎯 PROMPT PHASE 4 — Monétisation & Communication

### 🧭 Contexte

Les Phases 1, 2 et 3 sont validées. Nous avons maintenant :

- Le projet Next.js 14 + Supabase entièrement fonctionnel.
- L'authentification, l'onboarding, les layouts par rôle.
- Le CRUD complet : clients, catalogue, commandes, workflow de statuts.
- Le Kanban des commandes, le dashboard avec KPIs réels.
- Les tables `payments`, `deliveries`, `notifications`, `saas_subscriptions`, `customer_packs` déjà créées.
- Les Edge Functions `create-order`, `update-order-status`, `award-loyalty-points` en place.
- La file d'attente `notifications` avec `status = 'queued'` (Phase 3, étape 8).

**Objectif de la Phase 4** : transformer PressingPro en un **produit monétisable et communicant**. Cette phase branche les **paiements Mobile Money réels** (CinetPay), les **notifications SMS et WhatsApp automatiques**, et le **système d'abonnement SaaS complet** qui me permet de facturer mes pressings clients.

C'est la phase qui transforme le prototype en **business**.

---

## 💳 MODULE 1 — PAIEMENTS MOBILE MONEY VIA CINETPAY

### 🎯 Objectif

Permettre aux pressings de **recevoir des paiements Mobile Money** (Wave, Orange Money, MTN MoMo, Moov) directement depuis l'application, pour les commandes de leurs clients.

### 🔑 Prérequis CinetPay

Avant de coder, l'utilisateur doit :

1. Créer un compte marchand sur [cinetpay.com](https://cinetpay.com).
2. Récupérer : `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY` (pour HMAC).
3. Configurer le mot de passe API dans le backoffice CinetPay.
4. Activer les canaux Mobile Money : Wave, Orange Money, MTN MoMo, Moov Africa.
5. Configurer l'URL de notification (webhook) : `https://votre-domaine.com/api/webhooks/cinetpay`.

### 📄 Pages & fonctionnalités

**1.1 — Initiation d'un paiement**
Depuis la caisse (`/orders/new`) ou le détail commande (`/orders/[id]`), quand le mode de paiement est Mobile Money :

- **Edge Function** `initiate-cinetpay-payment` qui :
  1. Génère un `transaction_id` unique (format : `PRESSING_{pressing_id}_{timestamp}`).
  2. Appelle l'API CinetPay `POST https://api-checkout.cinetpay.com/v2/payment` avec :
     ```json
     {
       "apikey": "VOTRE_API_KEY",
       "site_id": "VOTRE_SITE_ID",
       "transaction_id": "PRESSING_abc_1699999999",
       "amount": 4000,
       "currency": "XOF",
       "description": "Commande PR-2026-0042 - Pressing Élégance",
       "notify_url": "https://votre-domaine.com/api/webhooks/cinetpay",
       "return_url": "https://votre-domaine.com/orders/PR-2026-0042",
       "channels": "MOBILE_MONEY",
       "customer_name": "Aïcha",
       "customer_surname": "Traoré",
       "customer_phone_number": "+2250788554422",
       "customer_email": "aicha@example.com",
       "customer_address": "Cocody Angré",
       "customer_city": "Abidjan",
       "customer_country": "CI",
       "customer_state": "CI",
       "customer_zip_code": "00225"
     }
     ```
  3. Reçoit en réponse `payment_url` et `payment_token`.
  4. Stocke la transaction dans `payments` avec `status = 'pending'`.
  5. Retourne le `payment_url` au frontend.
- **Frontend** : ouvre le `payment_url` dans un nouvel onglet (ou WebView sur mobile) → le client paie sur l'interface CinetPay.
- **Après paiement** : redirection vers `return_url` avec affichage du statut en temps réel (via polling ou Supabase Realtime).

**1.2 — Webhook CinetPay (Edge Function `cinetpay-webhook`)**
C'est **le cœur de la fiabilité**. CinetPay envoie une requête POST à cette URL à chaque changement de statut.

L'Edge Function doit :

1. **Recevoir** la requête POST avec les données CinetPay.
2. **Vérifier le token HMAC** dans le header `x-token` pour s'assurer que la requête vient bien de CinetPay. Le SDK Node.js `cinetpay-node-sdk` fournit une fonction `verifyHMACToken(token, secret, body)`.
3. **Ne JAMAIS faire confiance au statut envoyé directement** : toujours appeler l'API de vérification CinetPay (`GET /v2/payment/check`) avec `transaction_id` et `site_id` pour obtenir le **vrai statut** de la transaction.
4. Si le statut est `ACCEPTED` :
   - Mettre à jour `payments.status = 'success'`.
   - Mettre à jour `orders.payment_status = 'paid'`.
   - Attribuer les points fidélité.
   - Enqueue une notification SMS/WhatsApp au client.
5. Si le statut est `REFUSED` ou `CANCELLED` :
   - Mettre à jour `payments.status = 'failed'`.
   - Ne pas changer le statut de la commande.
6. **Retourner HTTP 200 OK** dans tous les cas pour éviter les retries infinis.
7. **Idempotence** : vérifier que la transaction n'a pas déjà été traitée avant d'agir (CinetPay peut appeler plusieurs fois le webhook).

**1.3 — Vérification manuelle**

- Bouton "Vérifier le paiement" dans le détail commande.
- Appelle l'Edge Function `check-cinetpay-transaction` qui interroge CinetPay et met à jour la DB.
- Utile si le webhook a échoué ou si le caissier veut confirmer manuellement.

**1.4 — Paiement en espèces (fallback)**

- Toujours disponible pour les clients non digitalisés.
- Enregistrement manuel dans `payments` avec `method = 'cash'`.
- Génération d'un reçu digital.

**1.5 — Remboursement**

- Bouton "Rembourser" dans le détail commande (visible uniquement si `payment_status = 'paid'`).
- Appelle l'API CinetPay de remboursement (ou enregistre manuellement si non supporté).
- Met à jour `payments.status = 'refunded'`.

### 📦 Livrables attendus

- Edge Function `initiate-cinetpay-payment`.
- Edge Function `cinetpay-webhook` (avec `verify_jwt = false` dans `config.toml`).
- Edge Function `check-cinetpay-transaction`.
- Composant `PaymentButton` (choix méthode + redirection).
- Composant `PaymentStatus` (badge temps réel).
- Migration SQL `007_payment_fields.sql` (ajout `transaction_id`, `payment_token`, `cinetpay_raw_response` dans `payments`).
- Variables d'environnement : `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY`, `CINETPAY_NOTIFY_URL`, `CINETPAY_RETURN_URL`.

---

## 📱 MODULE 2 — NOTIFICATIONS SMS VIA ORANGE SMS API

### 🎯 Objectif

Envoyer des SMS automatiques aux clients à chaque étape du workflow (commande créée, prête, en livraison, livrée) et aux gérants (rappels d'abonnement).

### 🔑 Prérequis Orange SMS API Côte d'Ivoire

1. Créer un compte développeur sur [developer.orange.com](https://developer.orange.com).
2. Souscrire à l'API **SMS Cote d'Ivoire 2.0**.
3. Récupérer `ORANGE_CLIENT_ID` et `ORANGE_CLIENT_SECRET`.
4. Acheter un pack SMS (à partir de 100 SMS, ~10 FCFA/SMS en volume).
5. Configurer le **sender name** (nom d'expéditeur personnalisé) via WHITELIST.

### 🔐 Authentification OAuth 2.0

L'API Orange utilise **OAuth 2.0 v3**. Il faut :

1. Obtenir un token via `POST https://api.orange.com/oauth/v3/token` avec `client_id` et `client_secret`.
2. Utiliser ce token dans le header `Authorization: Bearer {token}` pour chaque envoi.
3. Le token expire après ~1 heure → implémenter un cache avec rafraîchissement automatique.

### 📄 Fonctionnalités

**2.1 — Edge Function `send-sms`**

```typescript
// Pseudo-code
async function sendSMS(phone: string, message: string) {
  const token = await getOrangeToken(); // cache 1h
  const response = await fetch(
    `https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B2250000/requests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: `tel:+225${phone}`,
          senderAddress: `tel:+2250000`,
          outboundSMSTextMessage: { message },
        },
      }),
    },
  );
  return response.ok;
}
```

**2.2 — Worker de traitement de la file d'attente**

- Cron job Supabase (toutes les minutes) ou Edge Function déclenchée par `pg_cron`.
- Lit les lignes `notifications` avec `status = 'queued'`.
- Pour chaque ligne, appelle `send-sms` ou `send-whatsapp`.
- Met à jour `status = 'sent'` ou `status = 'failed'` avec le code d'erreur.

**2.3 — Templates SMS**
Créer une table `notification_templates` avec les templates par défaut :

| Événement               | Template                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `order_created`         | `Bonjour {client_name}, votre commande {order_number} a bien été enregistrée chez {pressing_name}. Total : {total} FCFA. Merci !`           |
| `order_ready`           | `Bonjour {client_name}, votre commande {order_number} est prête ! Vous pouvez venir la récupérer chez {pressing_name}.`                     |
| `out_for_delivery`      | `Bonjour {client_name}, votre linge est en route. Livreur : {driver_name} - {driver_phone}.`                                                |
| `delivered`             | `Bonjour {client_name}, votre commande {order_number} a été livrée. Merci de votre confiance !`                                             |
| `pickup_reminder`       | `Bonjour {client_name}, n'oubliez pas de venir récupérer votre commande {order_number} chez {pressing_name}.`                               |
| `subscription_expiring` | `Bonjour {owner_name}, votre abonnement PressingPro expire dans {days} jours. Renouvelez pour continuer à profiter de vos fonctionnalités.` |

**2.4 — Page `/settings/notifications` (Gérant)**

- Activation/désactivation par événement.
- Personnalisation des templates (avec variables `{client_name}`, `{order_number}`, etc.).
- **Aperçu en direct** du SMS tel qu'il sera envoyé.
- Compteur de SMS restants dans le pack Orange.

### 📦 Livrables

- Edge Function `send-sms` (avec cache token OAuth).
- Edge Function `send-whatsapp` (voir Module 3).
- Edge Function `process-notification-queue`.
- Migration SQL `008_notification_templates.sql`.
- Page `/settings/notifications`.
- Variables d'environnement : `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET`, `ORANGE_SENDER_NAME`, `ORANGE_SENDER_ADDRESS`.

---

## 💬 MODULE 3 — NOTIFICATIONS WHATSAPP VIA WHATSAPP CLOUD API

### 🎯 Objectif

Offrir un canal **gratuit** et **très utilisé en Côte d'Ivoire** pour les notifications clients. WhatsApp est le canal préféré des Ivoiriens pour les communications commerciales.

### 🔑 Prérequis Meta WhatsApp Cloud API

1. Créer un compte **Meta Business Suite**.
2. Configurer un **WhatsApp Business Account (WABA)**.
3. Obtenir un **numéro de téléphone Business** et un **Phone Number ID**.
4. Générer un **token d'accès permanent** via Meta for Developers.
5. Créer et faire approuver les **templates de messages** dans WhatsApp Manager.
6. Configurer l'URL de webhook pour recevoir les accusés de livraison.

### ⚠️ Règle importante

Les messages **initiés par l'entreprise** (hors fenêtre de 24h depuis le dernier message du client) **doivent utiliser un template approuvé** par Meta. Les templates sont structurés avec des variables.

### 📄 Fonctionnalités

**3.1 — Création des templates WhatsApp**
Créer dans WhatsApp Manager :

| Nom template       | Langue | Contenu                                                                                     |
| ------------------ | ------ | ------------------------------------------------------------------------------------------- |
| `order_ready`      | fr     | `Bonjour {{1}}, votre commande {{2}} est prête chez {{3}}. Vous pouvez venir la récupérer.` |
| `out_for_delivery` | fr     | `Bonjour {{1}}, votre linge est en route. Livreur : {{2}} - {{3}}.`                         |
| `delivered`        | fr     | `Bonjour {{1}}, votre commande {{2}} a été livrée. Merci !`                                 |

**3.2 — Edge Function `send-whatsapp`**

```typescript
// Pseudo-code
async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  params: string[],
) {
  const response = await fetch(
    `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "fr" },
          components: [
            {
              type: "body",
              parameters: params.map((p) => ({ type: "text", text: p })),
            },
          ],
        },
      }),
    },
  );
  return response.ok;
}
```

**3.3 — Fallback intelligent**

- Si le client a un compte WhatsApp → envoyer WhatsApp (gratuit).
- Sinon → fallback SMS (payant).
- Logique à implémenter dans `process-notification-queue`.

**3.4 — Webhook de statut WhatsApp**

- Recevoir les accusés de livraison et de lecture.
- Mettre à jour `notifications.status` en conséquence.

### 📦 Livrables

- Edge Function `send-whatsapp`.
- Edge Function `whatsapp-webhook` (statuts).
- Templates créés dans WhatsApp Manager (documentation pour l'utilisateur).
- Variables d'environnement : `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`.

---

## 💰 MODULE 4 — SYSTÈME D'ABONNEMENT SaaS COMPLET

### 🎯 Objectif

C'est **MA** monétisation : je vends PressingPro aux pressings sous forme d'abonnement mensuel/annuel adapté au marché ivoirien. Cette phase implémente toute la logique de souscription, paiement, upgrade, downgrade, expiration et blocage.

### 📄 Plans et tarifs (rappel)

| Plan           | Prix mensuel                  | Prix annuel (-17%) | Cible                        |
| -------------- | ----------------------------- | ------------------ | ---------------------------- |
| **Free**       | 0 FCFA                        | 0 FCFA             | Petits pressings qui testent |
| **Pro**        | 10 000 FCFA                   | 100 000 FCFA       | Pressings établis            |
| **Business**   | 25 000 FCFA                   | 250 000 FCFA       | Chaînes multi-boutiques      |
| **Enterprise** | Sur devis (75 000+ FCFA/mois) | —                  | Grands groupes               |

### 🔧 Implémentation technique

**4.1 — Page `/billing` (Gérant)**

- **Plan actuel** : affiché avec badge (Free/Pro/Business), date d'expiration, barre de progression.
- **Utilisation ce mois** :
  - Commandes : 47 / ∞ (ou 30 max pour Free).
  - SMS envoyés : 128 / 500.
  - Utilisateurs : 2 / 5.
- **Bouton "Upgrade"** : affiche les plans supérieurs avec leurs bénéfices.
- **Bouton "Renouveler"** : pour les plans payants expirés.
- **Historique des paiements** : liste des abonnements passés.
- **Moyens de paiement** : Wave, Orange Money, MTN MoMo, Moov (via CinetPay).

**4.2 — Initiation de l'abonnement**
Quand le gérant choisit un plan payant :

1. **Edge Function** `initiate-subscription` :
   - Calcule le montant (mensuel ou annuel).
   - Génère un `transaction_id` unique : `SUB_{pressing_id}_{timestamp}`.
   - Appelle CinetPay pour créer un lien de paiement.
   - Crée une ligne dans `saas_subscriptions` avec `status = 'pending'`.
   - Stocke le `transaction_id` CinetPay dans `saas_subscriptions.transaction_id`.
2. **Frontend** : redirige vers le `payment_url` CinetPay.
3. **Après paiement** : redirection vers `/billing?status=success`.

**4.3 — Webhook de paiement d'abonnement**
Étendre l'Edge Function `cinetpay-webhook` pour gérer deux types de transactions :

- Si `transaction_id` commence par `PRESSING_` → paiement d'une commande client.
- Si `transaction_id` commence par `SUB_` → paiement d'un abonnement SaaS.

Pour les abonnements :

1. Vérifier le statut réel via l'API CinetPay.
2. Si `ACCEPTED` :
   - Mettre à jour `saas_subscriptions.status = 'active'`.
   - Définir `started_at = now()`, `expires_at = now() + 1 mois` (ou 1 an).
   - Mettre à jour `pressings.subscription_plan` et `subscription_expires_at`.
   - Débloquer immédiatement les fonctionnalités du plan.
   - Envoyer un SMS de confirmation au gérant.
3. Si `REFUSED` : `status = 'failed'`, ne rien changer.

**4.4 — Vérification automatique de l'abonnement**

- **Edge Function** `check-subscription-status` appelée à chaque connexion du gérant :
  1. Récupère `pressings.subscription_expires_at`.
  2. Si `expires_at < now()` et plan ≠ `free` :
     - Passer au plan `free` (downgrade automatique).
     - Mettre à jour `saas_subscriptions.status = 'expired'`.
     - Envoyer une notification SMS + email au gérant.
  3. Si `expires_at` dans moins de 7 jours :
     - Envoyer un rappel SMS.
- **Middleware Next.js** : si le plan est `free` et que le quota de 30 commandes/mois est dépassé, bloquer la création de nouvelles commandes avec un message "Passez au plan Pro pour continuer".

**4.5 — Gestion des quotas**
Créer une Edge Function `check-quota` qui vérifie :

- Nombre de commandes du mois en cours vs limite du plan.
- Nombre d'utilisateurs actifs vs limite.
- Nombre de SMS envoyés vs limite.

**4.6 — Upgrade / Downgrade**

- **Upgrade** (ex: Free → Pro) :
  - Calculer le prorata si changement en cours de mois.
  - Créer une nouvelle transaction CinetPay.
  - Une fois payé : `subscription_plan = 'pro'`, `expires_at` mis à jour.
- **Downgrade** (ex: Business → Pro) :
  - Effectif à la fin du cycle en cours.
  - Pas de remboursement (mentionné dans les CGU).

**4.7 — Offres promotionnelles**
Implémenter les mécanismes suivants :

- **Essai gratuit 30 jours** : à l'inscription, si `plan = 'pro'`, créer un abonnement `status = 'trial'` avec `expires_at = now() + 30 days`. Aucun paiement requis.
- **Early adopter -30% à vie** : créer un code promo `EARLY100` appliqué automatiquement aux 100 premiers pressings. Stocker `discount_percent = 30` dans `saas_subscriptions`.
- **Parrainage** : table `referrals` avec `referrer_pressing_id`, `referred_pressing_id`, `reward_months`. Quand un parrainage aboutit, créditer 1 mois gratuit au parrain.
- **Paiement à la journée** : option `daily_plan` à 500 FCFA/jour, activable via Wave/OM uniquement. Créer un abonnement avec `expires_at = now() + 1 day`.

**4.8 — Page `/billing/history`**

- Liste complète des abonnements passés.
- Téléchargement des factures PDF (générées par Edge Function `generate-invoice`).

**4.9 — Blocage des fonctionnalités**
Quand l'abonnement expire :

- **Plan Free** (par défaut) : 30 commandes/mois, 1 utilisateur, pas de SMS auto.
- **Blocage au-delà** : bannière d'avertissement + redirection vers `/billing`.
- **Grâce** : 3 jours de tolérance après expiration avant blocage total.

### 📦 Livrables

- Page `/billing` complète.
- Page `/billing/history`.
- Edge Functions : `initiate-subscription`, `check-subscription-status`, `check-quota`, `apply-discount`, `generate-invoice`.
- Migration SQL `009_saas_subscription_fields.sql` (ajout `discount_percent`, `daily_plan`, `trial_ends_at`, `referral_code`).
- Migration SQL `010_referrals.sql`.
- Middleware mis à jour pour le contrôle des quotas.
- Composants : `PlanCard`, `UsageMeter`, `BillingHistory`, `UpgradeModal`.

---

## 🎁 MODULE 5 — PACKS CLIENTS (vendu PAR les pressings À leurs clients)

### 🎯 Objectif

Permettre aux pressings de vendre des **packs prépayés** à leurs clients (ex : "20 chemises/mois à 8000 FCFA"). C'est un levier de fidélisation et de trésorerie.

### 📄 Fonctionnalités

**5.1 — Création d'un pack (Gérant)**
Page `/packs/new` :

- Nom du pack (ex : "Pack Famille 20 pièces").
- Articles inclus (multi-sélection depuis le catalogue).
- Quantité totale (ex : 20).
- Prix du pack (ex : 8000 FCFA).
- Durée de validité (ex : 30 jours).
- Remise affichée (ex : "-20% vs prix unitaire").

**5.2 — Achat d'un pack par un client**

- Le gérant crée le pack pour le client depuis la fiche client.
- Paiement via CinetPay ou espèces.
- Création d'une ligne `customer_packs` avec `status = 'active'`.

**5.3 — Utilisation automatique**

- À la création d'une commande, si le client a un pack actif :
  - Badge "Pack disponible : 12/20".
  - Proposer automatiquement de déduire les articles éligibles.
  - Le montant du pack est déduit du total.
  - `used_quantity` incrémenté.

**5.4 — Expiration**

- Cron job quotidien qui passe les packs expirés à `status = 'expired'`.
- Notification SMS au client.

### 📦 Livrables

- Page `/packs` (liste + création).
- Composant `PackSelector` dans la caisse.
- Edge Function `deduct-pack-item`.
- Migration SQL `011_customer_packs_fields.sql`.

---

## 🔒 MODULE 6 — SÉCURITÉ & FIABILITÉ

### 🎯 Objectif

Garantir que les paiements et les notifications sont **fiables et sécurisés**.

### 📄 Règles à implémenter

**6.1 — Vérification HMAC CinetPay**
Toujours vérifier le token `x-token` dans le header de la requête webhook avant de traiter.Utiliser `Cinetpay.verifyHMACToken(token, secret, body)` du SDK Node.js.

**6.2 — Vérification du statut réel**
Ne **jamais** faire confiance au statut envoyé par le webhook. Toujours appeler l'API `GET /v2/payment/check` pour obtenir le vrai statut.

**6.3 — Idempotence**
Avant de traiter un webhook, vérifier si `transaction_id` existe déjà dans `payments` avec `status = 'success'`. Si oui, ne rien faire.

**6.4 — Retry exponentiel**
Pour les SMS/WhatsApp échoués, implémenter un retry avec backoff exponentiel (3 tentatives max).

**6.5 — Logs**
Créer une table `webhook_logs` pour tracer toutes les requêtes webhook reçues (payload, headers, statut, réponse).

**6.6 — Rate limiting**
Limiter les appels API CinetPay (max 10/sec) et Orange SMS (selon le pack acheté).

### 📦 Livrables

- Migration SQL `012_webhook_logs.sql`.
- Utilitaire `verifyCinetPayHMAC()` dans `lib/payments/cinetpay.ts`.
- Utilitaire `withRetry()` dans `lib/utils/retry.ts`.
- Rate limiter dans les Edge Functions.

---

## 🧪 MODULE 7 — TESTS & VALIDATION

### Tests à implémenter

- `cinetpay-webhook.test.ts` : vérifier HMAC, idempotence, mise à jour DB.
- `send-sms.test.ts` : mock Orange API, vérifier format.
- `subscription.test.ts` : vérifier upgrade, downgrade, expiration, quotas.
- `pack-deduction.test.ts` : vérifier déduction automatique.

### Environnement de test

- Utiliser le **sandbox CinetPay** pour les tests (mode test disponible dans le backoffice).
- Utiliser un numéro Orange de test pour les SMS.
- Utiliser un numéro WhatsApp de test.

---

## 📅 PLAN DE DÉVELOPPEMENT (DANS CET ORDRE)

**Étape 1 — Intégration CinetPay (paiements commandes)** — 2 jours ⭐ CRITIQUE
**Étape 2 — Webhook CinetPay + vérification HMAC** — 1 jour ⭐ CRITIQUE
**Étape 3 — Notifications SMS Orange** — 1.5 jours
**Étape 4 — Notifications WhatsApp** — 1.5 jours
**Étape 5 — Abonnement SaaS (initiation + webhook)** — 2 jours ⭐ CRITIQUE
**Étape 6 — Quotas, upgrade/downgrade, blocage** — 1.5 jours
**Étape 7 — Packs clients** — 1 jour
**Étape 8 — Sécurité, logs, retry** — 1 jour
**Étape 9 — Tests & polish** — 1.5 jours

**Total estimé : ~13 jours de développement assisté par IA.**

---

## ✅ CRITÈRES DE VALIDATION DE LA PHASE 4

Avant de passer à la Phase 5 (interface livreur, PWA, polish), vérifie :

- [ ] Un client peut payer une commande via Wave/OM/MTN/Moov depuis l'app.
- [ ] Le webhook CinetPay reçoit bien la notification et met à jour le statut.
- [ ] La vérification HMAC fonctionne et bloque les requêtes frauduleuses.
- [ ] Un SMS est envoyé au client quand la commande est prête.
- [ ] Un message WhatsApp est envoyé si le client a WhatsApp.
- [ ] Un gérant peut souscrire au plan Pro et payer via Mobile Money.
- [ ] L'abonnement expire automatiquement après 30 jours (test avec date simulée).
- [ ] Le plan Free est limité à 30 commandes/mois.
- [ ] Un pack client est déduit automatiquement à la commande.
- [ ] Les factures PDF sont générées et téléchargeables.
- [ ] Les logs webhook sont bien enregistrés.
- [ ] Aucune donnée sensible n'est exposée côté client.

**Une fois ces critères validés, attends mon feu vert avant de passer à la Phase 5 (interface livreur complète, PWA offline, optimisation performance, déploiement production).**

---

## 🚀 INSTRUCTION DE DÉMARRAGE

**Commence par l'Étape 1 (Intégration CinetPay — paiements commandes).**

Génère :

1. L'Edge Function `initiate-cinetpay-payment` complète.
2. Le composant `PaymentButton` avec choix de méthode.
3. La migration SQL `007_payment_fields.sql`.
4. Le fichier `lib/payments/cinetpay.ts` avec les utilitaires.
5. La documentation des variables d'environnement à ajouter.

Indique-moi comment tester avec le sandbox CinetPay (URL à visiter, numéro de test, commande à lancer).

**Ne saute aucune étape. Attends ma validation avant l'Étape 2 (Webhook CinetPay).**

---

## 📎 ANNEXE — VARIABLES D'ENVIRONNEMENT COMPLÈTES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# CinetPay
CINETPAY_API_KEY=
CINETPAY_SITE_ID=
CINETPAY_SECRET_KEY=
CINETPAY_NOTIFY_URL=https://votre-domaine.com/api/webhooks/cinetpay
CINETPAY_RETURN_URL=https://votre-domaine.com/orders

# Orange SMS API
ORANGE_CLIENT_ID=
ORANGE_CLIENT_SECRET=
ORANGE_SENDER_NAME=PressingPro
ORANGE_SENDER_ADDRESS=tel:+2250000

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Application
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NEXT_PUBLIC_APP_NAME=PressingPro
```

---

## 📎 ANNEXE — STRUCTURE DES DOSSIERS PHASE 4

```
├── app/
│   ├── (owner)/
│   │   ├── billing/
│   │   │   ├── page.tsx
│   │   │   └── history/page.tsx
│   │   ├── packs/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   └── settings/
│   │       └── notifications/page.tsx
│   └── api/
│       └── webhooks/
│           ├── cinetpay/route.ts
│           └── whatsapp/route.ts
├── supabase/
│   └── functions/
│       ├── initiate-cinetpay-payment/
│       ├── cinetpay-webhook/
│       ├── check-cinetpay-transaction/
│       ├── send-sms/
│       ├── send-whatsapp/
│       ├── process-notification-queue/
│       ├── initiate-subscription/
│       ├── check-subscription-status/
│       ├── check-quota/
│       ├── deduct-pack-item/
│       └── generate-invoice/
├── lib/
│   ├── payments/
│   │   ├── cinetpay.ts
│   │   └── types.ts
│   ├── notifications/
│   │   ├── sms.ts
│   │   ├── whatsapp.ts
│   │   └── templates.ts
│   ├── subscriptions/
│   │   ├── plans.ts
│   │   └── quotas.ts
│   └── utils/
│       └── retry.ts
└── components/
    ├── billing/
    │   ├── PlanCard.tsx
    │   ├── UsageMeter.tsx
    │   └── UpgradeModal.tsx
    ├── payments/
    │   ├── PaymentButton.tsx
    │   └── PaymentStatus.tsx
    └── packs/
        └── PackSelector.tsx
```

---

# 📌 PROMPT PHASE 5 — Interface Livreur, PWA Offline, Performance & Déploiement Production

> ⚠️ À envoyer **uniquement après validation complète de la Phase 4**. Copie-colle tel quel dans ton agent IA.

---

## 🎯 PROMPT PHASE 5 — Finalisation & Mise en Production

### 🧭 Contexte

Les Phases 1, 2, 3 et 4 sont validées. Nous avons maintenant :

- Le projet Next.js 14 + Supabase entièrement fonctionnel.
- L'authentification, l'onboarding, les layouts par rôle.
- Le CRUD complet (clients, catalogue, commandes, workflow).
- Les paiements CinetPay (Wave, OM, MTN, Moov) fonctionnels.
- Les notifications SMS (Orange API) et WhatsApp (Cloud API).
- Le système d'abonnement SaaS complet (Free, Pro, Business, Enterprise).
- Les packs clients.

**Objectif de la Phase 5** : transformer PressingPro en un **produit fini, performant et déployé en production**. Cette phase couvre :

1. L'**interface livreur complète** (PWA terrain).
2. Le **mode hors-ligne** (indispensable à Abidjan où le réseau est instable).
3. L'**optimisation performance** (3G, mobile bas de gamme).
4. Le **déploiement production** (Vercel + Supabase + monitoring).
5. La **sécurité finale** et la **conformité** (CGU, RGPD-like, mentions légales CI).

C'est la phase qui rend PressingPro **réellement utilisable au quotidien sur le terrain ivoirien**.

---

## 🚚 MODULE 1 — INTERFACE LIVREUR COMPLÈTE (PWA TERRAIN)

### 🎯 Objectif

Le livreur travaille **dehors, en plein soleil, souvent avec les mains occupées**. Son interface doit être :

- **Lisible** (contrastes forts, gros caractères).
- **Utilisable à une main** (boutons XXL en bas d'écran).
- **Rapide** (actions en 1 tap).
- **Fonctionnelle hors-ligne**.

### 📄 Pages & fonctionnalités

**1.1 — Page d'accueil livreur** (`/driver/tours`)

Affichage par défaut : **la tournée du jour**.

**En-tête sticky :**

- Date du jour + nom du livreur.
- Compteur : "7 à faire · 3 terminées".
- Bouton "Actualiser" (pull-to-refresh natif).

**Section "Prochain arrêt"** (mise en avant) :

- Grande card avec fond coloré (orange vif).
- Nom du client + numéro de commande.
- Type d'action : **COLLECTE** (fond bleu) ou **LIVRAISON** (fond vert).
- Adresse complète + bouton "Ouvrir dans Google Maps" (deep link).
- Téléphone avec **bouton d'appel direct** (tel:+225...).
- Bouton WhatsApp direct (wa.me/225...).
- **3 gros boutons d'action** en bas :
  - 📞 APPELER
  - 🗺️ ITINÉRAIRE
  - ✅ TERMINÉ (avec confirmation + photo preuve obligatoire)

**Section "Arrêts suivants"** (liste scrollable) :

- Cards compactes avec : numéro, client, type, adresse, distance estimée.
- Bouton "Réorganiser" (drag-and-drop pour optimiser la tournée).
- Bouton "Marquer comme échec" (si client absent → motif obligatoire).

**Section "Terminés aujourd'hui"** :

- Liste repliable des arrêts complétés.
- Photo preuve visible en miniature.

**1.2 — Détail d'un arrêt** (`/driver/tours/[id]`)

- Toutes les infos client.
- Liste des articles à collecter/livrer (avec photos "avant").
- Bouton **"Scanner un QR code"** (si le colis a un QR).
- **Signature client** (canvas tactile) pour les livraisons.
- **Photo preuve obligatoire** : photo du colis remis OU photo de la porte fermée (client absent).
- Bouton "Valider l'étape" → déclenche la transition de statut côté backend.
- Option : "Laisser un mot dans la boîte aux lettres".

**1.3 — Preuve de livraison**

- Photo obligatoire (compressée automatiquement à 800 Ko max).
- Signature tactile optionnelle.
- Géolocalisation GPS capturée automatiquement (avec permission).
- Notes libres.
- Timestamp automatique.

**1.4 — Gestion des échecs**
Si le client est absent :

- Modal obligatoire : motif (client absent, adresse introuvable, refus, autre).
- Photo de la porte (optionnel).
- Statut → `delivery_failed`.
- Notification automatique au gérant.
- **Replanification** : proposer un nouveau créneau.

**1.5 — Historique et statistiques livreur**
Page `/driver/history` :

- Nombre de livraisons du jour / semaine / mois.
- Taux de réussite.
- Distance parcourue (si GPS activé).
- Gains (si commission par livraison).

**1.6 — Paramètres livreur** (`/driver/settings`)

- Statut : disponible / en pause / hors service.
- Zone d'intervention préférée.
- Notifications push.
- Mode économie de batterie.

### 🧩 RLS pour les livreurs

Un livreur ne voit QUE :

- Les commandes qui lui sont assignées (`deliveries.driver_id = auth.uid()`).
- Les infos client minimales (nom, téléphone, adresse).
- PAS les prix, PAS les données financières.

### 📦 Livrables

- Pages `/driver/tours`, `/driver/tours/[id]`, `/driver/history`, `/driver/settings`.
- Composants `TourCard`, `StopCard`, `ProofOfDelivery`, `SignaturePad`, `FailureModal`.
- Hooks `useDriverTours`, `useUpdateStopStatus`.
- Migration SQL `013_delivery_proofs.sql` (ajout `signature_url`, `gps_coordinates`, `failure_reason`).

---

## 📡 MODULE 2 — MODE HORS-LIGNE (PWA OFFLINE-FIRST)

### 🎯 Objectif

À Abidjan, la connexion est **instable** (3G, coupures fréquentes, zones blanches). L'application DOIT continuer à fonctionner :

- En caisse (créer des commandes).
- En livraison (marquer des arrêts).
- En consultation (voir les tournées du jour).

### 📄 Implémentation technique

**2.1 — Service Worker & Cache**
Utiliser **`next-pwa`** ou **Serwist** (plus moderne) pour :

- **Précacher** les assets statiques (JS, CSS, images, polices).
- **Stratégie de cache** :
  - `Cache First` pour les assets statiques.
  - `Network First` pour les pages dynamiques.
  - `Stale While Revalidate` pour les données peu changeantes (catalogue, clients).
- **Cache persistant** dans IndexedDB pour les données critiques.

**2.2 — Détection de connectivité**

- Hook `useOnlineStatus()` (écoute `navigator.onLine` + événements `online`/`offline`).
- Bandeau discret en haut de l'écran : "🔴 Mode hors-ligne — synchronisation en attente (3)".
- Toast automatique au retour en ligne : "✅ 3 éléments synchronisés".

**2.3 — File d'attente locale (IndexedDB)**
Utiliser **Dexie.js** ou **idb** pour stocker :

- Les commandes créées hors-ligne.
- Les changements de statut effectués hors-ligne.
- Les photos prises hors-ligne (stockées en base64 temporairement).
- Les preuves de livraison.

**Structure de la queue :**

```typescript
interface QueuedAction {
  id: string;
  type: "create_order" | "update_status" | "upload_photo" | "delivery_proof";
  payload: any;
  createdAt: number;
  retries: number;
  status: "pending" | "syncing" | "failed";
}
```

**2.4 — Synchronisation automatique**

- **Background Sync API** (supporté sur Chrome Android, majoritaire en CI).
- Fallback : re-sync à chaque retour online.
- **Résolution de conflits** :
  - Last-write-wins pour les mises à jour de statut.
  - Merge intelligent pour les créations (pas de conflit car UUID unique généré côté client).
- **Génération locale des IDs** : utiliser `crypto.randomUUID()` pour permettre la création hors-ligne.

**2.5 — Indicateur visuel par action**

- Sur chaque commande en attente : badge "⏳ En attente de sync".
- Sur chaque arrêt validé hors-ligne : badge "✅ Validé (sync en cours)".

**2.6 — Gestion des erreurs de sync**

- Si une action échoue 3 fois → la marquer comme `failed`.
- Afficher dans une page `/sync-errors` pour résolution manuelle.

**2.7 — Optimistic UI**

- Toutes les actions s'affichent **instantanément** dans l'UI.
- La persistance réelle se fait en arrière-plan.
- Si échec → rollback visuel + notification.

### 📦 Livrables

- Configuration `next-pwa` ou Serwist dans `next.config.js`.
- `manifest.json` complet (icônes, thème, display: standalone).
- Fichier `public/sw.js` customisé.
- Hook `useOnlineStatus`.
- Service `lib/offline/queue.ts` (Dexie.js).
- Service `lib/offline/sync.ts` (synchronisation).
- Composant `OfflineBanner`.
- Page `/sync-errors`.
- **Iconset complet** : 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512.

---

## ⚡ MODULE 3 — OPTIMISATION PERFORMANCE

### 🎯 Objectif

L'application doit être **ultra-rapide** sur :

- Téléphones Android d'entrée de gamme (Tecno, Infinix, itel).
- Connexion 3G.
- Batterie limitée.

### 📄 Optimisations à implémenter

**3.1 — Bundle & Code Splitting**

- **Analyse du bundle** : `@next/bundle-analyzer`.
- **Dynamic imports** pour les composants lourds (Recharts, SignaturePad, Kanban).
- **Tree shaking** activé.
- **Objectif** : First Load JS < 150 Ko gzippé.

**3.2 — Images**

- Utiliser **`next/image`** partout.
- Format **AVIF/WebP** automatique.
- **Compression client-side** avant upload (browser-image-compression).
- **Lazy loading** systématique.
- **Placeholder blur** pour les photos.
- **CDN Supabase Storage** avec transformations à la volée.

**3.3 — Polices**

- Utiliser **`next/font`** avec `display: swap`.
- Sous-ensembles **latin** uniquement.
- Polices locales (pas Google Fonts CDN).
- Objectif : < 50 Ko par police.

**3.4 — Base de données Supabase**

- **Index** sur toutes les colonnes filtrées/triées fréquemment :
  - `orders(pressing_id, status)`
  - `orders(pressing_id, created_at DESC)`
  - `clients(pressing_id, phone)`
  - `order_items(order_id)`
  - `notifications(status, created_at)`
- **Vues matérialisées** pour le dashboard (KPIs précalculés, rafraîchis toutes les 5 min).
- **Connection pooling** (PgBouncer via Supabase).
- **Pagination cursor-based** (pas d'OFFSET).
- **Requêtes sélectives** : ne jamais faire `SELECT *`.

**3.5 — React & Next.js**

- **Server Components** par défaut.
- **Client Components** uniquement quand nécessaire.
- **Streaming SSR** avec Suspense.
- **React.memo** sur les composants de liste.
- **useMemo / useCallback** judicieusement (pas partout).
- **Virtualisation** des longues listes (TanStack Virtual).
- **React Query** avec :
  - `staleTime: 5 * 60 * 1000` (5 min).
  - `cacheTime: 30 * 60 * 1000` (30 min).
  - `refetchOnWindowFocus: false`.

**3.6 — Cache & Edge**

- **Vercel Edge Config** pour les feature flags.
- **Vercel KV** (Redis) pour les sessions et caches fréquents.
- **ISR** (Incremental Static Regeneration) pour les pages publiques.
- **Headers de cache** optimisés :
  - Assets : `Cache-Control: public, max-age=31536000, immutable`.
  - API : `Cache-Control: private, no-cache`.

**3.7 — PWA & Chargement initial**

- **App Shell** pré-caché (header, nav, layout).
- **Skeleton screens** partout.
- **Preconnect** aux domaines critiques (Supabase, CinetPay).
- **DNS prefetch** pour WhatsApp, Google Maps.

**3.8 — Mesures**

- **Web Vitals** tracking via `useReportWebVitals`.
- **Objectifs** :
  - LCP < 2.5s sur 3G.
  - FID < 100ms.
  - CLS < 0.1.
  - TTI < 3.5s.
- **Lighthouse score** > 90 sur mobile.

### 📦 Livrables

- Rapport d'analyse bundle.
- Toutes les optimisations appliquées et documentées.
- Fichier `lib/performance/vitals.ts`.
- Rapport Lighthouse avant/après.

---

## 🔒 MODULE 4 — SÉCURITÉ FINALE

### 🎯 Objectif

Sécuriser l'application avant la mise en production.

**4.1 — Audit RLS complet**

- Vérifier que **chaque table** a des policies RLS correctes.
- Test manuel : un utilisateur A ne peut PAS voir les données de l'utilisateur B.
- Utiliser `supabase db lint` et les tests automatisés.

**4.2 — Validation côté serveur**

- TOUTE donnée entrante est validée avec **Zod** côté serveur (Edge Functions).
- Jamais faire confiance au client.

**4.3 — Rate limiting**

- Sur les Edge Functions sensibles : `initiate-cinetpay-payment`, `send-sms`, `create-order`.
- Utiliser **Upstash Redis** ou **Vercel KV** pour le compteur.
- Limites :
  - 10 commandes/minute/utilisateur.
  - 20 SMS/minute/pressing.
  - 5 tentatives de paiement/10 minutes.

**4.4 — Headers de sécurité**
Dans `next.config.js` :

```js
headers: [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; img-src 'self' data: https://*.supabase.co; script-src 'self' 'unsafe-inline' https://checkout.cinetpay.com; connect-src 'self' https://*.supabase.co https://api-checkout.cinetpay.com https://api.orange.com https://graph.facebook.com;",
  },
];
```

**4.5 — Audit des secrets**

- AUCUN secret dans le code source.
- `.env.local` dans `.gitignore`.
- Rotation des clés API tous les 6 mois.
- Utiliser les **Vercel Environment Variables** (chiffrées).

**4.6 — Logs & audit**

- Table `audit_logs` pour tracer : connexions, changements de statut, paiements, suppressions.
- Rétention : 2 ans.
- Accès restreint au propriétaire du pressing.

**4.7 — Sauvegardes**

- **Sauvegardes automatiques Supabase** quotidiennes (plan Pro).
- **Export manuel** mensuel vers Google Drive (CSV).
- **Documentation** de restauration.

### 📦 Livrables

- Migration SQL `014_audit_logs.sql`.
- Policies RLS auditées.
- Configuration sécurité Next.js.
- Documentation de sécurité (`SECURITY.md`).
- Plan de sauvegarde documenté.

---

## 📜 MODULE 5 — CONFORMITÉ & LÉGAL (CÔTE D'IVOIRE)

### 🎯 Objectif

Se conformer à la législation ivoirienne et rassurer les utilisateurs.

**5.1 — Pages légales**

- `/legal/cgu` — Conditions Générales d'Utilisation.
- `/legal/cgv` — Conditions Générales de Vente (pour l'abonnement SaaS).
- `/legal/privacy` — Politique de confidentialité (conforme à la loi ivoirienne n°2013-450 sur la protection des données personnelles).
- `/legal/mentions` — Mentions légales (éditeur, hébergeur, contact).
- `/legal/cookies` — Politique cookies.

**5.2 — Bandeau cookies**

- Bandeau de consentement conforme (opt-in pour les cookies non essentiels).
- Possibilité de refuser.
- Lien vers la politique cookies.

**5.3 — Droit à l'oubli**

- Fonction "Supprimer mon compte" (soft delete + purge après 30 jours).
- Export des données utilisateur (RGPD-like) au format JSON.

**5.4 — Facturation conforme**

- Factures avec mentions obligatoires ivoiriennes :
  - Nom et adresse du vendeur (mon entreprise).
  - Numéro RCCM.
  - Numéro CC (Compte Contribuable).
  - Numéro de facture unique.
  - Détail HT/TVA (si applicable).
  - TVA ivoirienne : **18%** si je suis assujetti.

**5.5 — Mentions de paiement**

- "Paiement sécurisé via CinetPay".
- Logos Wave, Orange Money, MTN, Moov.

### 📦 Livrables

- Toutes les pages légales rédigées (adapter selon la loi ivoirienne — consultation d'un juriste recommandée).
- Bandeau cookies.
- Fonction export de données.
- Template de facture conforme.

---

## 🚀 MODULE 6 — DÉPLOIEMENT PRODUCTION

### 🎯 Objectif

Déployer PressingPro en production sur Vercel + Supabase, avec monitoring et CI/CD.

**6.1 — Configuration Vercel**

- Projet Vercel lié au repo GitHub.
- **3 environnements** :
  - `development` (local).
  - `preview` (branches).
  - `production` (main).
- **Variables d'environnement** configurées par environnement.
- **Domaines** :
  - `app.pressingpro.ci` (production).
  - `staging.pressingpro.ci` (staging).
- **HTTPS** automatique.
- **Analytics Vercel** activé.
- **Speed Insights** activé.

**6.2 — Configuration Supabase Production**

- Projet Supabase dédié production (séparé du dev).
- Migrations appliquées via **Supabase CLI** (`supabase db push`).
- **Backups quotidiens** activés (plan Pro).
- **Point-in-time recovery** activé si budget le permet.
- **Connection pooling** en mode Transaction.
- **Edge Functions déployées** avec `supabase functions deploy`.
- **Custom domain** pour l'API Supabase (optionnel).

**6.3 — CI/CD GitHub Actions**
Créer `.github/workflows/` :

- **`ci.yml`** : lint + tests + type-check à chaque PR.
- **`preview.yml`** : déploiement Vercel Preview sur chaque PR.
- **`production.yml`** : déploiement automatique sur push main (après tests verts).
- **`supabase-migrations.yml`** : applique les migrations sur merge main.

**6.4 — Monitoring & Alerting**

- **Sentry** pour les erreurs frontend et backend.
- **Vercel Analytics** pour les Web Vitals.
- **Supabase Logs** pour les requêtes DB.
- **Alertes** :
  - Slack/Email si erreur > 10/min.
  - SMS au fondateur si downtime > 5 min.
  - Notification si webhook CinetPay échoue.

**6.5 — Onboarding des premiers utilisateurs**

- Page `/onboarding-demo` avec vidéo explicative (Loom).
- **Seed de démonstration** : un pressing "demo" pré-rempli avec des données fictives.
- **Compte démo** : `demo@pressingpro.ci` / `demo1234` pour permettre aux prospects de tester.
- **FAQ** intégrée (`/help`).
- **Chat support** : Crisp ou WhatsApp Business intégré.

**6.6 — Documentation utilisateur**

- Guide de démarrage rapide (PDF 4 pages).
- Vidéos tutoriels courtes (2-3 min) :
  - "Créer ma première commande".
  - "Gérer mes clients".
  - "Envoyer un SMS à un client".
  - "Utiliser l'app en mode hors-ligne".
- Base de connaissances en ligne (`/help`).

**6.7 — Plan de lancement**

- **Soft launch** : 5 pressings pilotes (Cocody, Marcory, Treichville).
- **Feedback intensif** pendant 2 semaines.
- **Corrections rapides** avant l'ouverture publique.
- **Launch officiel** sur les réseaux sociaux + presse tech ivoirienne.

### 📦 Livrables

- Configuration Vercel complète.
- Configuration Supabase production.
- Workflows GitHub Actions.
- Sentry configuré.
- Page `/help` avec FAQ.
- Vidéos tutoriels (scripts fournis).
- Documentation utilisateur.

---

## 📊 MODULE 7 — ANALYTICS & BUSINESS INTELLIGENCE

### 🎯 Objectif

Suivre les métriques clés pour piloter le business.

**7.1 — Analytics produit**

- **Umami** (open-source, RGPD-friendly) ou **Plausible** (payant).
- Événements trackés :
  - Inscription gérant.
  - Création première commande.
  - Premier paiement Mobile Money.
  - Upgrade vers Pro.
  - Abandon d'onboarding.

**7.2 — Dashboard interne (pour moi, fondateur)**
Page admin `/admin` (accessible uniquement à mon email) :

- Nombre total de pressings inscrits.
- MRR (Monthly Recurring Revenue).
- Churn rate.
- Taux de conversion Free → Pro.
- Top pressings par usage.
- Répartition géographique (communes).
- Alertes : pressings inactifs > 7 jours.

**7.3 — Rapports mensuels automatiques**

- Email automatique le 1er du mois avec :
  - MRR, croissance, churn.
  - Nombre de nouvelles inscriptions.
  - Revenus CinetPay.
  - Top 5 pressings par CA.

### 📦 Livrables

- Umami/Plausible installé.
- Page `/admin` avec KPIs.
- Edge Function `generate-monthly-report`.
- Configuration email automatique (Resend ou Postmark).

---

## 🧪 MODULE 8 — TESTS FINAUX & RECETTE

### 🎯 Objectif

Valider que TOUT fonctionne avant le lancement public.

**8.1 — Tests end-to-end (Playwright)**
Scénarios critiques :

1. Un gérant s'inscrit, complète l'onboarding, choisit le plan Pro (essai).
2. Il crée un client, crée une commande avec photo.
3. Le client paie par Wave.
4. Le webhook CinetPay met à jour la commande.
5. Le SMS est envoyé au client.
6. La commande passe à "prête", le client est notifié.
7. Le livreur valide la livraison hors-ligne, puis synchronise.
8. Le dashboard affiche le CA mis à jour.

**8.2 — Tests de charge**

- **k6** ou **Artillery** : simuler 100 pressings simultanés.
- Vérifier que Supabase tient la charge.
- Vérifier que les Edge Functions répondent < 500ms.

**8.3 — Tests sur appareils réels**

- Tester sur :
  - Tecno Spark (Android 11, entrée de gamme).
  - Infinix Hot (Android 12).
  - iPhone SE (iOS 15).
  - Chrome mobile, Safari mobile.
- Tester sur réseau :
  - 3G bridée (via Charles Proxy ou Chrome DevTools).
  - Mode hors-ligne total.

**8.4 — Recette utilisateur (UAT)**

- Faire tester par 3 pressings pilotes pendant 5 jours.
- Recueillir les retours via Google Form.
- Corriger les bugs critiques.
- Prioriser les améliorations V1.1.

### 📦 Livrables

- Suite de tests Playwright complète.
- Rapport de tests de charge.
- Rapport de tests appareils.
- Rapport UAT.

---

## 📅 PLAN DE DÉVELOPPEMENT (DANS CET ORDRE)

**Étape 1 — Interface livreur complète** — 3 jours ⭐ CRITIQUE
**Étape 2 — Mode hors-ligne (PWA offline-first)** — 2 jours ⭐ CRITIQUE
**Étape 3 — Optimisation performance** — 2 jours
**Étape 4 — Sécurité finale** — 1.5 jours
**Étape 5 — Conformité & pages légales** — 1 jour
**Étape 6 — Déploiement production Vercel + Supabase** — 2 jours ⭐ CRITIQUE
**Étape 7 — Analytics & dashboard admin** — 1.5 jours
**Étape 8 — Tests finaux & recette** — 2 jours

**Total estimé : ~15 jours de développement assisté par IA.**

---

## ✅ CRITÈRES DE VALIDATION DE LA PHASE 5 (Lancement)

**L'application est prête pour la production SI et SEULEMENT SI :**

- [ ] Un livreur peut voir sa tournée, appeler un client, valider une livraison avec photo + GPS.
- [ ] L'app fonctionne en mode avion (création commande, consultation).
- [ ] La synchronisation automatique se fait dès le retour en ligne.
- [ ] Aucun conflit de données lors de la synchronisation.
- [ ] Lighthouse mobile > 90.
- [ ] First Load JS < 150 Ko gzippé.
- [ ] LCP < 2.5s sur 3G.
- [ ] Toutes les pages légales sont en ligne.
- [ ] Le bandeau cookies fonctionne.
- [ ] Aucune vulnérabilité RLS (test manuel validé).
- [ ] Les Edge Functions sont rate-limitées.
- [ ] Sentry capture bien les erreurs.
- [ ] Le CI/CD déploie automatiquement sur push main.
- [ ] Les sauvegardes Supabase sont actives.
- [ ] La page `/admin` affiche les KPIs réels.
- [ ] 3 pressings pilotes ont testé sans bug bloquant.
- [ ] Le compte démo fonctionne.
- [ ] Les vidéos tutorielles sont prêtes.
- [ ] La documentation utilisateur est accessible.

**Une fois ces critères validés, PressingPro est PRÊT POUR LE LANCEMENT PUBLIC. 🚀**

---

## 🚀 INSTRUCTION DE DÉMARRAGE

**Commence par l'Étape 1 (Interface livreur complète).**

Génère :

1. Les pages `/driver/tours`, `/driver/tours/[id]`, `/driver/history`, `/driver/settings`.
2. Les composants `TourCard`, `StopCard`, `ProofOfDelivery`, `SignaturePad`, `FailureModal`.
3. Les hooks React Query.
4. Les policies RLS pour les livreurs.
5. La migration SQL `013_delivery_proofs.sql`.
6. La documentation GPS et permissions mobile.

Indique-moi comment tester (créer un livreur de test, assigner une commande, simuler une livraison).

**Ne saute aucune étape. Attends ma validation avant l'Étape 2 (PWA Offline).**

---

## 📎 ANNEXE A — STRUCTURE FINALE DU PROJET

```
pressingpro/
├── app/
│   ├── (auth)/
│   ├── (owner)/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── clients/
│   │   ├── catalogue/
│   │   ├── deliveries/
│   │   ├── billing/
│   │   ├── packs/
│   │   ├── settings/
│   │   └── admin/
│   ├── (driver)/
│   │   ├── tours/
│   │   ├── history/
│   │   └── settings/
│   ├── (client)/
│   │   ├── home/
│   │   ├── orders/
│   │   └── profile/
│   ├── legal/
│   │   ├── cgu/
│   │   ├── cgv/
│   │   ├── privacy/
│   │   ├── mentions/
│   │   └── cookies/
│   ├── help/
│   ├── sync-errors/
│   ├── api/
│   │   └── webhooks/
│   └── layout.tsx
├── supabase/
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   ├── 002_auth_trigger.sql
│   │   ├── 003_order_history.sql
│   │   ├── ...
│   │   └── 014_audit_logs.sql
│   └── functions/
│       ├── initiate-cinetpay-payment/
│       ├── cinetpay-webhook/
│       ├── send-sms/
│       ├── send-whatsapp/
│       ├── initiate-subscription/
│       └── ...
├── lib/
│   ├── supabase/
│   ├── payments/
│   ├── notifications/
│   ├── subscriptions/
│   ├── offline/
│   ├── performance/
│   ├── security/
│   └── utils/
├── components/
│   ├── ui/ (shadcn)
│   ├── billing/
│   ├── payments/
│   ├── driver/
│   ├── orders/
│   └── ...
├── public/
│   ├── icons/ (PWA)
│   ├── manifest.json
│   └── sw.js
├── tests/
│   └── e2e/
├── .github/
│   └── workflows/
├── SECURITY.md
├── README.md
└── next.config.js
```

---

## 📎 ANNEXE B — CHECKLIST DE LANCEMENT (J-7 avant launch public)

**Technique**

- [ ] Tous les tests Playwright passent.
- [ ] Aucune erreur Sentry depuis 48h.
- [ ] Backups Supabase vérifiés.
- [ ] Domaine + SSL configurés.
- [ ] Webhooks CinetPay testés en production.
- [ ] Numéros SMS/WhatsApp validés.

**Légal**

- [ ] CGU, CGV, Privacy en ligne.
- [ ] Mentions légales avec RCCM et CC.
- [ ] Bandeau cookies actif.
- [ ] Politique de remboursement claire.

**Support**

- [ ] FAQ en ligne.
- [ ] Vidéos tutorielles uploadées.
- [ ] WhatsApp Business configuré.
- [ ] Email support actif (`support@pressingpro.ci`).

**Marketing**

- [ ] Landing page `pressingpro.ci` en ligne.
- [ ] Compte Instagram, Facebook, TikTok créés.
- [ ] 5 premiers posts programmés.
- [ ] Liste des 50 pressings à contacter prête.
- [ ] Pitch deck investisseurs prêt (si levée de fonds).

**Business**

- [ ] Compte bancaire business ouvert.
- [ ] Enregistrement entreprise (RCCM) à jour.
- [ ] Comptabilité prête à recevoir les paiements CinetPay.
- [ ] Contrat SaaS type prêt.

---

## 📎 ANNEXE C — MÉTRIQUES DE SUCCÈS (6 premiers mois)

| Métrique                | Objectif M+1 | Objectif M+3 | Objectif M+6   |
| ----------------------- | ------------ | ------------ | -------------- |
| Pressings inscrits      | 20           | 80           | 200            |
| Pressings actifs        | 10           | 50           | 130            |
| Conversion Free → Pro   | 15%          | 25%          | 30%            |
| MRR                     | 100 000 FCFA | 500 000 FCFA | 1 500 000 FCFA |
| Commandes traitées/mois | 500          | 3 000        | 12 000         |
| NPS (satisfaction)      | 40           | 50           | 60             |
| Churn mensuel           | 10%          | 7%           | 5%             |

---

## 🎉 MOT DE FIN

Ce prompt Phase 5 clôture le **MVP complet de PressingPro**. Une fois cette phase term
