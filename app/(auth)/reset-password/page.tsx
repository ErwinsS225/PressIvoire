import Link from "next/link";
import { AuthForm, AuthHeader } from "@/components/auth/auth-form";
import { InputField } from "@/components/auth/input-field";
import { updatePassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nouveau mot de passe" };

/**
 * Reinitialisation du mot de passe.
 *
 * Cette page n'est atteignable qu'apres avoir suivi le lien recu par email :
 * le lien ouvre une session de type "recovery". Sans elle, l'action
 * `updatePassword` refuse la modification — on affiche donc une explication
 * plutot qu'un formulaire qui echouerait silencieusement.
 */
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-4 text-center">
        <AuthHeader
          title="Lien expiré"
          subtitle="Ce lien de réinitialisation n'est plus valable."
        />
        <p className="text-sm text-slate-500">
          Demandez-en un nouveau depuis la page de mot de passe oublié.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-button text-sm font-medium text-white transition hover:bg-button-strong"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <AuthForm
      kind="resetPassword"
      action={updatePassword}
      submitLabel="Enregistrer le mot de passe"
      defaultValues={{ currentPassword: "", password: "", confirmPassword: "" }}
    >
      <AuthHeader
        title="Nouveau mot de passe"
        subtitle="Confirmez votre identité puis choisissez un nouveau mot de passe."
      />

      <InputField
        label="Mot de passe actuel"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        hint="Le lien reçu par email ne suffit pas : on vérifie aussi votre mot de passe actuel."
        revealable
        required
      />

      <InputField
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum, avec une majuscule et un chiffre."
        revealable
        required
      />

      <InputField
        label="Confirmer le mot de passe"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        revealable
        required
      />
    </AuthForm>
  );
}
