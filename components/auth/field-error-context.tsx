"use client";

import { createContext, useContext } from "react";
import type { UseFormReturn } from "react-hook-form";

/**
 * Instance react-hook-form du formulaire englobant.
 *
 * Indispensable : `InputField` est un composant generique qui n'a pas
 * directement acces au `useForm()` cree dans `AuthForm`. Sans ce contexte, il
 * ne peut pas appeler `register()` et les champs ne sont **jamais enregistres** —
 * la validation ne porte alors sur rien et le formulaire n'envoie aucune
 * donnee. C'etait le bug qui rendait connexion et inscription inoperantes.
 *
 * `null` signifie « pas dans un formulaire » : dans ce cas `InputField` reste
 * un simple champ HTML, utilisable seul (recherche, filtres…).
 */
export const AuthFormContext = createContext<UseFormReturn<never> | null>(null);

/** Formulaire courant, ou `null` hors contexte. */
export function useAuthForm(): UseFormReturn<never> | null {
  return useContext(AuthFormContext);
}


/**
 * Erreurs de champ fournies par la Server Action.
 *
 * Pourquoi un contexte plutot qu'une prop : la validation serveur peut
 * rejeter un champ qui n'a pas de rendu direct dans la page (par exemple
 * `currentPassword`, ajoute apres coup). Sans ce canal, l'erreur serait
 * calculee puis perdue — ce qui etait exactement le cas avant ce contexte.
 *
 * `null` signifie « aucune erreur de serveur » : les champs retombent alors sur
 * la validation locale de react-hook-form.
 */
export const FieldErrorContext = createContext<((name: string) => string | undefined) | null>(
  null,
);

/**
 * Erreur serveur d'un champ, ou undefined.
 *
 * Se combine a l'erreur locale : `fieldError(name) ?? formError(name)` — le
 * serveur est la source de verite, mais il ne renvoie un message que pour les
 * champs qu'il a effectivement rejetes.
 */
export function useFieldError(): (name: string) => string | undefined {
  const context = useContext(FieldErrorContext);
  return context ?? (() => undefined);
}
