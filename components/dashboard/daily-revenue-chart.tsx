"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA } from "@/lib/utils";

interface DailyRevenueChartProps {
    data: { label: string; shortDate: string; revenue: number }[];
}

/**
 * Graphique du chiffre d'affaires quotidien.
 *
 * ⚠ Ce composant DOIT rester client. `recharts` s'appuie sur
 * `React.createContext`, qui n'existe pas dans l'environnement React du
 * serveur : l'importer dans un Server Component fait echouer le build sur
 * `createContext is not a function`. On isole donc le graphique dans ce
 * fichier "use client", et la page ne lui passe que des donnees serialisables.
 */
export function DailyRevenueChart({ data }: DailyRevenueChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Chiffre d&apos;affaires quotidien</CardTitle>
                <CardDescription>
                    Montants encaissés, par jour de création de commande.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(0,0,0,0.05)" }}
                            formatter={(value) => formatFCFA(Number(value))}
                            labelFormatter={(label, payload) =>
                                (payload?.[0]?.payload?.shortDate as string) ?? label
                            }
                        />
                        <Bar
                            dataKey="revenue"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
