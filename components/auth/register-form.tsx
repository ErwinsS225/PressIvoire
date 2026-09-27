"use client";

import { AuthFooterLink, AuthForm, AuthHeader } from "@/components/auth/auth-form";
import { InputField } from "@/components/auth/input-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { RolePicker } from "@/components/auth/role-picker";
import { signUp } from "@/app/actions/auth";

export function RegisterForm() {
  return (
    <AuthForm
      kind="register"
      action={signUp}
      submitLabel="Créer mon compte"
      defaultValues={{
        role: "owner",
        fullName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      }}
      footer={
        <div className="border-t border-slate-100 pt-3">
          <AuthFooterLink
            prefix="Déjà un compte ?"
            href="/login"
            label="Se connecter"
          />
        </div>
      }
    >
      {(form) => (
        <>
          <AuthHeader
            title="Créer un compte"
            subtitle="Dites-nous comment vous utilisez PressingPro"
          />

          <RolePicker
            value={form.watch("role")}
            onChange={(value) =>
              form.setValue("role", value, { shouldValidate: true, shouldDirty: true })
            }
            error={
              (form.formState.errors.role?.message as string | undefined) ?? undefined
            }
          />

          <InputField
            label="Nom complet"
            name="fullName"
            autoComplete="name"
            placeholder="Awa Koné"
            required
          />

          <InputField
            label="Téléphone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+225 07 08 09 10 11"
            hint="Préfixe +225 ajouté automatiquement."
            required
          />

          <InputField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@pressing.ci"
            required
          />

          <InputField
            label="Mot de passe"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères, 1 chiffre, 1 majuscule"
            revealable
            required
          />

          {/* Jauge en direct : le critère non coché est plus parlant qu'un
              refus à la soumission, trois secondes plus tard. */}
          <PasswordStrength password={form.watch("password") ?? ""} />

          <InputField
            label="Confirmer le mot de passe"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            revealable
            required
          />
        </>
      )}
    </AuthForm>
  );
}
