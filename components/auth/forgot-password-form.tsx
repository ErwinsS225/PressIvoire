"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AuthForm, AuthHeader } from "@/components/auth/auth-form";
import { InputField } from "@/components/auth/input-field";
import { ResetEmailSent } from "@/components/auth/reset-email-sent";
import { requestPasswordReset, type ActionState } from "@/app/actions/auth";

/**
 * Mot de passe oublie — saisie de l'adresse, puis ecran d'attente.
 *
 * Cote client parce que l'ecran d'avertissement, le renvoi et le
 * verrouillage du bouton exigent un etat local. La validation du champ reste
 * assuree des deux cotes : Zod dans le navigateur, puis la Server Action qui
 * fait foi.
 */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  /**
   * Renvoi du lien depuis l'ecran d'attente.
   *
   * On rappelle l'action en direct : le formulaire de saisie est demonte, donc
   * passer par `AuthForm` n'est plus possible.
   */
  function resend() {
    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", sentTo ?? "");

      const result: ActionState = await requestPasswordReset({}, formData);
      if (result.error) setError(result.error);
    });
  }

  // Phase 2 : le lien est parti, on accompagne l'utilisateur jusqu'a sa boite.
  if (sentTo) {
    return (
      <ResetEmailSent
        email={sentTo}
        onResend={resend}
        isPending={isPending}
        error={error}
      />
    );
  }

  // Phase 1 : saisie de l'adresse.
  return (
    <AuthForm
      kind="forgotPassword"
      action={async (previous, formData) => {
        const result = await requestPasswordReset(previous, formData);

        // Reponse identique que l'adresse existe ou non : on bascule sur
        // l'ecran d'attente dans les deux cas, sinon cet ecran servirait a
        // deviner quels emails sont enregistres.
        const email = formData.get("email");
        if (!result.error && typeof email === "string" && email) {
          setSentTo(email);
        }

        return result;
      }}
      submitLabel="Envoyer le lien"
      defaultValues={{ email: "" }}
      footer={
        <p className="border-t border-slate-100 pt-3 text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-semibold text-brand-700 hover:underline"
          >
            Retour à la connexion
          </Link>
        </p>
      }
    >
      <AuthHeader
        title="Mot de passe oublié"
        subtitle="Indiquez votre email, vous recevrez un lien de réinitialisation."
      />

      <InputField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="vous@pressing.ci"
        required
      />

      <p className="rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
        Le lien ouvre une session temporaire. Pour valider le changement, vous
        saisiirez aussi votre mot de passe actuel : c&apos;est ce qui empêche un
        lien intercepté de suffire à prendre le compte.
      </p>
    </AuthForm>
  );
}
