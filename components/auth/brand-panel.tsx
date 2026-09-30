import Link from "next/link";

/**
 * Les trois promesses affichées en bas du panneau de marque.
 *
 * Isolées dans une constante pour que le texte reste la seule chose à traduire
 * si le produit évolue.
 */
const PROMISES = [
  "Montants en francs CFA",
  "Notifications WhatsApp",
  "Conçu pour le terrain",
];

/**
 * Panneau de marque des ecrans d'authentification.
 *
 * Il occupe la moitie gauche de l'ecran a partir de 1024 px et disparait
 * ensuite : sur un telephone, un panneau decoratif vole la moitie de la
 * surface utile pour une information que l'utilisateur connait deja.
 *
 * Les formes sont en CSS pur — aucun fichier image, donc rien a telecharger
 * et un rendu net sur tous les densites d'ecran. Toutes sont `aria-hidden` :
 * ce sont des ornements, un lecteur d'ecran n'a rien a y lire.
 *
 * Le contenu, lui, parle du metier et non de la technologie : « Adventure
 * start here » n'a pas sa place dans un produit de gestion de pressing.
 */
export function BrandPanel() {
  return (
    <div className="glass-dark relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex">
      {/* --- Formes decoratives : haut gauche --- */}
      <div
        aria-hidden
        className="absolute left-12 top-12 grid grid-cols-5 gap-2"
      >
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-white opacity-60" />
        ))}
      </div>

      <div aria-hidden className="absolute left-32 top-12 flex gap-2">
        <span className="h-16 w-4 rounded-full bg-white opacity-20" />
        <span className="h-24 w-4 rounded-full bg-white opacity-40" />
        <span className="h-12 w-4 rounded-full bg-white opacity-20" />
      </div>

      {/* --- Formes decoratives : haut droite --- */}
      <div
        aria-hidden
        className="absolute -right-12 -top-10 h-32 w-32 rounded-full border-[6px] border-white opacity-30"
      />
      <div
        aria-hidden
        className="float-slower absolute right-24 top-20 h-4 w-4 rounded-full bg-flag-500"
      />

      {/* --- Contenu --- */}
      <div className="relative z-10 mt-32">
        <Link href="/" className="inline-flex items-center gap-3">
          <span
            aria-hidden
            className="glass-chip flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white"
          >
            PP
          </span>
          <span className="text-xl font-black tracking-tight">PressIvoire</span>
        </Link>

        <h1 className="mt-10 text-4xl font-black leading-tight">
          Votre pressing,
          <br />
          en un coup d&apos;œil
        </h1>

        <p className="mt-4 max-w-xs text-base leading-relaxed text-brand-100/90">
          Commandes, tournées de livraison et encaissements — pilotés depuis
          votre téléphone.
        </p>
      </div>

      {/* --- Pied : les trois promesses, en pastilles de verre --- */}
      <ul className="relative z-10 space-y-2.5">
        {PROMISES.map((promise) => (
          <li
            key={promise}
            className="glass-chip tilt-lift flex w-fit items-center gap-2.5 rounded-full px-3.5 py-2 text-sm text-white/90"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-flag-500"
            />
            {promise}
          </li>
        ))}
      </ul>

      {/* --- Formes decoratives : bas --- */}
      <div
        aria-hidden
        className="absolute bottom-12 left-12 grid grid-cols-4 gap-2"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-white opacity-60" />
        ))}
      </div>

      <div
        aria-hidden
        className="absolute bottom-16 left-16 h-8 w-8 rounded-full bg-flag-500"
      />
      <div aria-hidden className="absolute bottom-8 left-32 text-2xl font-light">
        ×
      </div>
      <div
        aria-hidden
        className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full border-[10px] border-white opacity-80"
      />
      <div
        aria-hidden
        className="float-slow absolute bottom-24 right-32 h-8 w-8 rounded-full bg-white opacity-80"
      />
    </div>
  );
}

/** Logo compact, pour la colonne formulaire (mobile uniquement). */
export function AuthLogo() {
  return (
    <Link
      href="/"
      className="mb-6 flex flex-col items-center gap-2 lg:hidden"
    >
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 text-lg font-black text-white shadow-sm"
      >
        PP
      </span>
      <span className="text-lg font-black tracking-tight text-slate-900">
        PressIvoire
      </span>
    </Link>
  );
}
