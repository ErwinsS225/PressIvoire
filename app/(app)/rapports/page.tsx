import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { DailyRevenueChart } from "@/components/dashboard/daily-revenue-chart";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    getContext,
    getReports,
    REPORT_WINDOW_DAYS,
} from "@/lib/supabase/queries";
import {
    ORDER_STATUS_LABELS,
    paymentMethodLabel,
    statusMapping,
} from "@/lib/constants";
import { formatFCFA } from "@/lib/utils";

export const metadata = { title: "Rapports" };

/**
 * Rapports d'activite sur 7 jours.
 *
 * ⚠ Le chiffre d'affaires est rattache au JOUR DE CREATION de la commande,
 * convention deja retenue par le tableau de bord — les deux ecrans affichent
 * donc le meme CA du jour, ce qui ne serait pas le cas si l'un comptait au
 * jour d'encaissement et l'autre au jour de commande.
 */
export default async function ReportsPage() {
    const { pressing } = await getContext();

    if (!pressing) {
        redirect("/onboarding/pressing");
    }

    const report = await getReports(pressing.id);
    const busiest = report.days.reduce(
        (best, day) => (day.orders > best.orders ? day : best),
        report.days[0] ?? { label: "—", orders: 0 },
    );

    return (
        <div className="flex flex-col gap-8">
            <Header
                title="Rapports"
                subtitle={`${REPORT_WINDOW_DAYS} derniers jours · ${pressing.name}`}
            />

            <section className="grid gap-4 md:grid-cols-4">
                <Kpi
                    title="Chiffre d'affaires encaissé"
                    value={formatFCFA(report.totalRevenue)}
                    detail={`${report.totalOrders} commande${report.totalOrders > 1 ? "s" : ""} sur la période`}
                />
                <Kpi
                    title="Panier moyen"
                    value={formatFCFA(report.averageBasket)}
                    detail="Par commande encaissée"
                />
                <Kpi
                    title="Reste à encaisser"
                    value={formatFCFA(report.outstanding)}
                    detail="Sur les commandes de la période"
                    tone="warning"
                />
                <Kpi
                    title="Journée la plus chargée"
                    value={String(busiest.orders)}
                    detail={`commandes le ${busiest.label.toLowerCase()}`}
                />
            </section>

            <DailyRevenueChart data={report.days} />

            <section className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Par moyen de paiement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Moyen</TableHead>
                                    <TableHead className="text-right">Nb</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.byMethod.length === 0 ? (
                                    <TableEmpty colSpan={3}>Aucun encaissement.</TableEmpty>
                                ) : (
                                    report.byMethod.map((row) => (
                                        <TableRow key={row.method}>
                                            <TableCell>
                                                {paymentMethodLabel(row.method)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-muted-foreground">
                                                {row.count}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">
                                                {formatFCFA(row.total)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Par statut</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Commandes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.byStatus.length === 0 ? (
                                    <TableEmpty colSpan={2}>Aucune commande.</TableEmpty>
                                ) : (
                                    report.byStatus.map((row) => {
                                        const status = statusMapping[row.status];
                                        return (
                                            <TableRow key={row.status}>
                                                <TableCell>
                                                    {status ? (
                                                        <Badge variant={status.variant}>
                                                            {status.label}
                                                        </Badge>
                                                    ) : (
                                                        ORDER_STATUS_LABELS[row.status] ??
                                                        row.status
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {row.count}
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
                        <CardTitle>Meilleurs clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead className="text-right">CA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.topClients.length === 0 ? (
                                    <TableEmpty colSpan={2}>Aucun client.</TableEmpty>
                                ) : (
                                    report.topClients.map((client) => (
                                        <TableRow key={client.id}>
                                            <TableCell className="font-medium">
                                                {client.full_name}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatFCFA(client.revenue)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>



            <Card>
                <CardHeader>
                    <CardTitle>Articles les plus vendus</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Article</TableHead>
                                <TableHead className="text-right">Quantité</TableHead>
                                <TableHead className="text-right">CA généré</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.topArticles.length === 0 ? (
                                <TableEmpty colSpan={3}>Aucune vente.</TableEmpty>
                            ) : (
                                report.topArticles.map((article) => (
                                    <TableRow key={article.name}>
                                        <TableCell className="font-medium">
                                            {article.name}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">
                                            {article.quantity}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatFCFA(article.revenue)}
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
                            ? "text-2xl font-bold text-orange-600"
                            : "text-2xl font-bold"
                    }
                >
                    {value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    );
}
