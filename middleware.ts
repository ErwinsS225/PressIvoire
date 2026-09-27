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

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

/** Ecrans accessibles sans session. */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

/**
 * Prefixes accessibles sans session.
 *
 * `/auth` : point d'atterrissage des liens de confirmation d'email et de
 * reinitialisation. Ces liens sont emis par Supabase et ouvrent la session
 * eux-memes via un echange de jeton ; si le middleware exigeait une session
 * avant de les laisser passer, il redirigerait vers `/login` et le lien ne
 * fonctionnerait jamais. C'est le meme raisonnement que `/api`.
 */
const PUBLIC_PREFIXES = ["/api", "/_next", "/auth"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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
  if (!user && !isPublic(pathname) && pathname !== "/") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // On memorise la page visee pour y revenir apres la connexion.
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Session presente + ecran de connexion -> directement dans l'application.
  if (user && PUBLIC_PATHS.includes(pathname)) {
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
