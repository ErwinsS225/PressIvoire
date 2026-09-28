"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingWizard } from "@/components/onboarding/desktop/wizard";
import { Trash2 } from "lucide-react";
import { updatePressingServices } from "@/app/actions/onboarding";
import { INITIAL_ACTION_STATE } from "@/app/actions/onboarding-state";
import { useFormState } from "react-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

const INITIAL_SERVICES = [
    { name: "Chemise", price: 1000 },
    { name: "Pantalon", price: 1500 },
    { name: "Costume 2p", price: 3000 },
    { name: "Robe simple", price: 2500 },
    { name: "Drap (1p)", price: 2000 },
];

type Service = { id: number; name: string; price: number };

export function Step2Services() {
    const router = useRouter();
    const [state, formAction] = useFormState(updatePressingServices, INITIAL_ACTION_STATE);
    const [services, setServices] = useState<Service[]>(
        INITIAL_SERVICES.map((s, i) => ({ ...s, id: i }))
    );

    const handleServiceChange = (id: number, field: 'name' | 'price', value: string | number) => {
        setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addService = () => {
        setServices([...services, { id: Date.now(), name: "", price: 0 }]);
    };

    const removeService = (id: number) => {
        setServices(services.filter(s => s.id !== id));
    };

    return (
        <OnboardingWizard
            step="services"
            title="Services et Tarifs"
            subtitle="Définissez les services de base que vous proposez. Vous pourrez les modifier plus tard."
        >
            <form action={formAction} className="space-y-6">
                <div className="space-y-4 rounded-lg border bg-white p-6">
                    <div className="grid grid-cols-[1fr_120px] gap-x-4 px-2 pb-2 font-medium text-muted-foreground">
                        <span>Nom du service</span>
                        <span className="text-right">Prix (FCFA)</span>
                    </div>
                    {services.map((service, index) => (
                        <div key={service.id} className="grid grid-cols-[1fr_120px_auto] items-center gap-x-4">
                            <Input
                                name={`services[${index}][name]`}
                                value={service.name}
                                onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)}
                                placeholder="Ex: Veste"
                            />
                            <Input
                                name={`services[${index}][price]`}
                                type="number"
                                value={service.price}
                                onChange={(e) => handleServiceChange(service.id, 'price', parseInt(e.target.value, 10) || 0)}
                                className="text-right"
                                placeholder="2000"
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeService(service.id)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addService} className="mt-4">
                        + Ajouter un service
                    </Button>
                </div>

                {state?.error && (
                    <Alert variant="destructive">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <AlertTitle>Erreur</AlertTitle>
                        <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-between pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/onboarding/step-1")}
                    >
                        Retour
                    </Button>
                    <Button type="submit">
                        Continuer
                    </Button>
                </div>
            </form>
        </OnboardingWizard>
    );
}