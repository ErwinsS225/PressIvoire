import Link from "next/link";
import { STUCK_ACCOUNT_HELP } from "@/lib/validation/auth";

/**
 * Avertissement affiche en tete du parcours d'onboarding quand le compte
 * existe depuis plus d'une heure mais n'a toujours aucun pressing.
 *
 * ## Pourquoi cet ecran existe
 *
 * Symptome rapporte : un gerant ayant configure son pressing se connecte avec
 * une AUTRE adresse e-mail, tombe sur l'onboarding, remplit les trois etapes
 * pour decouvrir qu'il n'a pas de pressing a gerer. Rien dans l'interface ne
 * l'expliquait, et rien ne lui proposait la sortie — il ne pouvait que
 * recommencer indefiniment.
 *
 * La cause n'est pas devinable depuis cette page : on ignore si le pressing
 * existe ailleurs, et sous quel compte. On ne pretend donc pas l'affirmer. On
 * se contente de nommer la situation et de proposer les deux seules issues
 * reelles : se reconnecter, ou continuer la configuration.
 *
 * ## Pourquoi une deconnexion
 *
 * Se connecter avec une autre adresse suppose de pouvoir changer de session.
 * Un simple lien vers `/login` ne suffirait pas : le middleware renvoie
 * immediatement un utilisateur connecte vers `/dashboard` (GUEST_ONLY_PATHS),
 * qui le ramenerait ici. Il faut donc fermer la session d'abord — d'ou le
 * formulaire, qui fonctionne aussi sans JavaScript.
 */
export function StuckAccountNotice() {
  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left"
    >
      <h2 className="text-sm font-bold text-amber-900">
        Ce compte n&apos;est pas encore rattaché à un pressing
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-amber-800">
        {STUCK_ACCOUNT_HELP}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {/*
         * Deconnexion puis connexion : c'est le seul enchainement qui permet
         * reellement de changer de compte. Le formulaire POST vers
         * `/api/signout`, qui appelle `signOut()` — la meme action que la
         * barre laterale.
         */}
        <form action="/api/signout" method="post" className="flex-1">
          <button
            type="submit"
            className="btn-press inline-flex h-11 w-full items-center justify-center rounded-lg bg-button px-4 text-sm font-bold text-white transition hover:bg-button-strong"
          >
            Changer de compte
          </button>
        </form>

        <Link
          href="/onboarding/pressing/step-1"
          className="btn-press inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
        >
          Configurer un nouveau pressing
        </Link>
      </div>

      <p className="mt-3 text-xs text-amber-700">
        Vous ne vous souvenez pas d&apos;avoir créé un second compte ? Utilisez
        « Changer de compte » et essaiez votre autre adresse e-mail.
      </p>
    </div>
  );
}