# SignUpIN — Modèle détaillé des écrans Connexion & Inscription

> Spécification de l'interface d'authentification de **PressingPro**, établie à partir
> du modèle fourni (écran scindé : panneau de marque à gauche, formulaire à droite).
>
> **Ce document est normatif.** Il décrit ce que les écrans `/login` et `/register`
> doivent être. L'implémentation réelle vit dans `app/(auth)/` et `components/auth/`.

---

## 1. Intention

Le modèle source est un écran d'authentification générique en deux colonnes. On en
reprend **la structure** — un panneau de marque qui occupe la moitié de l'écran et
porte le message, un formulaire calme sur l'autre moitié — mais on l'applique aux
contraintes réelles du projet.

Trois adaptations sont assumées et non négociables :

| Modèle source | PressingPro | Pourquoi |
|---|---|---|
| Couleurs `#5B75F6` / `#67E8F9` | `brand-700` `#0F766E` + `flag-500` `#F97316` | La charte est déjà définie dans `tailwind.config.ts` |
| Textes anglais | Français | Le produit est ivoirien ; les montants sont en FCFA |
| Boutons Google / Facebook / Apple | **Supprimés** | Voir § 7 — c'est une erreur fonctionnelle, pas un oubli |
| Bascule `onSwitchToSignUp` en état React | Routes `/login` ↔ `/register` | Voir § 7 — deux URLs, pas un booléen |
| Icônes `Mail` / `Lock` dans les champs | **Supprimées** | Voir § 7 — elles cassent l'accessibilité |

Ce qui est **conservé** : le panneau de marque avec formes décoratives, le logo
centré au-dessus du formulaire, le titre d'accueil, le lien de mot de passe oublié,
et le lien de bascule entre les deux écrans.

---

## 2. Anatomie de l'écran

```
┌──────────────────────────────────────────────────────────────┐
│  AuthLayout — min-h-dvh, fond slate-100                      │
│  ┌────────────────────────┬────────────────────────────────┐ │
│  │                        │                                │ │
│  │  PANNEAU DE MARQUE     │  COLONNE FORMULAIRE            │ │
│  │  (hidden lg:flex)      │  (w-full lg:w-1/2)            │ │
│  │                        │                                │ │
│  │  • logo + marque       │  • logo (mobile)               │ │
│  │  • promesse produit    │  • titre + sous-titre          │ │
│  │  • formes décoratives  │  • champs de saisie             │ │
│  │  • citation            │  • messages d'erreur           │ │
│  │                        │  • bouton plein largeur        │ │
│  │  hidden sous 1024px    │  • lien vers l'autre écran     │ │
│  └────────────────────────┴────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Règle de repli.** Sous `lg` (1024 px) le panneau disparaît entièrement. Le mobile
ne voit qu'un formulaire, centré, sans expense. C'est volontaire : sur un écran de
6 pouces, un panneau de marque vole la moitié de la surface utile pour une information
qu'on sait déjà.

---

## 3. Panneau de marque

Fond `bg-gradient-to-br from-brand-800 to-brand-900`, texte blanc, motifs en CSS pur
(aucun fichier image, donc net sur tous les écrans et zéro requête).

### Motifs décoratifs

| Position | Forme | Classes |
|---|---|---|
| Haut gauche | Grille de 15 points | `grid grid-cols-5 gap-2`, points `w-1.5 h-1.5 rounded-full opacity-60` |
| Haut gauche | 3 barres verticales | `w-4 h-16 / h-24 / h-12 rounded-full`, opacité 20/40/20 % |
| Haut droite | Cercle tronqué | `-top-10 right-12 w-32 h-32 border-[6px] rounded-full opacity-30` |
| Haut droite | Pastille accent | `top-20 right-24 w-4 h-4 rounded-full bg-flag-500` |
| Bas gauche | Grille de 12 points | `grid grid-cols-4 gap-2` |
| Bas gauche | Croix | `bottom-8 left-32 text-2xl font-light` |
| Bas droite | Grand cercle | `-bottom-24 -right-10 w-64 h-64 border-[10px] rounded-full` |
| Bas droite | Pastille orange | `bottom-16 right-16 w-24 h-24 rounded-full bg-flag-500` |

**Tous ces motifs portent `aria-hidden`** : ce sont des ornements, un lecteur
d'écran n'a rien à y lire.

### Contenu réel du panneau

Ce n'est pas « Adventure start here » mais l'argumentaire du produit :

```tsx
<div className="relative z-10 mt-32">
  <Logo />
  <h1 className="mt-8 text-4xl font-black leading-tight">
    Votre pressing,<br />en un coup d'œil
  </h1>
  <p className="mt-4 text-base text-brand-100/90">
    Commandes, tournées de livraison et encaissements — pilotés depuis votre téléphone.
  </p>
