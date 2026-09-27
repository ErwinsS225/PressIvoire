"use client";

import { useFormState } from "react-dom";
import { updatePassword } from "@/app/actions/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

export default function ResetPasswordPage() {
    const [state, formAction] = useFormState(updatePassword, undefined);

    return (
        <main className="container flex flex-col items-center justify-center min-h-screen py-12">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Définir un nouveau mot de passe
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Saisissez votre nouveau mot de passe ci-dessous.
                    </p>
                </div>

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nouveau mot de passe</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                        />
                        {state?.fieldErrors?.password && (
                            <p className="text-sm text-red-500">
                                {state.fieldErrors.password}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            placeholder="••••••••"
                        />
                        {state?.fieldErrors?.confirmPassword && (
                            <p className="text-sm text-red-500">
                                {state.fieldErrors.confirmPassword}
                            </p>
                        )}
                    </div>

                    {state?.error && (
                        <Alert variant="destructive">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full">
                        Enregistrer le nouveau mot de passe
                    </Button>
                </form>
            </div>
        </main>
    );
}