import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'atterrissage du lien de confirmation d'email.
 *
 * Pourquoi une Route Handler et pas une page : le lien Supabase arrive avec un
 * jeton dans l'URL (`?code=...` en PKCE, ou des tokens dans le fragment pour
 * le flux implicit). Etablir la session exige d'ECRIRE des cookies — depuis un
 * Server Component c'est impossible en lecture seule. Une Route Handler est le
 * seul endroit ou l'echange peut se faire.
 *
 * Le middleware ne peut pas non plus le faire : il ignore volontairement les
 * chemins `/auth`, et il n'a pas a connaitre la logique de confirmation.
 *
 * @see app/actions/auth.ts — `signUp` configure `emailRedirectTo` sur cette route
 */

export const dynamic = "force-dynamic";

/** Destination finale apres reussite, en fonction du role du compte. */
function destinationFor(role: string | undefined): string {
  return role === "owner" ? "/onboarding/pressing" : "/onboarding/client";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? origin).replace(/\/$/, "");

  /**
   * On lit `code` (PKCE) en priorite. C'est le flux configure par defaut dans
   * `@supabase/ssr` : le code transite par l'URL, donc le serveur le voit.
   *
   * Si l'utilisateur est deja arrives ici avec une session (il a clique deux
   * fois sur le lien, ou le middleware a deja echange le code au prealable),
   * on ne retente rien : on va droit a la destination.
   */
  const code = searchParams.get("code");

  if (!code) {
    // Pas de jeton : soit le lien est ancien, soit la session existe deja.
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?error=confirmation`);
    }

    return NextResponse.redirect(`${appUrl}${destinationFor(user.user_metadata?.role)}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Jeton consume, expire, ou deja echange. On ne distingue pas : dire
    // « expire » a un attaquant qui a rejoue un lien l'informerait sur la
    // validite du compte.
    return NextResponse.redirect(`${appUrl}/login?error=confirmation`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=confirmation`);
  }

  // Email confirme : la session est etablie. On enleve les parametres de
  // confirmation de l'URL pour ne pas laisser un jeton dans l'historique.
  return NextResponse.redirect(
    `${appUrl}${destinationFor(user.user_metadata?.role)}?confirmed=1`,
  );
}