</div>
```

Le pied du panneau reprend les trois promesses de l'application (montants en FCFA,
notifications WhatsApp, usage terrain), en `text-xs text-brand-100/70`.

---

## 4. Écran Connexion (`/login`)

### Champs

| Champ | `name` | Type | Autocomplete | Placeholder |
|---|---|---|---|---|
| Email ou téléphone | `identifier` | `text` | `username` | `vous@pressing.ci ou 07 08 09 10 11` |
| Mot de passe | `password` | `password` | `current-password` | `••••••••` (bouton œil) |

Le libellé du premier champ dit **« Email ou téléphone »** et non « Email » :
Supabase accepte les deux dans le même champ, et un gérant ivoirien se connecte
rarement par email. C'est le point le plus important de cet écran.

### Structure du rendu

```
AuthHeader      « Connexion » / « Accédez à votre espace pressing »
InputField      Email ou téléphone
InputField      Mot de passe  (revealable)
AuthFooterLink  « Mot de passe oublié ? » → /forgot-password
--- séparateur ---
Bouton          « Se connecter » (disabled + « Veuillez patienter… »)
AuthFooterLink  « Pas encore de compte ? » « Créer un compte » → /register
```

---

## 5. Écran Inscription (`/register`)

### Champs, dans cet ordre

| # | Champ | `name` | Type | Particularité |
|---|---|---|---|---|
| 1 | Type de compte | `role` | `RolePicker` | **2 grandes cartes**, pas un `<select>` |
| 2 | Nom complet | `fullName` | `text` | 2–120 caractères |
| 3 | Téléphone | `phone` | `tel` | Préfixe `+225` ajouté automatiquement |
| 4 | Email | `email` | `email` | Normalisé en minuscules |
| 5 | Mot de passe | `password` | `password` | 8 car. min, 1 majuscule, 1 minuscule, 1 chiffre |
| 6 | Confirmation | `confirmPassword` | `password` | Comparé au champ 5 |

### Sélecteur de type de compte

C'est l'élément le plus distinctif de cet écran, et le plus structurant : le choix
conditionne tout le parcours qui suit (onboarding gérant ou onboarding client).

```
┌─────────────────────────────────────────┐
│ 🏪  Je gère un pressing            ✓    │  ← sélectionné
│     Gérez votre pressing : commandes…   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 🧺  Je suis client                      │
│     Confiez votre linge et suivez…      │
└─────────────────────────────────────────┘
```

- Cartes de 2 colonnes sur mobile, empilées en dessous
- États : `border-2 border-flag-500 bg-flag-50/50` (sélectionné) / `border-slate-200 bg-white` (repos)
- `role="radiogroup"` + `role="radio"` + `aria-checked` : navigation aux flèches
  conforme, alors qu'un simple empilement de `<button>` ne l'est pas
- Le `✓` de sélection est `aria-hidden` : l'information est déjà portée par `aria-checked`

---

## 6. Accessibilité — points non négociables

1. **Chaque erreur de champ est liée à son input** par `aria-describedby` +
   `aria-invalid`. Sans cela, un utilisateur de lecteur d'écran n'apprend jamais
   *pourquoi* la soumission échoue : le message existe visuellement, il est invisible
   pour lui.

2. **Les erreurs globales portent `role="alert"`**, les messages de succès
   `role="status"`. L'écran se parle au lieu de se contenter d'afficher du texte.

3. **Le bouton se verrouille pendant l'envoi** (`disabled` + libellé « Veuillez
   patienter… »). Un double-clic ne doit pas créer deux comptes.

4. **Libellés visibles, jamais placeholder seul.** Un placeholder disparaît à la
   saisie et n'est pas annoncé par tous les lecteurs d'écran.

5. **`prefers-reduced-motion`** coupe le flottement du panneau et les cascades
   d'apparition.

---

## 7. Trois écarts assumés par rapport au modèle source

### 7.1 Les boutons sociaux sont supprimés

Le modèle propose Google / Facebook / Apple. C'est **impossible ici**, pour trois
raisons :

- Supabase `signInWithOAuth` exige de déclarer les URL de redirection chez chaque
  fournisseur et d'enregistrer les clés OAuth correspondantes. Sans cette
  configuration, les boutons échouent au clic.
- Un compte Google n'a aucun numéro ivoirien. Or le téléphone est la clé
  d'identification dans tout le modèle métier : tournées, notifications WhatsApp,
  suivi de commande. L'authentification par Google produirait un profil sans
  identité exploitable.
- Des boutons sociaux affichés mais non fonctionnels sont pires que leur absence :
  l'utilisateur essaie, ça échoue, et il perd confiance dans le produit.

La connexion se fait par email/téléphone + mot de passe, ce qui couvre l'essentiel
de la cible (gérants de pressing, livreurs, clients fidèles).

### 7.2 La bascule est une navigation, pas un état

Le modèle passe `onSwitchToSignUp` et bascule un `useState`. Ici `/login` et
`/register` sont **deux routes**. Raisons :

- l'utilisateur doit pouvoir envoyer l'URL de l'écran de connexion à un collègue ;
- le navigateur doit revenir en arrière de façon cohérente ;
- le middleware protège `/register` par la session, ce qu'un état React ne verrait pas.

Le composant `AuthFooterLink` porte ces liens.

### 7.3 Le logo est unique, pas dupliqué

Le modèle répète un logo flottant sur les deux pages. Dans le layout, le logo
n'apparaît **que sur mobile** (`lg:hidden`), puisque le panneau de marque occupe
cette place sur grand écran. Deux logos visibles simultanément sur desktop
donneraient l'impression d'un bug de rendu.

---

## 8. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `app/(auth)/layout.tsx` | Scindage panneau de marque / colonne formulaire, fond aurore, carte de verre |
| `app/(auth)/login/page.tsx` | Écran Connexion (serveur — lit les erreurs d'URL) |
| `app/(auth)/register/page.tsx` | Écran Inscription (serveur) |
| `app/(auth)/forgot-password/page.tsx` | Demande de lien (serveur) |
| `app/(auth)/reset-password/page.tsx` | Changement de mot de passe (serveur — vérifie la session) |
| `app/(auth)/onboarding/client/page.tsx` | Accueil du client, dans le route group pour hériter du verre |
| `app/auth/confirm/route.ts` | Échange du jeton de confirmation contre une session |
| `components/auth/auth-form.tsx` | `AuthForm`, `AuthHeader`, `AuthFooterLink` |
| `components/auth/brand-panel.tsx` | Panneau de marque et logo mobile |
| `components/auth/input-field.tsx` | `InputField` (libellé, erreur, œil du mot de passe) |
| `components/auth/register-form.tsx` | `RegisterForm` (client) |
| `components/auth/forgot-password-form.tsx` | Saisie + bascule vers l'écran d'attente (client) |
| `components/auth/reset-email-sent.tsx` | Écran d'attente, renvoi du lien (client) |
| `components/auth/password-strength.tsx` | Jauge de robustesse (client) |
| `components/auth/field-error-context.tsx` | Diffuse les erreurs de champ du serveur |
| `components/auth/role-picker.tsx` | Sélecteur gérant / client |
| `lib/validation/auth.ts` | Schémas Zod, source de vérité des règles |
| `app/actions/auth.ts` | `signIn`, `signUp`, `requestPasswordReset`, `updatePassword` — Server Actions |

**Séparation serveur / client.** `login` est un Server Component : il rend directement
`AuthForm`. `register` doit passer par `RegisterForm` (client) parce que le
`RolePicker` reçoit une fonction de rappel, or une fonction ne traverse pas la
frontière RSC. `metadata` reste côté serveur dans les deux cas — c'est interdit dans
un Client Component.

---

## 9. Récupération de mot de passe — implémenté

> Le défaut signalé dans une version précédente de ce document — la redirection
> du rôle `client` vers `/onboarding/client` inexistante — est **corrigé** : la
> route existe, dans le route group `(auth)` afin d'hériter du design verre.
> L'URL reste `/onboarding/client`.

Le flux complet existe, en quatre écrans.

### 1. `/forgot-password` — demande

Saisie de l'email, puis bascule vers un **écran d'attente dédié** plutôt qu'un
message vert au-dessus du bouton. Raison : l'utilisateur vient de perdre son mot
de passe, souvent sur un téléphone en 3G ; un message qui défile ou disparaît
lorsqu'il retente ne l'aide pas. L'écran d'attente permet de **renvoyer le
lien** sans ressaisir l'adresse, et masque l'adresse elle-même
(`de•••••@domaine.ci`).

La réponse est **identique** que l'adresse existe ou non — sinon cet écran
deviendrait un oracle permettant de découvrir quels emails sont inscrits.

### 2. Le lien reçu par email

Il ouvre une session de type `recovery` et mène à `/reset-password`. La durée
de validité est celle configurée côté Supabase (une heure par défaut).

### 3. `/reset-password` — deux facteurs

Le formulaire exige **le mot de passe actuel** en plus du jeton reçu par email.

C'est le seul durcissement réellement ajouté ici, et il est justifié : un lien
de réinitialisation transite par la boîte mail, qui n'est pas un canal sûr. Un
proxy d'entreprise, une boîte compromise ou un historique partagé suffiraient à
capturer le jeton et à prendre définitivement le compte. Le mot de passe, lui,
ne transite ni dans une URL ni dans un historique de serveur. Deux canaux
indépendants pour une même opération sensible.

### 4. `/auth/confirm` — confirmation d'inscription (nouvelle route)

`signUp` exige une confirmation d'email. Le lien renvoyé par Supabase tombe
auparavant sur une **404** : rien ne captait le jeton, la session n'était jamais
ouverte, et l'inscription était donc inutilisable en pratique.

Cette Route Handler échange le jeton contre une session (`exchangeCodeForSession`),
puis redirige vers l'onboarding correspondant au rôle. Elle doit être une Route
Handler et non une page : établir la session exige d'**écrire des cookies**,
ce qui est impossible depuis un Server Component.

`/auth` a été ajouté aux préfixes publics du middleware — sinon celui-ci
redirigerait vers `/login` avant que la route ne s'exécute, et le lien ne
fonctionnerait pas non plus.

### Erreurs d'URL

`/login?error=confirmation` affiche un message expliquant la situation. La
valeur n'est **jamais rendue telle quelle** : elle est comparée à une liste
blanche côté serveur. Un paramètre d'URL est une donnée utilisateur.

## 10. Erreurs de validation serveur

Les erreurs renvoyées par la Server Action s'affichent **sous le champ
concerné**. Elles transitent par un contexte React (`FieldErrorContext`) :
certains champs n'ont pas de rendu direct dans la page, et une prop les aurait
donc perdues. C'était le cas avant correction — `fieldError()` était calculé
dans `AuthForm` puis jamais utilisé.

La prop `error` de `InputField` reste prioritaire, pour les appelsants hors
formulaire (onboarding).

### Enregistrement des champs — le point critique

`InputField` s'enregistre lui-même auprès de `react-hook-form` via
`useAuthForm().register(name)`, dans un **effet** et non pendant le rendu :

- `register()` déclenche un `setState` interne ; l'appeler dans le JSX provoque
  « Cannot update a component while rendering a different component » ;
- les deux refs (celle de `register` et celle de l'appelant) sont fusionnées par
  `useComposedRefs`, un `<input>` n'acceptant qu'une seule ref.

Sans cet enregistrement, le formulaire paraît fonctionner mais n'envoie
**aucune donnée** : la validation ne porte sur rien et `onSubmit` reçoit un
objet vide.

## 11. Traduction des erreurs Supabase

Les clés de `ERROR_MESSAGES` correspondent au **texte reçu de l'API**, pas au
nom technique de l'erreur. Supabase renvoie `Invalid login credentials` (avec
des espaces) alors que son `error_code` vaut `invalid_credentials` : chercher
`InvalidLoginCredentials` ne trouvait jamais rien, et toute erreur retombait sur
« Une erreur est survenue. Réessayez. » — l'utilisateur lisait un échec technique
alors que ses identifiants étaient simplement faux.

L'ordre des motifs compte, `includes` étant large : les plus spécifiques passent
avant les génériques.

## 12. Jauge de robustesse

Sur l'inscription, quatre critères s'affichent en direct et se cochent au fil de
la saisie. Ils sont **alignés sur le schéma Zod** : si l'un change, l'autre
doit suivre. Aucun score chiffré ni « faible / fort » abstrait — un gérant de
pressing a besoin de savoir quel motif ne passe pas, pas d'un indice.

## 13. Palette de référence

| Token | Hex | Usage |
|---|---|---|
| `brand-700` | `#0F766E` | Boutons principaux, liens, accents |
| `brand-800` / `brand-900` | `#115E59` / `#134E4A` | Dégradé du panneau de marque |
| `flag-500` | `#F97316` | Bouton d'inscription, sélection du `RolePicker` |
| `flag-50` | `#FFF7ED` | Fond de la carte sélectionnée |
| `brand-100` | `#D1FAE5` | Texte secondaire sur fond vert |
| `destructive` | `hsl(0 72% 51%)` | Bordure et message d'erreur |

