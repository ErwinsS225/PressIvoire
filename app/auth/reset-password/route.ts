import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route Handler pour la réinitialisation de mot de passe via Supabase Auth (PKCE flow).
 *
 * Le lien envoyé par email contient `?code=...` (ou `?token_hash=...`).
 * Un Server Component ne pouvant pas écrire de cookies de session httpOnly lors d'un GET,
 * cette Route Handler reçoit la requête, échange le code PKCE contre une session valide
 * avec cookies httpOnly persistés côté serveur, puis redirige l'utilisateur vers
 * `/reset-password` où il pourra saisir son nouveau mot de passe.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? origin).replace(/\/$/, "");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${appUrl}/forgot-password?error=expired`);
    }
    return NextResponse.redirect(`${appUrl}/reset-password`);
  }

  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      return NextResponse.redirect(`${appUrl}/forgot-password?error=expired`);
    }
    return NextResponse.redirect(`${appUrl}/reset-password`);
  }

  // Si l'utilisateur a déjà une session active
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.redirect(`${appUrl}/reset-password`);
  }

  return NextResponse.redirect(`${appUrl}/forgot-password?error=invalid`);
}
