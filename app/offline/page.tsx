"use client";

/**
 * Ecran hors-ligne — repli du service worker.
 *
 * ## Pourquoi cette page est PUBLIQUE
 *
 * Deux raisons qui se cumulent :
 *
 * 1. Le service worker la sert en repli quand le reseau tombe. Elle doit
 *    donc etre telechargeable SANS session, sinon un utilisateur connecte
 *    verrait « connectez-vous » au moment precis ou le reseau est coupe.
 * 2. Elle est dans le `precache` : c'est la seule page mise en cache.
 *
 * Elle ne contient aucune donnee : uniquement un message et une action.
 * L'afficher ne revele donc rien du pressing consulte.
 *
 * ## Pourquoi un composant client
 *
 * Pour le seul bouton. Un Server Component ne peut pas porter de gestionnaire
 * d'evenement : sans `"use client"`, le bouton serait inerte — et un bouton
 * qui ne fait rien est pire qu'un message d'erreur, parce qu'il laisse
 * croire que l'application repond.
 */

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Vous etes hors ligne</h1>
        <p className="max-w-sm text-muted-foreground">
          La connexion a ete perdue. Vos donnees restent enregistrees : reconnectez-vous
          pour retrouver vos commandes.
        </p>
      </div>

      {/*
        `location.reload()` et non un lien vers `/` : un lien serait traite
        par le middleware, qui renverrait vers `/login` — et l'utilisateur
        perdrait exactement la page qu'il cherchait a retrouver.
      */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Reessayer
      </button>
    </main>
  );
}