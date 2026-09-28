/**
 * Etat partage par les actions de l'onboarding desktop (etapes 2 et 3).
 *
 * ⚠ Volontairement dans un module SEPARE de `app/actions/onboarding.ts` :
 * un fichier `"use server"` ne peut exporter que des fonctions async. Y
 * exporter cette constante ferait echouer le build ("A 'use server' file can
 * only export async functions, found object") — les composants clients ne
 * pourraient plus l'importer.
 */
export type ActionState = {
    error?: string;
};

/**
 * Etat initial des `useFormState` de ces ecrans.
 *
 * `useFormState` attend un `initialState` non `undefined` : le passer a
 * `undefined` fait echouer l'inference de type, qui considere alors que
 * l'action doit accepter `state: null` au lieu de `state: ActionState`.
 * Un objet vide est le bon equivalent.
 */
export const INITIAL_ACTION_STATE: ActionState = {};