---

## 14. Effets verre et verre 3D

Les écrans sont posés sur un **fond sombre en aurore** (trois taches colorées
floutées qui dérivent lentement), et la carte de connexion est une **tranche de
verre** posée dessus. C'est l'ordre qui compte : un `backdrop-filter` n'a rien à
flouter s'il n'y a rien derrière — sans l'aurore, l'effet de verre est
strictement invisible.

### Classes disponibles

| Classe | Rôle |
|---|---|
| `.glass-panel` | Verre clair : la carte principale. `blur(24px) saturate(180%)`, fond blanc 55–72 %, liseré supérieur blanc 90 % |
| `.glass-dark` | Verre sombre : le panneau de marque, pour qu'il tienne la même profondeur |
| `.glass-chip` | Pastille de verre : logo, promesses en bas du panneau |
| `.glass-sheen` | Reflet qui balaie la surface (pseudo-élément, toutes les 7 s) |
| `.scene-3d` | `perspective: 1400px` sur la scène, sans quoi la 3D est aplatie |
| `.float-3d` | Inclinaison continue : `rotateX/rotateY` + translation en Z |
| `.tilt-lift` | Soulèvement au survol, **sur un enfant** de `.float-3d` |
| `.aurora-1/2/3` | Taches de fond, trois vitesses différentes (22 / 28 / 34 s) |

