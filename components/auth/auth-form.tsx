"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  useForm,
  type DefaultValues,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import { InputField } from "@/components/auth/input-field";
import { FieldErrorContext, AuthFormContext } from "@/components/auth/field-error-context";
import { Button } from "@/components/ui/button";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/lib/validation/auth";
import type { ActionState } from "@/app/actions/auth";

/**
 * Les schemas Zod sont importes ICI, cote client, et choisis par une cle.
 *
 * On ne passe surtout pas le schema en prop depuis une page serveur : un
 * objet Zod est une instance de classe, or RSC n'accepte que des objets
 * simples ("Only plain objects ... can be passed to Client Components").
 * Une cle de type `AuthFormKind` est une chaine, donc serialisable.
 */
const SCHEMAS = {
  login: loginSchema,
  register: registerSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
} as const;

export type AuthFormKind = keyof typeof SCHEMAS;

/** `onSubmit` recoit toujours la forme de sortie (valeurs normalisees). */
type ValuesOf<K extends AuthFormKind> = K extends "login"
  ? LoginValues
  : K extends "register"
    ? RegisterInput
    : K extends "forgotPassword"
      ? ForgotPasswordValues
      : ResetPasswordInput;

/**
 * Formulaire d'authentification generique.
 *
 * Validation en deux temps :
 *   1. Zod dans le navigateur (react-hook-form) -> messages instantanes, pas
 *      d'aller-retour serveur ;
 *   2. la Server Action revalide systematiquement — c'est elle qui fait foi,
 *      le client ne peut pas etre cru.
 *
 * On n'utilise volontairement pas `useFormState` de `react-dom` : l'API
 * n'est stable qu'a partir de React 19, et le projet tourne sur React 18.3.
 * L'etat de retour de l'action est donc gere localement.
 */
export function AuthForm<K extends AuthFormKind>({
  kind,
  action,
  submitLabel,
  defaultValues,
  footer,
  notice,
  hiddenFields,
  children,
}: {
  kind: K;
  /**
   * Signature d'une Server Action `use server`. Le premier parametre est
   * l'etat precedent : on y passe un objet vide, l'etat de retour etant
   * gere localement (cf. note sur `useFormState` plus haut).
   */
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  defaultValues?: DefaultValues<ValuesOf<K>>;
  footer?: ReactNode;
  /**
   * Message affiche avant toute soumission.
   *
   * Sert aux erreurs portees par l'URL (lien de confirmation expire, par
   * exemple) : elles concernent l'ecran, pas un champ, et n'arrivent donc pas
   * par la Server Action. Ne jamais y mettre une valeur venue de l'URL sans
   * l'avoir comparee a une liste blanche — ce texte est rendu tel quel.
   */
  notice?: string | null;
  /**
   * Champs ajoutes au `FormData` sans etre des champs du formulaire.
   *
   * Ils sont necessaires parce que `onSubmit` reconstruit le `FormData` depuis
   * les valeurs de react-hook-form : un `<input type="hidden">` pose dans la
   * page disparaitrait, le navigateur n'ayant plus rien a serialiser. C'est le
   * cas du `redirect` que le middleware inscrit dans l'URL et que l'action
   * doit recevoir pour renvoyer l'utilisateur a la page qu'il visait.
   */
  hiddenFields?: Record<string, string>;
  /**
   * Contenu du formulaire. Peut recevoir l'instance react-hook-form pour
   * brancher des widgets personnalises (selecteur de role, grille de plan…) :
   * sans cela, un `<input name="role">` non enregistre par react-hook-form
   * n'apparaitrait pas dans les valeurs soumises.
   */
  children?: ReactNode | ((form: UseFormReturn<ValuesOf<K>>) => ReactNode);
}) {
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  const form = useForm<ValuesOf<K>>({
    // Le resolver type le formulaire sur le schema Zod : impossible d'oublier
    // un champ, le typage suit.
    resolver: zodResolver(SCHEMAS[kind] as ZodTypeAny),
    defaultValues,
    mode: "onBlur",
  });

  /**
   * Soumission.
   *
   * Elle doit etre `async` : `handleSubmit` attend une promesse, et toute
   * exception non rattrapee se transformerait en rejet non gere.
   */
  const onSubmit = async (values: ValuesOf<K>) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    }
    for (const [key, value] of Object.entries(hiddenFields ?? {})) {
      formData.append(key, value);
    }

    startTransition(async () => {
      setState({});
      try {
        const result = await action({}, formData);

        /*
         * On enregistre TOUJOURS le retour de l'action.
         *
         * Le test conditionnel anterieur (`if (result?.error || result?.success)`)
         * pouvait ecarter un etat utile — typiquement `{ success: ... }` avec une
         * valeur vide ou falsy. Plus simple et plus sur : l'action renvoie soit
         * un message, soit rien, et il n'y a rien a filtrer.
         */
        setState(result ?? {});
      } catch (error) {
        /*
         * `redirect()` ne leve pas une vraie erreur : Next.js la propage pour
         * que le routeur execute la navigation. La remonter telle quelle est
         * donc le SEUL comportement correct — la relaver ferait ecraser la
         * page par le message d'erreur au lieu de naviguer.
         *
         * On teste le digest, pas le message : Next encapsule l'erreur, et le
         * texte n'est pas garantie.
         */
        const digest = (error as { digest?: string } | null)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
          throw error;
        }

        setState({ error: "Une erreur est survenue. Reessayez." });
      }
    });
  };

  const errors = form.formState.errors as Record<string, { message?: string }>;

  /*
   * Erreur affichable pour un champ : celle du serveur d'abord — elle fait foi —
   * celle du navigateur en secours.
   *
   * Elle est injectee dans un contexte plutot que passee en props : certains
   * champs n'ont pas de rendu direct dans la page, et leur erreur se perdait
   * donc sans jamais etre affichee.
   */
  const fieldError = (name: string): string | undefined =>
    state.fieldErrors?.[name] ?? errors[name]?.message;

  return (
    <AuthFormContext.Provider value={form as never}>
    <FieldErrorContext.Provider value={fieldError}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="animate-fade-in space-y-4"
      >
      {typeof children === "function" ? children(form) : children}

      {/* Erreur d'URL, affichee avant meme la premiere soumission. */}
      {notice ? (
        <p
          role="alert"
          className="rounded-lg border border-flag-200 bg-flag-50 px-3 py-2.5 text-sm font-medium text-slate-700"
        >
          {notice}
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700"
        >
          {state.success}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Veuillez patienter…" : submitLabel}
      </Button>

        {footer}
      </form>
    </FieldErrorContext.Provider>
    </AuthFormContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* En-tete de formulaire (titre + sous-titre)                                   */
/* -------------------------------------------------------------------------- */

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1 text-center">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

/** Bloc de liens en bas de formulaire ("Pas de compte ? S'inscrire"). */
export function AuthFooterLink({
  prefix,
  href,
  label,
}: {
  prefix: string;
  href: string;
  label: string;
}) {
  return (
    <p className="text-center text-sm text-slate-500">
      {prefix}{" "}
      <Link href={href} className="font-semibold text-brand-700 hover:underline">
        {label}
      </Link>
    </p>
  );
}
