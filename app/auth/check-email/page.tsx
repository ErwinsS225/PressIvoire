"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

/**
 * Corps de la page, isole dans son propre composant.
 *
 * `useSearchParams()` force le rendu cote client. Utilise directement dans
 * une page, il fait echouer le prerendu : Next.js ne peut pas lire les
 * parametres d'URL a la generation statique. L'encapsuler dans un <Suspense>
 * — comme ci-dessous — permet a Next de prerendre le squelette et de
 * hydrater la partie dependante de l'URL ensuite.
 *
 * Ce n'est donc pas une precaution : c'est la condition pour que la page
 * existe en build (erreur "useSearchParams() should be wrapped in a
 * suspense boundary").
 */
function CheckEmailContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email");

    return (
        <main className="container flex flex-col items-center justify-center min-h-screen py-12 text-center">
            <div className="w-full max-w-md space-y-6">
                <div className="flex justify-center">
                    <MailCheck className="w-16 h-16 text-green-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Vérifiez votre boîte mail
                    </h1>
                    <p className="text-muted-foreground">
                        Nous avons envoyé un lien de confirmation à l&apos;adresse suivante :
                    </p>
                    {email && (
                        <p className="font-mono text-lg font-bold">{decodeURIComponent(email)}</p>
                    )}
                    <p className="pt-4 text-sm text-muted-foreground">
                        Cliquez sur ce lien pour finaliser la création de votre compte et vous connecter.
                    </p>
                </div>
                <div className="text-sm text-muted-foreground">
                    <p>Rien reçu ? Pensez à vérifier vos courriers indésirables.</p>
                </div>
            </div>
        </main>
    );
}

export default function CheckEmailPage() {
    return (
        <Suspense
            fallback={
                <main className="container flex min-h-screen items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                </main>
            }
        >
            <CheckEmailContent />
        </Suspense>
    );
}