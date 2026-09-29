"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import {
    ArrowDownToLineIcon,
    FileJsonIcon,
    MoreHorizontalIcon,
    RefreshCwIcon,
    SettingsIcon,
    Share2Icon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportChartPng, exportRevenueCsv, revenueFileBase } from "@/lib/chart-export";
import { formatFCFA } from "@/lib/utils";

interface RevenueChartProps {
    data: { month: string; revenue: number }[];
    /** Revenus des 30 derniers jours + variation vs mois précédent. */
    revenue: { total: number; change: number };
    /** Nombre de commandes du mois — sert au panier moyen. */
    ordersCount: number;
}

const chartConfig: ChartConfig = {
    revenue: {
        label: "Revenus",
        // Les variables `--chart-N` sont déclarées en HSL brut (« 221 83% 53% ») :
        // sans le wrapper `hsl()`, la couleur résolue est invalide et recharts
        // retomberait sur du noir. Même motif que `hsl(var(--primary))` ailleurs.
        color: "hsl(var(--chart-1))",
    },
};

/** 245000 -> "245 k" (l'axe a 40 px de large, le format FCFA complet déborde). */
const compactFCFA = (value: number) =>
    `${new Intl.NumberFormat("fr-FR", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value)}`;

export function RevenueChart({ data, revenue, ordersCount }: RevenueChartProps) {
    const router = useRouter();

    const averageOrder = ordersCount > 0 ? Math.round(revenue.total / ordersCount) : 0;

    /** Conteneur du graphique — source du SVG à rasteriser pour l'export PNG. */
    const chartRef = useRef<HTMLDivElement>(null);

    const handleRefresh = () => {
        // Re-fetch serveur : la page est un Server Component, refresh()
        // re-exécute getDashboardData() sans recharger la page.
        router.refresh();
    };

    const handleDownloadPng = async () => {
        if (!chartRef.current) return;
        try {
            await exportChartPng(chartRef.current, `${revenueFileBase()}.png`);
            toast.success("Graphique exporté en PNG");
        } catch {
            toast.error("Impossible d'exporter le graphique en PNG");
        }
    };

    const handleDownloadCsv = () => {
        try {
            exportRevenueCsv(data, `${revenueFileBase()}.csv`);
            toast.success("Données exportées en CSV");
        } catch {
            toast.error("Impossible d'exporter les données en CSV");
        }
    };

    return (
        <Card
            className="elev-1 zoom-card zoom-card--panel stagger-item group border-0"
            style={{ "--stagger-index": 4 } as React.CSSProperties}
        >
            <CardHeader>
                <CardTitle>Chiffre d&apos;affaires</CardTitle>
                <CardDescription>Revenus mensuels sur les 12 derniers mois.</CardDescription>
                <CardAction className="mt-3">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Actualiser"
                        onClick={handleRefresh}
                    >
                        <RefreshCwIcon />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Télécharger le graphique en PNG"
                        onClick={handleDownloadPng}
                    >
                        <ArrowDownToLineIcon />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon-sm">
                                <MoreHorizontalIcon />
                                <span className="sr-only">Ouvrir le menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Options</DropdownMenuLabel>
                                <DropdownMenuItem>
                                    <SettingsIcon />
                                    <span>Configurer</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleRefresh}>
                                    <RefreshCwIcon />
                                    <span>Actualiser les données</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadPng}>
                                    <ArrowDownToLineIcon />
                                    <span>Exporter en PNG</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadCsv}>
                                    <FileJsonIcon />
                                    <span>Exporter en CSV</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Share2Icon />
                                    <span>Partager</span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardAction>
                <div className="mt-4 flex items-center gap-6">
                    <div className="space-y-1.5">
                        <p className="text-muted-foreground text-sm font-medium">
                            Revenus (30j)
                        </p>
                        <p className="text-lg leading-none font-semibold sm:text-2xl">
                            {formatFCFA(revenue.total)}
                        </p>
                    </div>
                    <div className="bg-border h-10 w-px"></div>
                    <div className="space-y-1.5">
                        <p className="text-muted-foreground text-sm font-medium whitespace-nowrap">
                            Panier moyen
                        </p>
                        <p className="text-lg leading-none font-semibold sm:text-2xl">
                            {averageOrder > 0 ? formatFCFA(averageOrder) : "—"}
                        </p>
                    </div>
                    <div className="bg-border h-10 w-px"></div>
                    <div className="space-y-1.5">
                        <p className="text-muted-foreground text-sm font-medium whitespace-nowrap">
                            Variation
                        </p>
                        <p
                            className={
                                revenue.change >= 0
                                    ? "text-lg leading-none font-semibold text-green-600 sm:text-2xl"
                                    : "text-lg leading-none font-semibold text-red-600 sm:text-2xl"
                            }
                        >
                            {revenue.change >= 0 ? "+" : ""}
                            {revenue.change}%
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-2 pt-4 sm:pl-6">
                <ChartContainer
                    ref={chartRef}
                    config={chartConfig}
                    className="aspect-auto h-[260px] w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={4}
                                width={40}
                                tickFormatter={(value) => compactFCFA(Number(value))}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        className="rounded-md shadow-none"
                                        formatter={(value) => formatFCFA(Number(value))}
                                        indicator="dot"
                                    />
                                }
                            />
                            <Bar
                                dataKey="revenue"
                                fill="var(--color-revenue)"
                                radius={[6, 6, 0, 0]}
                                className="stroke-background"
                                strokeWidth={3}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}