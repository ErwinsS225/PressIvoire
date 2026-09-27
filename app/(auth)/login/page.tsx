import Link from "next/link";
import { AuthFooterLink, AuthForm, AuthHeader } from "@/components/auth/auth-form";
import { InputField } from "@/components/auth/input-field";
import { signIn } from "@/app/actions/auth";
import { safeRedirectPath } from "@/lib/utils";

export const metadata = { title: "Connexion" };

/**
 * Ecran Connexion — coquille serveur, formulaire client.
 *
 * La page lit `error` et `redirect` dans l'URL, que le middleware et
 * `/auth/confirm` posent : c'est une page serveur, elle peut donc les lire
 * directement, sans passer par `useSearchParams` (qui obligerait a rendre la
 * page entierement cote client).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; redirect?: string };
}) {
  /**
   * Message d'erreur issu d'une URL.
   *
   * On n'affiche JAMAIS le parametre brut : il vient de l'URL, donc de
   * l'utilisateur. Le rendre tel quel en `innerHTML` serait une faille
   * d'injection. On ne garde que deux valeurs connues du reste de
   * l'application.
   */
  const urlError =
    searchParams.error === "confirmation"
      ? "Lien de confirmation invalide ou déjà utilisé. Inscrivez-vous à nouveau, ou connectez-vous si votre compte existe."
      : null;

  return (
    <AuthForm
      kind="login"
      action={signIn}
      submitLabel="Se connecter"
      defaultValues={{ identifier: "", password: "" }}
      /*
       * La page de destination est filtree ici, cote serveur, avant meme
       * d'atteindre l'action : une URL bien formee ne doit pas suffire a
       * faire sortir l'utilisateur de l'application apres connexion.
       */
      hiddenFields={{ redirect: safeRedirectPath(searchParams.redirect) }}
      notice={urlError}
      footer={
        <div className="border-t border-slate-100 pt-3">
          <AuthFooterLink
            prefix="Pas encore de compte ?"
            href="/register"
            label="Créer un compte"
          />
        </div>
      }
    >
      <AuthHeader
        title="Connexion"
        subtitle="Accédez à votre espace pressing"
      />

      <InputField
        label="Email ou téléphone"
        name="identifier"
        type="text"
        autoComplete="username"
        inputMode="text"
        placeholder="vous@pressing.ci ou 07 08 09 10 11"
        required
      />

      <InputField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        revealable
        required
      />

      <Link
        href="/forgot-password"
        className="block text-center text-sm font-semibold text-brand-700 hover:underline"
      >
        Mot de passe oublié ?
      </Link>
    </AuthForm>
  );
}