### Règle de composition

`.float-3d` et `.tilt-lift` ne vont **jamais sur le même élément** : une
animation CSS et une transition se marchent dessus, la seconde l'emporte et
l'inclinaison disparaît. L'inclinaison est sur la carte, le soulèvement sur les
pastilles.

### Contrainte de build

Ces keyframes sont déclarés dans `globals.css`, pas dans `tailwind.config.ts`.
Tailwind ne conserve que les keyframes attachés à un utilitaire `animate-*`
**effectivement utilisé** ; ici les animations sont écrites à la main dans une
feuille CSS, donc le purgeur les écarterait. C'est la même raison que
`shimmer`, `ring-pulse`, `grow-up` et `grow-right` (§ 8 du fichier CSS).

### Accessibilité

`prefers-reduced-motion` neutralise les sept classes et remet la carte **à
plat** : sans cela, la carte resterait penchée dans l'inclinaison de sa
première image. Le reflet est figé puis masqué (`opacity: 0`) — coupé net, il
resterait collé à un coin de la carte.

### Limite assumée

Le verre 3D est **coûteux en rendu** : chaque frame combine `backdrop-filter`,
un flou de 80 px sur trois éléments et une transformation 3D. Sur un téléphone
d'entrée de gamme en 3G, c'est le principal poste de consommation. C'est
acceptable sur un écran de connexion, chargé une fois par session ; il ne
faudrait pas le propager tel quel aux écrans de gestion, où les listes défilent
en continu.
