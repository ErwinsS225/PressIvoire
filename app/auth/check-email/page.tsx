"use client";

import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

export default function CheckEmailPage() {
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
                        Nous avons envoyé un lien de confirmation à l'adresse suivante :
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