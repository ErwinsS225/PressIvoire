/**
 * PressingPro — service worker.
 *
 * Fichier statique servi depuis `public/`. Il n'est donc ni importe ni
 * compile : c'est du JavaScript execute tel quel par le navigateur, dans un
 * global ou rien de ce qui suit n'existe.
 *
 * ## Regle de securite — la seule qui compte ici
 *
 * **Aucun cache pour les pages authentifiees.** `/dashboard`, `/orders`,
 * `/clients`, `/caisse`… contiennent les donnees d'UN pressing. Un cache de
 * navigation les rejouerait sur un telephone partage entre deux personnes,
 * ou — pire — apres deconnexion, pour l'utilisateur suivant du telephone.
 * C'est une fuite de donnees entre tenants, pas une inefficacite.
 *
 * Concretement, la strategie est :
 *
 *   - navigation             -> `network-only`, repli sur `/offline` ;
 *   - `/_next/static/*`       -> `cache-first` (noms haches = immuables) ;
 *   - images, polices, icones-> `stale-while-revalidate` ;
 *   - tout le reste           -> passe directement, sans interception.
 *
 * Le choix pour `/_next/static` est sur : ces fichiers ont un hash de leur
 * contenu dans le nom, donc une version donnee ne change jamais. C'est ce
 * qui rend le hors-ligne reellement utile (le squelette de l'application
 * s'affiche) sans jamais exposer de donnee.
 */

const VERSION = "v1";
const CACHE_SHELL = `pressingpro-shell-${VERSION}`;
const CACHE_ASSETS = `pressingpro-assets-${VERSION}`;

/** Pages et ressources figees au deploiement : le minimum vital hors-ligne. */
const PRECACHE = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

/** Prefixes d'URL qui ne doivent JAMAIS etre interceptes. */
const NEVER_TOUCH = [
  "/api/",
  "/auth/",
  "/_next/image",
  "/rest/",
];

/** Les assets Next.js sont haches : ils peuvent etre servis sans reseau. */
function isImmutableAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      // `addAll` est atomique : si une seule ressource echoue, rien n'est
      // mis en cache et l'installation est rejouee au prochain essai. Un
      // shell a moitie rempli produirait un ecran blanc hors-ligne.
      await cache.addAll(PRECACHE);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("pressingpro-") &&
              key !== CACHE_SHELL &&
              key !== CACHE_ASSETS,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * Navigation : reseau d'abord, `/offline` en repli.
 *
 * Aucune ecriture en cache, deliberement. Le HTML d'une page authentifiee
 * contient des donnees metier et de session ; le conserver sur l'appareil
 * le ferait survivre a la deconnexion.
 */
async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_SHELL);
    const offline = await cache.match("/offline");
    if (offline) return offline;
    // Aucun repli disponible : on repond 503 plutot que de laisser la
    // requete echouer silencieusement, ce qui afficherait une page blanche.
    return new Response("Hors ligne", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** Asset hache : cache d'abord. Le nom contenant son propre hash, la version
 *  en cache ne peut pas etre obsolete. */
async function handleImmutable(request) {
  const cache = await caches.open(CACHE_ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Seules les reponses reussies et de type « basique » sont mises en cache :
  // une reponse d'erreur servie depuis le cache resterait stockee indefiniment.
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

/**
 * Images, polices, icones : servir vite, rafraichir ensuite.
 *
 * Une image qui change (logo du pressing mis a jour) apparaitra a la visite
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Seul GET est intercepte : toute autre methode doit passer au reseau.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Autre origine : on ne touche pas. Intercepter les appels vers Supabase
  // depuis le service worker serait a la fois inutile et dangereux.
  if (url.origin !== self.location.origin) return;

  // Le webhook Wave et les routes d'authentification passent en direct.
  if (NEVER_TOUCH.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isImmutableAsset(url.pathname)) {
    event.respondWith(handleImmutable(request));
    return;
  }

  if (request.destination === "image" || request.destination === "font") {
    event.respondWith(handleRevalidate(request));
  }
});

/**
 * Notification push recue.
 *
 * L'evenement peut ne porter aucun payload : `event.data` est alors `null`,
 * ce qui se produit quand la notification est envoyee par une plateforme qui
 * n'embarque pas de donnee. On affiche alors un message generique plutot que
 * de lever : une notification poussee qui ne s'affiche pas est invisible,
 * donc un push rate sans aucun signe pour l'utilisateur.
 */
self.addEventListener("push", (event) => {
  const payload = {
    title: "PressingPro",
    body: "Nouvelle notification",
    url: "/notifications",
    tag: "pressingpro",
    ...readPushPayload(event),
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // `tag` regroupe les notifications identiques au lieu de les empiler :
      // dix alertes « commande prete » ne doivent pas devenir dix lignes.
      tag: payload.tag,
      data: { url: payload.url },
    }),
  );
});

/**
 * Payload du push, ou les valeurs par defaut si l'absence ou le JSON est
 * invalide. Un seul point d'entree, donc une seule lecture de `event.data`.
 */
function readPushPayload(event) {
  if (!event.data) return {};
  try {
    const parsed = event.data.json();
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Clic sur une notification.
 *
 * Deux cas distincts, et l'ordre compte : si un onglet de l'application est
 * deja ouvert (fenetre minimisee, onglet en arriere-plan), `clients.matchAll`
 * le retrouve et on le FOCUSe — c'est le comportement attendu d'un clic sur
 * notification. Sinon, et seulement sinon, on ouvre un nouvel onglet.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        await client.focus();
        if ("navigate" in client) {
          await client.navigate(targetUrl).catch(() => undefined);
        }
        return;
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});
 * suivante — un compromis acceptable pour une ressource non critique.
 */
async function handleRevalidate(request) {
  const cache = await caches.open(CACHE_ASSETS);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Le rafraichissement part en arriere-plan et n'est pas attendu : la reponse
  // immediate reste la version en cache.
  if (cached) return cached;

  return (await network) ?? Response.error();
}