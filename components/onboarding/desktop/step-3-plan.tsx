"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OnboardingWizard } from "@/components/onboarding/desktop/wizard";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { updatePressingPlan } from "@/app/actions/onboarding";
import { useFormState } from "react-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

const PLANS = [
    {
        id: "essential",
        name: "Essentiel",
        price: "15 000 FCFA",
        period: "/ mois",
        features: [
            "Gestion des commandes",
            "Suivi des clients",
            "Catalogue de services",
            "Notifications SMS basiques",
        ],
    },
    {
        id: "premium",
        name: "Premium",
        price: "30 000 FCFA",
        period: "/ mois",
        features: [
            "Toutes les fonctionnalités Essentiel",
            "Rapports de performance avancés",
            "Notifications WhatsApp",
            "Support prioritaire",
        ],
        popular: true,
    },
];

export function Step3Plan() {
    const router = useRouter();
    const [state, formAction] = useFormState(updatePressingPlan, undefined);
    const [selectedPlan, setSelectedPlan] = useState("premium");

    return (
        <OnboardingWizard
            step="plan"
            title="Choisissez votre abonnement"
            subtitle="Sélectionnez le plan qui correspond le mieux à vos besoins."
        >
            <form action={formAction}>
                <input type="hidden" name="plan" value={selectedPlan} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={cn(
                                "relative cursor-pointer rounded-lg border-2 p-6 transition-all",
                                selectedPlan === plan.id
                                    ? "border-orange-500 shadow-lg"
                                    : "border-gray-200 hover:border-gray-300"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 right-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                                    Populaire
                                </div>
                            )}
                            <h3 className="text-lg font-bold">{plan.name}</h3>
                            <p className="mt-2">
                                <span className="text-3xl font-extrabold">{plan.price}</span>
                                <span className="text-muted-foreground">{plan.period}</span>
                            </p>
                            <ul className="mt-6 space-y-3 text-sm">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {state?.error && (
                    <Alert variant="destructive" className="mt-6">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <AlertTitle>Erreur</AlertTitle>
                        <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-between pt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/onboarding/step-2")}
                    >
                        Retour
                    </Button>
                    <Button type="submit">
                        Terminer la configuration
                    </Button>
                </div>
            </form>
        </OnboardingWizard>
    );
}