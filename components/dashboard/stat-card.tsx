"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CircleDollarSign, Clock, PackageCheck, Users } from "lucide-react";

/** Les trois designs : verre dépoli, industriel sombre, dégradé doux. */
export type StatCardVariant = "glass" | "sharp" | "soft";

interface StatCardProps {
    title: string;
    value: string | number;
    change: number;
    iconType: "revenue" | "orders" | "pending" | "clients" | "ready";
    description?: string;
    /** Rang dans la cascade d'entrée (0, 1, 2…). */
    index?: number;
    variant?: StatCardVariant;
    /** Le bouton du bas devient un vrai lien (rapports, commandes…). */
    linkHref?: string;
    linkLabel?: string;
}

const iconMap = {
    revenue: CircleDollarSign,
    orders: PackageCheck,
    pending: Clock,
    clients: Users,
    ready: PackageCheck,
};

/**
 * Coquille d'icône : chaque carte garde sa couleur, y compris les deux
 * "glass" (rose→indigo pour les revenus, ciel→indigo pour les clients).
 */
const iconShell: Record<StatCardProps["iconType"], string> = {
    revenue:
        "bg-gradient-to-br from-pink-500 to-indigo-500 text-white rounded-lg shadow-sm",
    clients:
        "bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-lg shadow-sm",
    orders: "bg-cyan-400 text-[#0f172a] rounded-none",
    pending: "bg-cyan-400 text-[#0f172a] rounded-none",
    ready: "bg-white/20 text-white rounded-2xl",
};

const rootByVariant: Record<StatCardVariant, string> = {
    glass: "bg-white/40 backdrop-blur-md rounded-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-slate-900/40 dark:border-white/10",
    sharp: "bg-[#0f172a] rounded-none border-l-4 border-cyan-400 shadow-xl",
    soft: "bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-3xl shadow-lg shadow-fuchsia-200 dark:shadow-none",
};

const titleByVariant: Record<StatCardVariant, string> = {
    glass: "text-slate-800 dark:text-slate-100",
    sharp: "text-white",
    soft: "text-white",
};

const valueByVariant: Record<StatCardVariant, string> = {
    glass: "text-slate-900 dark:text-white",
    sharp: "text-white",
    soft: "text-white",
};

const mutedByVariant: Record<StatCardVariant, string> = {
    glass: "text-slate-600 dark:text-slate-400",
    sharp: "text-slate-300",
    soft: "text-white/80",
};

const buttonByVariant: Record<StatCardVariant, string> = {
    glass: "bg-white/50 hover:bg-white/80 text-slate-700 font-medium rounded-lg border border-white/40 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-100 dark:border-white/10",
    sharp: "bg-cyan-400 hover:bg-cyan-300 text-[#0f172a] font-bold rounded-none",
    soft: "bg-white/20 hover:bg-white/30 text-white font-medium rounded-2xl",
};

/**
 * Tuile d'indicateur dans l'un des trois designs, avec zoom au survol.
 *
 * Le composant reste un Client Component pour les effets "press"
 * (zoom au clic via :active). Aucun état réel, aucun coût.
 */
export function StatCard({
    title,
    value,
    change,
    iconType,
    description,
    index = 0,
    variant = "glass",
    linkHref,
    linkLabel,
}: StatCardProps) {
    const isPositive = change >= 0;
    const Icon = iconMap[iconType];
    const dark = variant !== "glass";

    return (
        <div
            className={cn(
                "zoom-card stagger-item group flex flex-col items-start p-6",
                rootByVariant[variant],
            )}
            style={{ "--stagger-index": index } as React.CSSProperties}
        >
            <div
                className={cn(
                    "zoom-icon mb-4 flex h-10 w-10 items-center justify-center",
                    iconShell[iconType],
                )}
            >
                <Icon className="h-5 w-5" />
            </div>

            <h3 className={cn("mb-1 text-base font-semibold leading-snug", titleByVariant[variant])}>
                {title}
            </h3>

            {/* `breathe` : la valeur pulse légèrement. Sur un chiffre qui
                change, l'œil est attiré sans que rien ne clignote. */}
            <div
                className={cn(
                    "breathe text-2xl font-extrabold tabular-nums",
                    valueByVariant[variant],
                )}
            >
                {value}
            </div>

            <div className={cn("zoom-delta mt-1 flex items-center text-xs", mutedByVariant[variant])}>
                <span
                    className={cn(
                        "mr-1 flex items-center gap-1 font-semibold",
                        isPositive
                            ? dark
                                ? "text-green-300"
                                : "text-green-600"
                            : dark
                              ? "text-red-300"
                              : "text-red-600",
                    )}
                >
                    {isPositive ? "▲" : "▼"}
                    {Math.abs(change)}%
                </span>
                <span>depuis le mois dernier</span>
            </div>
            {description && (
                <p className={cn("mb-6 mt-1.5 text-xs", mutedByVariant[variant])}>
                    {description}
                </p>
            )}

            {linkHref && linkLabel && (
                <Link
                    href={linkHref}
                    className={cn(
                        "mt-auto px-4 py-2 text-xs transition-colors duration-300",
                        buttonByVariant[variant],
                    )}
                >
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}