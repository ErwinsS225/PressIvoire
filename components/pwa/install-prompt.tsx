"use client";

/**
 * Enregistrement du service worker + bouton d'installation.
 *
 * ## Pourquoi ce composant ne rend rien
 *
 * Il ne produit aucun HTML : c'est un point de branchement. Il enregistre le
 * service worker (indispensable, sinon aucun des benefits ci-dessous n'existe)
 * et il **capture** l'evenement `beforeinstallprompt`, que le navigateur ne
 * rejoue jamais tout seul. Le bouton ne peut donc pas etre dans un Server
 * Component : il n'y a pas de `window` pour s'y abonner.
 *
 * ## L'evenement doit etre preventDefault
 *
 * `beforeinstallprompt` annule par defaut l'invite native. Sans appel a
 * `preventDefault()`, le fait de gerer l'evenement declenche l'invite
 * systeme — le navigateur affiche « Voulez-vous installer ? » a un moment
 * que l'application ne maitrise pas.
 *
 * ## Pourquoi le bouton apparait-il si tard ?
 *
 * L'evenement ne se declenche qu'apremis les criteres d'installabilite du
 * navigateur. D'ou le repli sur des gestes manuels : un espace vide laisserait
 * croire a un bug.
 */

import { useCallback, useEffect, useState } from "react";

import {
  detectIos,
  detectSafari,
  detectStandalone,
  installMethod,
  isInstalling,
  manualInstallSteps,
  type ManualInstallSteps,
} from "@/lib/pwa";

/** Evenement non declare dans lib.dom : accessible uniquement par addEventListener. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [safari, setSafari] = useState(false);

  useEffect(() => {
    setStandalone(detectStandalone(window));
    setIos(detectIos(window.navigator));
    setSafari(detectSafari(window.navigator.userAgent));

    // L'evenement n'est emis qu'une fois par page : on le capture pour le
    // rejouer plus tard, quand ce sera l'utilisateur qui demandera.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    // `appinstalled` est la seule preuve reelle : l'utilisateur a accepte et
    // l'application est sur l'ecran d'accueil.
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setPromptOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // `skipWaiting` ne se declenche qu'a la visite suivante. Ce rechargement
  // automatique rend la nouvelle version active sans rien demander a
  // l'utilisateur : un prompt « Recharger ? » pour une mise a jour de cache
  // n'a aucun interet percu.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const method = installMethod({
    isStandalone: standalone || installed,
    isIos: ios,
    isSafari: safari,
    hasPromptEvent: deferred !== null,
  });

  const install = useCallback(async () => {
    if (!deferred) return;
    setPromptOpen(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      // L'evenement est a usage unique : apres `prompt()`, il ne peut plus
      // etre rejoue. Sans cette remise a zero, le bouton resterait affiche
      // et ne ferait plus rien au deuxieme clic.
      setDeferred(null);
      setPromptOpen(false);
    }
  }, [deferred]);

  // Deja installee : rien a proposer.
  if (standalone || installed) return null;

  if (method === "prompt") {
    return (
      <button
        type="button"
        onClick={install}
        disabled={isInstalling({ promptOpen, justInstalled: installed })}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        Installer l&apos;application
      </button>
    );
  }

  const steps: ManualInstallSteps | null = manualInstallSteps({ isIos: ios, isSafari: safari });
  if (!steps) return null;

  return (
    <details className="rounded-lg border border-border bg-card p-4 text-sm">
      <summary className="cursor-pointer font-semibold">{steps.title}</summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
        {steps.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </details>
  );
}

/**
 * Enregistre le service worker.
 *
 * Distinct de `InstallPrompt` parce que les deux repondent a des questions
 * differentes : celui-ci doit fonctionner meme quand aucun bouton n'est
 * affiche (application deja installee, ou navigateur qui ne propose rien).
 * Le hors-ligne ne doit pas dependre de l'affichage d'un bouton.
 *
 * L'enregistrement est differe au `load` : pendant le chargement, il
 * concurrencerait le chargement lui-meme pour la bande passante — ce qui
 * penalise justement l'utilisateur sur telephone mobile.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Echec silencieux volontaire : l'application fonctionne sans lui,
        // seule la capacite hors-ligne est absente. Un message a
        // l'utilisateur serait alarmant et faux.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}