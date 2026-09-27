"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck, RotateCcw } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";

/**
 * Ecran d'attente apres l'envoi d'un lien de reinitialisation.
 *
 * Pourquoi une page dediee plutot qu'un message vert dans le formulaire :
 * l'utilisateur vient de perdre son mot de passe, souvent sur un telephone en
 * 3G. Un message affiche "au-dessus du bouton" disparait des lors qu'il scrolle
 * ou qu'il tente de reessayer. Ici l'etat est structure : on peut renvoyer le
 * lien, ou repartir vers la connexion.
 *
 * On n'affiche JAMAIS si l'adresse existe reellement — la reponse est identique
 * dans tous les cas, sinon cet ecran devient un oracle de presence de compte.
 */
export function ResetEmailSent({
  email,
  onResend,
  isPending,
  error,
}: {
  email: string;
  onResend: () => void;
  isPending: boolean;
  error?: string;
}) {
  // Adresse masquee : on montre que le début et la fin, pas le milieu.
  const [masked, setMasked] = useState("");

  useEffect(() => {
    const [local, domain] = email.split("@");
    if (!domain) {
      setMasked(email);
      return;
    }

    const visible = local.slice(0, Math.min(2, local.length));
    setMasked(`${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`);
  }, [email]);

  return (
    <div className="animate-fade-in space-y-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <MailCheck className="h-7 w-7" aria-hidden />
      </span>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900">Vérifiez vos emails</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Si un compte existe pour{" "}
          <span className="font-semibold text-slate-700">{masked}</span>, vous
          venez de recevoir un lien de réinitialisation. Il est valable une heure.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Rien reçu ? Pensez à vérifier vos courriers indésirables.
        </p>

        <button
          type="button"
          onClick={onResend}
          disabled={isPending}
          className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RotateCcw
            className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            aria-hidden
          />
          {isPending ? "Envoi en cours…" : "Renvoyer le lien"}
        </button>

        <Link
          href="/login"
          className="block text-sm font-semibold text-brand-700 hover:underline"
        >
          Revenir à la connexion
        </Link>
      </div>
    </div>
  );
}
