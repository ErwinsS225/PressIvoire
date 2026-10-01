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
     * Tout sauf fichiers statiques : _next/image, _next/static,
     * favicon.ico, et assets sous /public
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
