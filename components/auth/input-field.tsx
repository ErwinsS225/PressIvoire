"use client";

import * as React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthFormContext,
  useAuthForm,
  useFieldError,
} from "@/components/auth/field-error-context";
import { cn } from "@/lib/utils";

/**
 * Champ de formulaire réutilisable : libellé, input, erreur, aide.
 *
 * L'erreur est liée au champ via `aria-describedby` + `aria-invalid` : sans
 * cela, un utilisateur de lecteur d'écran n'entendrait pas pourquoi la
 * soumission echoue.
 */
/**
 * Fusionne deux refs en une seule fonction de rappel.
 *
 * `InputField` doit alimenter deux refs : celle de `register` (react-hook-form
 * s'en sert pour suivre le champ) et celle transmise par l'appelant (qui
 * permet de focuser le champ depuis l'exterieur). Un `<input>` n'accepte
 * qu'une seule ref : on les enchaine.
 */
function useComposedRefs<T>(
  first: ((instance: T | null) => void) | undefined,
  second: React.ForwardedRef<T> | undefined,
) {
  return React.useCallback(
    (instance: T | null) => {
      if (typeof first === "function") first(instance);
      else if (first) (first as React.MutableRefObject<T | null>).current = instance;

      if (typeof second === "function") second(instance);
      else if (second) (second as React.MutableRefObject<T | null>).current = instance;
    },
    [first, second],
  );
}

export const InputField = React.forwardRef<
  HTMLInputElement,
  {
    label: string;
    name: string;
    error?: string;
    hint?: string;
    /** Masque la saisie et ajoute le bouton "afficher". */
    revealable?: boolean;
    containerClassName?: string;
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">
>(({ label, name, error, hint, revealable, containerClassName, className, id, ...props }, ref) => {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const [revealed, setRevealed] = React.useState(false);
  const isPassword = props.type === "password";

  /*
   * Enregistrement du champ aupres de react-hook-form.
   *
   * C'est LA piece qui manquait : sans `register()`, le champ n'appartient pas
   * au formulaire. La validation Zod ne le voit pas, et `onSubmit` recoit un
   * objet vide — la soumission partait donc sans aucune donnee.
   *
   * `register()` est appele dans un effet, PAS pendant le rendu : elle appelle
   * `setState` en interne, ce que React interdit pendant la passe de rendu
   * (« Cannot update a component while rendering a different component »).
   */
  const form = useAuthForm();

  /**
   * Proprietes renvoyees par `register()`, reutilisees sur l'<input>.
   *
   * On les conserve dans un etat pour ne pas appeler `register()` pendant le
   * rendu (elle declenche un `setState` interne, interdit a ce moment-la) et
   * pouvoir reutiliser son `onChange` / `onBlur` / `ref` sur l'input.
   */
  const [registered, setRegistered] =
    React.useState<UseFormRegisterReturn | null>(null);

  React.useEffect(() => {
    if (!form) return;
    setRegistered(form.register(name as never) as UseFormRegisterReturn);
  }, [form, name]);

  /*
   * Ref composite appelee IMPERATIVEMENT avant le retour.
   *
   * Appeler un hook dans le JSX — meme sur une ligne qui s'evalue toujours —
   * viole les regles des hooks des que le rendu est rejoue dans un autre ordre
   * ou apres un retour conditionnel. On le calcule ici.
   */
  const composedRef = useComposedRefs(registered?.ref, ref);

  /*
   * Erreur effective du champ.
   *
   * La prop `error` l'emporte : elle permet a un appelant de forcer un message
   * independamment du contexte (utile hors formulaire, ex. onboarding). Sinon
   * on lit le contexte, qui relaie les erreurs renvoyees par la Server Action.
   */
  const serverError = useFieldError()(name);
  const message = error ?? serverError;
  const hasError = Boolean(message);

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      <Label htmlFor={fieldId} className="font-semibold text-slate-700">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={fieldId}
          name={name}
          /*
           * Deux refs a nourir : celui de `register` (que react-hook-form
           * utilise pour suivre le champ) et celui du composant (permet a un
           * appelant de focuser le champ). `useComposedRefs` les fusionne.
           */
          ref={composedRef}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={cn(hasError && errorId, hint && hintId) || undefined}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive",
            revealable && "pr-12",
            className,
          )}
          onChange={registered?.onChange}
          onBlur={registered?.onBlur}
          {...props}
          {...(isPassword && revealable
            ? { type: revealed ? "text" : "password" }
            : {})}
        />

        {revealable ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-md text-slate-400 transition hover:text-slate-600"
          >
            <span aria-hidden>{revealed ? "🙈" : "👁"}</span>
          </button>
        ) : null}
      </div>

      {message ? (
        <p id={errorId} className="text-xs font-semibold text-red-600">
          {message}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
InputField.displayName = "InputField";

/**
 * Select stylé comme l'Input natif. Le `<select>` natif se stylise mal sur
 * iOS ; on le conserve pour l'accessibilité et on corrige l'apparence
 * (suppression de la fleche systeme, hauteur tactile confortable).
 */
export const SelectField = React.forwardRef<
  HTMLSelectElement,
  {
    label: string;
    name: string;
    error?: string;
    options: readonly { value: string; label: string }[];
    placeholder?: string;
    containerClassName?: string;
  } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">
>(({ label, name, error, options, placeholder, containerClassName, id, ...props }, ref) => {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        id={fieldId}
        name={name}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "flex h-11 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "border-destructive focus-visible:ring-destructive",
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
SelectField.displayName = "SelectField";
