/**
 * Protection des routes + rafraichissement de la session Supabase.
 *
 * Deux responsabilites :
 *   1. renouveler le cookie de session a chaque requete (rotation JWT) ;
 *   2. orienter l'utilisateur — pas de session sur une route privee, et pas
 *      de session sur un ecran de connexion.
 *
 * Ce middleware ne fait QUE verifier la presence d'une session. La
 * redirection par role (owner / driver / client) est traitee cote serveur
 * dans les layouts (Etape 4 du contrat) : la faire ici obligerait a
 * interroger `profiles` sur chaque requete, y compris pour les assets.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isGuestOnlyPath, isPublicPath } from "@/lib/public-paths";
import {
  ATTRIBUTION_COOKIE,
  extractAttribution,
  hasAttributionParams,
  isAttributionUsable,
} from "@/lib/attribution";

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Pas de Supabase configure : on laisse passer sans session (voir .env.example)
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT : laisser cet appel faire la rotation des tokens JWT.
  // `getUser()` valide le JWT aupres de Supabase — `getSession()` se contente
  // de lire le cookie et ne prouve rien sur sa validite.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  /*
   * Attribution de campagne — AVANT toute redirection.
   *
   * La landing (autre depot, autre deploiement) capte `utm_*`, `gclid` et
   * `fbclid`, les conserve 30 jours, puis… s'arrete au bord : ce deploiement
   * ne sait rien de la campagne qui a amene le visiteur. Or la seule facon de
   * repondre a « combien de comptes viennent de WhatsApp » est de faire
   * traverser le marqueur.
   *
   * Deux decisions :
   *
   * 1. **Avant** les redirections. Apres, `/login?redirect=/register` aurait
   *    deja perdu les parametres — le middleware copie `pathname` et `search`
   *    dans son URL cible, mais le visiteur ne doit pas etre redirige avant
   *    qu'on ait note d'ou il vient.
   *
   * 2. **Une seule fois.** Le cookie dure 30 jours ; le reecrire a chaque
   *    requete le renouvellerait indefiniment et ferait Vargas jusqu'a la fin
   *    des temps. On n'ecrit donc que si le cookie est absent.
   */
  if (
    !request.cookies.has(ATTRIBUTION_COOKIE) &&
    hasAttributionParams(request.nextUrl.searchParams) &&
    isAttributionUsable(extractAttribution(request.nextUrl.searchParams))
  ) {
    response.cookies.set(
      ATTRIBUTION_COOKIE,
      extractAttribution(request.nextUrl.searchParams),
      {
        path: "/",
        // 30 jours : la meme duree que la landing. Une campagne plus courte ici
        // perdrait les visiteurs qui reviennent installer leur application le
        // lendemain.
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        // Pas de `secure` en dur : le developpement tourne en HTTP sur
        // localhost, ou un cookie `secure` n'est jamais renvoye. Vercel sert
        // l'application en HTTPS, donc la production reste protegee.
        secure: process.env.NODE_ENV === "production",
      },
    );
  }

  // Session absente + route privee -> page de connexion.
  //
  // La racine (`/`) est volontairement exclue de ce renvoi : elle n'affiche
  // plus de landing, elle decide elle-meme — `/login` pour un visiteur,
  // `/dashboard` pour quelqu'un qui a une session (cf. `app/page.tsx`).
  // La laisser ici renvoyer vers `/login` casserait ce second cas.
  if (!user && !isPublicPath(pathname) && pathname !== "/") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // On memorise la page visee pour y revenir apres la connexion.
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Session presente + ecran reserve aux visiteurs -> directement dans
  // l'application. `/reset-password` est exclu : il exige une session de
  // recovery (voir GUEST_ONLY_PATHS).
  if (user && isGuestOnlyPath(pathname)) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/dashboard";
    appUrl.search = "";
    return NextResponse.redirect(appUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tout sauf les fichiers statiques : `_next/image`, `_next/static`,
     * `favicon.ico`, et assets sous /public
     *
     * ⚠ LE SW ET LE MANIFESTE SONT DANS LE MATCHER, VOLONTAIREMENT.
     *
     * C'est contre-intuitif — un fichier statique devrait etre exclu, comme
     * les autres assets. Mais les exclure sur l'extension est impossible
     * ici : `sw.js` EST un `.js`, et il serait donc capture par la meme
     * regle que `/_next/static`. Consequence observee avant correction :
     *
     *   GET /sw.js  ->  307  ->  /login?redirect=%2Fsw.js
     *
     * Le service worker n'etait donc JAMAIS enregistre. Le navigateur le
     * telecharge une fois, recoit une page de connexion HTML, et rejette
     * l'enregistrement : aucune erreur visible, aucun warning en console sur
     * un build de production. Toute la capacite hors-ligne et le bouton
     * d'installation etaient simplement absents.
     *
     * Le manifeste etait redirige de la meme maniere, ce qui empechait
     * l'installation de la PWA.
     *
     * On les laisse donc passer par le chemin public : ce sont des fichiers
     * necessaires AU mecanisme de session, pas des pages protegees.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
