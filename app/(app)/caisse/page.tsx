import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CollectPaymentButton } from "@/components/cash/collect-payment-button";
import { getContext, getCashRegister } from "@/lib/supabase/queries";
import { paymentMethodLabel } from "@/lib/constants";
import { formatFCFA, formatRelativeDate } from "@/lib/utils";

export const metadata = { title: "Caisse" };

/** Tuile d'indicateur : un libelle, une valeur, une precision. */
function Kpi({
    title,
    value,
    detail,
    tone = "default",
}: {
    title: string;
    value: string;
    detail: string;
    tone?: "default" | "warning";
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p
                    className={
                        tone === "warning"
                            ? "text-3xl font-bold text-orange-600"
                            : "text-3xl font-bold"
                    }
                >
                    {value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    );
}

/**
 * Caisse du jour.
 *
 * Les donnees viennent de la table `payments` — le JOURNAL des encaissements,
 * alimente depuis la migration 004 — et non de `orders.payment_method`, qui est
 * ecrase a chaque encaissement : deux reglements partiels (500 F especes puis
 * 500 F Wave) y apparaitraient integralement en Wave.
 */
export default async function CashRegisterPage() {
    const { pressing } = await getContext();

    if (!pressing) {
        redirect("/onboarding/pressing");
    }

    const register = await getCashRegister(pressing.id);
    const today = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    return (
        <div className="flex flex-col gap-8">
            <Header title="Caisse" subtitle={`Encaissements du ${today}`} />

            <section className="grid gap-4 md:grid-cols-3">
                <Kpi
                    title="Encaissé aujourd'hui"
                    value={formatFCFA(register.collectedToday)}
                    detail={`${register.paymentsCount} encaissement${register.paymentsCount > 1 ? "s" : ""}`}
                />
                <Kpi
                    title="Reste à recouvrer"
                    value={formatFCFA(register.outstanding.total)}
                    detail={`${register.outstanding.count} commande${register.outstanding.count > 1 ? "s" : ""} impayée${register.outstanding.count > 1 ? "s" : ""}`}
                    tone="warning"
                />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Ventilation par moyen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {register.byMethod.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucun encaissement aujourd&apos;hui.
                            </p>
                        ) : (
                            register.byMethod.map((row) => (
                                <div
                                    key={row.method}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-muted-foreground">
                                        {paymentMethodLabel(row.method)}
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {formatFCFA(row.total)}
                                    </span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </section>



            <Card>
                <CardHeader>
                    <CardTitle>Impayés</CardTitle>
                    <CardDescription>
                        Commandes avec un solde restant, de la plus récente à la plus
                        ancienne.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Commande</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Reste dû</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {register.outstanding.orders.length === 0 ? (
                                <TableEmpty colSpan={5}>
                                    Tout est encaissé.
                                </TableEmpty>
                            ) : (
                                register.outstanding.orders.map((order) => {
                                    const remaining = Math.max(
                                        order.total - (order.amount_paid ?? 0),
                                        0,
                                    );
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/orders/${order.id}`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {order.order_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {order.client?.full_name ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatFCFA(order.total)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums text-orange-600">
                                                {formatFCFA(remaining)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <CollectPaymentButton
                                                    orderId={order.id}
                                                    orderNumber={order.order_number}
                                                    pressingId={pressing.id}
                                                    remaining={remaining}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Derniers encaissements</CardTitle>
                    <CardDescription>
                        Journal du jour, du plus récent au plus ancien.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Commande</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Moyen</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {register.recent.length === 0 ? (
                                <TableEmpty colSpan={5}>
                                    Aucun encaissement aujourd&apos;hui.
                                </TableEmpty>
                            ) : (
                                register.recent.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">
                                            {payment.order_number ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {payment.client_name ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {paymentMethodLabel(payment.method)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {payment.paid_at
                                                ? formatRelativeDate(payment.paid_at)
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums text-green-700">
                                            {formatFCFA(payment.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
