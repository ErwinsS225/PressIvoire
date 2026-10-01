import Link from "next/link";
import { AuthFooterLink, AuthForm, AuthHeader } from "@/components/auth/auth-form";
import { InputField } from "@/components/auth/input-field";
import { signIn } from "@/app/actions/auth";
import { getLandingUrl } from "@/lib/app-url";
import { InstallPrompt } from "@/components/pwa/install-prompt";
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

  /*
   * Lien vers la landing (autre deploiement).
   *
   * Le cas reel : un visiteur tombe sur cet ecran depuis un lien partage, sans
   * avoir vu la page de presentation. Il ne sait pas ce qu'il va obtenir, et
   * n'a aucun moyen de le decouvrir — l'application ne contient ni capture
   * d'ecran ni tarif. Un lien discret evite qu'il referme l'onglet.
   *
   * Le lien est rendu SEULEMENT si l'URL est configuree : sans elle, pas de
   * balise du tout, plutot qu'un `href=""` qui renverrait vers la racine de
   * l'application et passerait pour un lien casse.
   *
   * `rel="noopener"` : l'attribut s'impose des que la cible est un autre
   * domaine — il empeche la page destination d'acceder a `window.opener`.
   */
  const landingUrl = getLandingUrl();

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
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <AuthFooterLink
            prefix="Pas encore de compte ?"
            href="/register"
            label="Créer un compte"
          />
          {landingUrl ? (
            <p className="text-center text-xs text-slate-400">
              <a
                href={landingUrl}
                rel="noopener"
                className="font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
              >
                D&apos;en savoir plus sur PressingPro
              </a>
            </p>
          ) : null}

          {/*
            Installation sur telephone.

            L'ecran de connexion est le bon endroit : c'est la premiere page
            que voit quelqu'un qui arrive par un lien partage depuis un
            telephone, et c'est le moment ou l'application est deja decouverte.
            Le composant ne rend rien si l'application est deja installee ou si
            le navigateur n'a rien a proposer — aucun espace reserve.
          */}
          <InstallPrompt />
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
