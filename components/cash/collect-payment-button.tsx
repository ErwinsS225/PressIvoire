"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { recordPayment } from "@/app/actions/orders";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatFCFA } from "@/lib/utils";

/**
 * Encaissement rapide d'un solde, depuis le tableau des impayes.
 *
 * Le meme principe que la version mobile, avec un dialogue plutot qu'un
 * depliage : a cette echelle, une liste de moyens de paiement dans une boite
 * est plus rapide a lire qu'un menu contextuel.
 *
 * L'ecriture passe par la meme Server Action que la fiche de commande
 * (`recordPayment`), donc par la meme fonction Postgres transactionnelle : il
 * n'y a qu'un seul chemin d'ecriture du chiffre d'affaires dans l'application.
 */
export function CollectPaymentButton({
    orderId,
    orderNumber,
    pressingId,
    remaining,
}: {
    orderId: string;
    orderNumber: string;
    pressingId: string;
    /** Solde restant du, en FCFA. */
    remaining: number;
}) {
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [method, setMethod] = useState<string>(PAYMENT_METHODS.CASH);

    const handleCollect = () => {
        startTransition(async () => {
            try {
                await recordPayment(orderId, pressingId, remaining, method);
                toast.success(
                    `Commande ${orderNumber} : ${formatFCFA(remaining)} encaissés (${paymentMethodLabel(method)}).`,
                );
                setOpen(false);
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : "Encaissement impossible.",
                );
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <CreditCard className="h-4 w-4" />
                    Encaisser
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Encaisser {formatFCFA(remaining)}</DialogTitle>
                    <DialogDescription>
                        Commande {orderNumber}. L&apos;écriture sera enregistrée dans
                        le journal des paiements.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 py-2">
                    <Label htmlFor="payment-method">Moyen de paiement</Label>
                    <select
                        id="payment-method"
                        value={method}
                        onChange={(event) => setMethod(event.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        {Object.values(PAYMENT_METHODS).map((value) => (
                            <option key={value} value={value}>
                                {paymentMethodLabel(value)}
                            </option>
                        ))}
                    </select>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                    >
                        Annuler
                    </Button>
                    <Button onClick={handleCollect} disabled={isPending}>
                        {isPending ? "Enregistrement…" : "Confirmer l'encaissement"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}