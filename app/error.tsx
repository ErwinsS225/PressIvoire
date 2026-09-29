"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log de l'erreur pour la supervision en production
    console.error("Erreur applicative capturée par app/error.tsx :", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-sm">
          <AlertTriangle className="h-10 w-10 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-wide text-destructive uppercase">
            Une erreur est survenue
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Un problème inattendu s&apos;est produit
          </h1>
          <p className="text-sm text-muted-foreground">
            L&apos;application a rencontré une interruption momentanée. Vous pouvez
            tenter de relancer l&apos;action ou revenir à l&apos;accueil.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
