/**
 * Detection du contexte d'installation — PWA.
 *
 * Fonctions PURES, sans `window` : l'etat d'installation se deduit de
 * signaux qu'on peut passer en parametre, ce qui le rend testable sous Vitest
 * (dont `environment: "node"`, donc sans DOM) et reutilisable cote serveur.
 * Les acces a `window` sont confines aux wrappers en bas de fichier.
 *
 * ## Pourquoi ce module existe
 *
 * Une PWA s'installe de deux facons, et l'API n'existe que pour une seule :
 *
 * - **Chromium / Firefox / Edge** : l'evenement `beforeinstallprompt` permet
 *   d'afficher UN bouton maison. C'est ce qui rend l'installation
 *   instantanee — donc le levier de conversion le plus fort sur mobile.
 * - **Safari iOS** : aucun evenement. Apple n'expose rien. Il n'y a qu'une
 *   suite de gestes manuels (Partage → Sur l'ecran d'accueil), et le
 *   navigateur ne signale meme pas que l'application est deja installee.
 *
 * Un bouton « Installer » qui ne s'affiche qu'a l'arrivee du
 * `beforeinstallprompt` disparait donc silencieusement sur iOS — precisement
 * une large part du parc mobile en Cote d'Ivoire. D'ou les instructions
 * manuelles derivees plus bas.
 */

/** Comment l'installation est possible sur ce navigateur. */
export type InstallMethod =
  /** Evenement `beforeinstallprompt` recu : un bouton declenchera l'invite. */
  | "prompt"
  /** Aucune API : l'utilisateur doit suivre des gestes manuels. */
  | "manual"
  /** Deja lancee en standalone, ou le navigateur refuse toute installation. */
  | "unavailable";

/** Gestes manuels d'installation, par famille de navigateur. */
export interface ManualInstallSteps {
  /** Titre de la carte d'aide. */
  title: string;
  /** Gestes, dans l'ordre, un par ligne. */
  steps: string[];
}

/**
 * Signaux d'environnement, passes explicitement pour rester testable.
 */
export interface InstallSignals {
  /** `display-mode: standalone` ou `navigator.standalone` (Safari iOS). */
  isStandalone: boolean;
  /** iOS, y compris iPadOS qui se presente en Mac. */
  isIos: boolean;
  /** Safari, ou iOS — les deux partagent les memes limitations. */
  isSafari: boolean;
  /** Evenement `beforeinstallprompt` deja recu. */
  hasPromptEvent: boolean;
}
/**
 * Methode d'installation disponible.
 *
 * L'ordre des tests est volontaire : « deja installe » l'emporte sur tout,
 * sinon le bouton proposerait d'installer une application deja la — le
 * detail le plus immediatement suspect pour un utilisateur.
 */
export function installMethod(signals: InstallSignals): InstallMethod {
  if (signals.isStandalone) return "unavailable";
  if (signals.hasPromptEvent) return "prompt";
  if (signals.isIos || signals.isSafari) return "manual";
  // Chromium sans `beforeinstallprompt` : soit deja installe (en tant
  // qu'onglet), soit la page n'est pas eligible (pas de HTTPS, engagement
  // insuffisant, ou criterion du navigateur non rempli).
  return "unavailable";
}

/**
 * Gestes manuels correspondant au navigateur.
 *
 * `null` quand aucune aide n'est necessaire : afficher « Partage puis Sur
 * l'ecran d'accueil » a un utilisateur Chrome est un signal qu'on ne
 * maitrise pas son propre produit — et sur Desktop Android cette gesture
 * n'existe tout simplement pas.
 */
export function manualInstallSteps(
  signals: Pick<InstallSignals, "isIos" | "isSafari">,
): ManualInstallSteps | null {
  if (signals.isIos) {
    return {
      title: "Ajouter a l'ecran d'accueil",
      steps: [
        "Touchez le bouton Partager, en bas de l'ecran",
        "Choisissez « Sur l'ecran d'accueil »",
        "Touchez Ajouter en haut a droite",
      ],
    };
  }
  if (signals.isSafari) {
    // Safari macOS : le menu Fichier, pas le partage mobile. Sans cela, les
    // gestes iOS seraient sans effet et l'utilisateur repartirait sans rien.
    return {
      title: "Ajouter au Dock",
      steps: ["Ouvrez le menu Fichier", "Choisissez « Ajouter au Dock »"],
    };
  }
  return null;
}

/**
 * L'application est-elle en cours d'installation ?
 *
 * Sert a desactiver le bouton pendant l'invite systeme : sans cela,
 * l'utilisateur peut declencher deux installations et le navigateur affiche
 * alors une boite derobante qui annule la premiere.
 */
export function isInstalling(state: {
  /** Invite systeme ouverte. */
  promptOpen: boolean;
  /** Evenement `appinstalled` recu. */
  justInstalled: boolean;
}): boolean {
  return state.promptOpen && !state.justInstalled;
}

/* -------------------------------------------------------------------------- */
/* Acces navigateur — les seuls points qui touchent `window`                    */
/* -------------------------------------------------------------------------- */

/** iOS, iPadOS compris : le second se deguise en Mac et trompe `userAgent`. */
export function detectIos(nav: {
  userAgent: string;
  maxTouchPoints?: number;
}): boolean {
  if (/iPad|iPhone|iPod/.test(nav.userAgent)) return true;
  // iPadOS 13+ annonce « Macintosh » : seule la presence du tactile
  // trahit un appareil mobile. Sans ce test, tous les iPad seraient
  // pris pour des Mac et recevraient des gestes de Dock.
  return /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1;
}

/** Safari, hors Chromium. `Chrome`, `CriOS` et `Edg` sont exclus explicitement. */
export function detectSafari(userAgent: string): boolean {
  return (
    /Safari/.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(userAgent)
  );
}

/**
 * `navigator.standalone` est-il vrai ?
 *
 * Le parametre est `unknown` et non une forme typee : `Navigator` n'a pas de
 * signature d'index, donc `{ [key: string]: unknown }` lui est incompatible,
 * et `{ standalone?: boolean }` l'est aussi (« aucune propriete en commun »).
 * On accepte donc n'importe quoi et on teste le seul cas utile — ce qui reste
 * verifiable en test avec un simple objet.
 */
function hasStandaloneFlag(navigator: unknown): boolean {
  if (typeof navigator !== "object" || navigator === null) return false;
  return (navigator as { standalone?: unknown }).standalone === true;
}

/** L'application tourne-t-elle en standalone (posee sur l'ecran d'accueil) ? */
export function detectStandalone(win: {
  matchMedia: (query: string) => { matches: boolean };
  navigator?: unknown;
}): boolean {
  // `navigator.standalone` est la seule voie sur iOS : Safari y ignore
  // `display-mode`.
  if (hasStandaloneFlag(win.navigator)) return true;
  return win.matchMedia("(display-mode: standalone)").matches;
}

/** Le service worker est-il enregistre ET actif sur cette page ? */
export function isServiceWorkerReady(container: {
  serviceWorker?: { controller?: unknown };
}): boolean {
  return Boolean(container.serviceWorker?.controller);
}