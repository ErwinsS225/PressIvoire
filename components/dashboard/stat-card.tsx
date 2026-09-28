"use client";

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CircleDollarSign, Clock, PackageCheck, Users } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    change: number;
    iconType: "revenue" | "orders" | "pending" | "clients" | "ready";
    description?: string;
    /** Rang dans la cascade d'entrée (0, 1, 2…). */
    index?: number;
}

const iconMap = {
    revenue: CircleDollarSign,
    orders: PackageCheck,
    pending: Clock,
    clients: Users,
    ready: PackageCheck,
};

/**
 * Tuile d'indicateur, avec profondeur par ombre portée.
 *
 * Le composant est un Client Component sans aucun état : il ne l'est que
 * pour que la classe `elev-1` soit composée au bon moment. Aucun coût réel.
 */
export function StatCard({
    title,
    value,
    change,
    iconType,
    description,
    index = 0,
}: StatCardProps) {
    const isPositive = change >= 0;
    const Icon = iconMap[iconType];

    return (
        <Card
            className="elev-1 elev-1--accent stagger-item overflow-hidden border-0"
            style={{ "--stagger-index": index } as React.CSSProperties}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700/10 text-brand-700">
                    <Icon className="h-4 w-4" />
                </span>
            </CardHeader>
            <CardContent>
                {/* `breathe` : la valeur pulse legerement. Sur un chiffre qui
                    change, l'oeil est attire sans que rien ne clignote. */}
                <div className="breathe text-2xl font-bold tabular-nums">
                    {value}
                </div>
                <div className="mt-1 flex items-center text-xs text-muted-foreground">
                    <span
                        className={cn(
                            "mr-1 flex items-center gap-1 font-semibold",
                            isPositive ? "text-green-600" : "text-red-600",
                        )}
                    >
                        {isPositive ? "▲" : "▼"}
                        {Math.abs(change)}%
                    </span>
                    <span>depuis le mois dernier</span>
                </div>
                {description && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}