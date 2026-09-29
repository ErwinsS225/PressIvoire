"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, ArrowRightCircle } from "lucide-react";

import { advanceOrderStatus, recordPayment } from "@/app/actions/orders";
import {
  PAYMENT_METHODS,
  ORDER_STATUS_LABELS,
  paymentMethodLabel,
  type OrderStatus,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmount } from "@/lib/utils";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/**
 * Actions sur une commande : encaissement et avancement du workflow.
 *
 * Meme Server Actions que la version mobile (`recordPayment`,
 * `advanceOrderStatus`), donc memes ecritures et memes garanties : le
 * plafonnement du montant et l'atomicite restent assures par la fonction
 * Postgres `record_payment`, pas par ce composant.
 *
 * L'avancement suit `ORDER_STATUS_FLOW` : un statut hors suite (annule,
 * litige) ne propose donc aucune action, plutot que de faire avancer une
 * commande terminale.
 */
export function OrderActions({
  orderId,
  pressingId,
  status,
  total,
  amountPaid,
  currency = "FCFA",
  canManage = true,
}: {
  orderId: string;
  pressingId: string;
  status: string;
  total: number;
  amountPaid: number;
  currency?: string;
  /**
   * L'utilisateur fait-il partie du personnel du pressing ?
   *
   * `false` (role `client`) : la commande est affichee en lecture seule, sans
   * bouton d'encaissement ni d'avancement. Pendant visuel de `requireStaff()`
   * (lib/guards.ts), qui refuserait de toute facon l'ecriture.
   */
  canManage?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showPartial, setShowPartial] = useState(false);
  const [partial, setPartial] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS.CASH);

  const remaining = Math.max(total - amountPaid, 0);
  const settled = remaining === 0;
  const next = nextLabel(status);

  /*
   * Lecture seule : le role est de toute facon verifie cote serveur
   * (`requireStaff` a l'entree de chaque action), mais proposer des boutons
   * qui echoueraient serait malhonnete. On s'arrete donc au constat.
   *
   * Cet `if` vient APRES les hooks (useTransition, useState) : les hooks
   * doivent etre appeles a chaque rendu, sans condition.
   */
  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Lecture seule.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          L&apos;encaissement et l&apos;avancement du statut sont réservés au
          personnel du pressing.
        </CardContent>
      </Card>
    );
  }

  const run = (label: string, action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(label);
        setShowPartial(false);
        setPartial("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action impossible.");
      }
    });
  };

  const handleAdvance = () =>
    run("Statut mis à jour", async () => {
      await advanceOrderStatus(orderId, pressingId);
    });

  const handlePayment = (amount: number) =>
    run(
      `Encaissement de ${amount} ${currency} (${paymentMethodLabel(method)}) enregistré`,
      async () => {
        await recordPayment(orderId, pressingId, amount, method);
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          Encaisser le solde et faire avancer la commande dans le workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {settled ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Commande entièrement payée.
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="order-method">Moyen de paiement</Label>
              <select
                id="order-method"
                value={method}
                disabled={isPending}
                onChange={(event) => setMethod(event.target.value)}
                className={selectClass}
              >
                {Object.values(PAYMENT_METHODS).map((value) => (
                  <option key={value} value={value}>
                    {paymentMethodLabel(value)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              disabled={isPending}
              onClick={() => handlePayment(remaining)}
            >
              <CreditCard className="h-4 w-4" />
              Encaisser {formatAmount(remaining)} {currency}
            </Button>

            {showPartial ? (
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = Number.parseInt(partial, 10);
                  if (Number.isFinite(value) && value > 0) handlePayment(value);
                  else toast.error("Montant invalide.");
                }}
              >
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="order-partial">
                    Montant partiel (max {formatAmount(remaining)})
                  </Label>
                  <Input
                    id="order-partial"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={remaining}
                    value={partial}
                    onChange={(event) => setPartial(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isPending}>
                  Encaisser
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPartial(true)}
              >
                Encaisser un montant partiel
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-2 border-t pt-6">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || settled}
            onClick={handleAdvance}
          >
            <ArrowRightCircle className="h-4 w-4" />
            Marquer « {next} »
          </Button>
          <p className="text-xs text-muted-foreground">
            {settled
              ? "Commande réglée : le statut reste modifiable."
              : "Le statut avance d'une étape dans le workflow du pressing."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Libelle de l'etat suivant, pour l'intitule du bouton d'avancement.
 *
 * Un statut absent de la suite (annule, litige) donne « Terminée » : aucune
 * action n'est proposee plutot que d'avancer une commande terminale.
 */
function nextLabel(status: string): string {
  const flow: string[] = [
    "pending",
    "pickup_scheduled",
    "picked_up",
    "in_processing",
    "ready",
    "out_for_delivery",
    "delivered",
  ];
  const index = flow.indexOf(status);
  if (index === -1 || index === flow.length - 1) return "Terminée";
  return ORDER_STATUS_LABELS[flow[index + 1] as OrderStatus];
}
