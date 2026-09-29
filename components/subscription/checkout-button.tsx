"use client";

import { useState, useTransition } from "react";

import { startSubscriptionCheckout } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";

/**
 * Bouton de passage au plan payant.
 *
 * Il lance une Server Action qui cree une session Wave puis redirige vers la
 * page de paiement. Le composant est en « use client » parce que la
 * navigation sort du site : elle se fait cote navigateur.
 *
 * L'activation, elle, ne se produit JAMAIS ici : elle passe par le webhook
 * Wave, seul a pouvoir prouver que l'argent est arrive. Un retour de
 * `success_url` ne prouve RIEN — cette URL est ouvrable par n'importe qui.
 */
export function CheckoutButton({
  planId,
  planName,
  price,
  disabled,
}: {
  planId: string;
  planName: string;
  price: number;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const formData = new FormData();
    formData.set("plan", planId);

    startTransition(async () => {
      setError(null);
      try {
        const result = await startSubscriptionCheckout({}, formData);
        if (result?.error) setError(result.error);
      } catch {
        /*
         * `redirect()` remonte une exception, et c'est NORMAL : le
         * navigateur doit suivre. La relancer ici afficherait une erreur
         * d'activation a la place de naviguer vers Wave. Si l'action leve
         * autre chose, c'est qu'elle a deja rendu son message.
         */
      }
    });
  };

  return (
    <div className="grid gap-2 border-t pt-4">
      <Button
        type="button"
        onClick={submit}
        disabled={disabled || isPending}
        className="w-full"
      >
        {isPending ? "Redirection vers Wave…" : `Passer au plan ${planName}`}
      </Button>

      {error ? (
        <p role="alert" className="text-center text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        {price.toLocaleString("fr-FR")} FCFA par mois — mobile money (Orange,
        MTN, Moov) via Wave.
      </p>
    </div>
  );
}