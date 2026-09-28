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
}

const iconMap = {
    revenue: CircleDollarSign,
    orders: PackageCheck,
    pending: Clock,
    clients: Users,
    ready: PackageCheck,
};

export function StatCard({
    title,
    value,
    change,
    iconType,
    description,
}: StatCardProps) {
    const isPositive = change >= 0;
    const Icon = iconMap[iconType];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                    <span
                        className={cn(
                            "mr-1 flex items-center gap-1 font-semibold",
                            isPositive ? "text-green-600" : "text-red-600"
                        )}
                    >
                        {isPositive ? "▲" : "▼"}
                        {Math.abs(change)}%
                    </span>
                    <span>depuis le mois dernier</span>
                </div>
                {description && (
                    <p className="mt-2 text-xs text-muted-foreground">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}