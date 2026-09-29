"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { createClientAction, type ClientActionState } from "./actions";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Création..." : "Créer le client"}
        </Button>
    );
}

export function CreateClientForm() {
    const [state, formAction] = useFormState(
        createClientAction,
        {} as ClientActionState,
    );

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouveau client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nouveau client</DialogTitle>
                    <DialogDescription>
                        Ajoutez un nouveau client à votre liste.
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="full_name" className="text-right">
                                Nom complet
                            </Label>
                            <Input id="full_name" name="full_name" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">
                                Téléphone
                            </Label>
                            <Input id="phone" name="phone" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input id="email" name="email" type="email" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="address" className="text-right">
                                Adresse
                            </Label>
                            <Input id="address" name="address" className="col-span-3" />
                        </div>
                    </div>
                    {/*
                     * Erreur renvoyee par l'Action : refus de role
                     * (`requireStaff()`), ou erreur d'ecriture traduite. Sans ce
                     * rendu, un refus resterait invisible et « Créer le client »
                     * semblerait simplement ne rien faire.
                     */}
                    {state.errors?._server ? (
                        <p className="pb-2 text-sm text-red-600">
                            {state.errors._server[0]}
                        </p>
                    ) : state.message ? (
                        <p className="pb-2 text-sm text-green-700">
                            {state.message}
                        </p>
                    ) : null}
                    <DialogFooter>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}