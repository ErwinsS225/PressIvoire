"use client";

import * as React from "react";
import { Tooltip as RechartsTooltip } from "recharts";

import { cn } from "@/lib/utils";

/*
 * Graphiques — conteneur + infobulle (style shadcn/ui « chart »).
 *
 * Le conteneur expose la config au tooltip via un contexte React, et injecte
 * une variable CSS `--color-<clé>` par entrée colorée : les barres pointent
 * sur `var(--color-<clé>)`, ce qui permet au thème sombre de changer les
 * couleurs sans re-rendu.
 */
export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
        color?: string;
    }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useConfig() {
    const context = React.useContext(ChartContext);
    if (!context) {
        throw new Error("Les composants graphique doivent être rendus dans un <ChartContainer>.");
    }
    return context;
}

/** Injecte `--color-<clé>` pour chaque entrée de config déclarant une couleur. */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
    const colorConfig = Object.entries(config).filter(([, entry]) => entry.color);
    if (colorConfig.length === 0) {
        return null;
    }

    const css = colorConfig.map(([key, entry]) => `--color-${key}: ${entry.color};`).join("\n      ");

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: `
      [data-chart=${id}] {
        ${css}
      }
    `,
            }}
        />
    );
}

export const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { config: ChartConfig }
>(({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

    return (
        <ChartContext.Provider value={config}>
            <div
                ref={ref}
                data-chart={chartId}
                className={cn(
                    "flex w-full justify-center text-xs",
                    "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
                    "[&_.recharts-cartesian-grid-horizontal_line]:stroke-border",
                    className,
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                {children}
            </div>
        </ChartContext.Provider>
    );
});
ChartContainer.displayName = "ChartContainer";

/** Infobulle recharts — réexportée pour que l'appelant n'importe pas recharts. */
const ChartTooltip = RechartsTooltip;

type ChartTooltipPayloadItem = {
    name?: string | number;
    value?: number | string;
    dataKey?: string | number;
    color?: string;
    fill?: string;
};

export type ChartTooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean;
    payload?: ChartTooltipPayloadItem[];
    label?: React.ReactNode;
    /** Forme du marqueur : point (défaut), tiret, ou trait. */
    indicator?: "line" | "dot" | "dash";
    hideLabel?: boolean;
    hideIndicator?: boolean;
    labelFormatter?: (label: unknown, payload: ChartTooltipPayloadItem[]) => React.ReactNode;
    formatter?: (
        value: unknown,
        name: unknown,
        item: ChartTooltipPayloadItem,
        index: number,
        payload: ChartTooltipPayloadItem[],
    ) => React.ReactNode;
};

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
    (
        {
            active,
            payload,
            label,
            className,
            indicator = "dot",
            hideLabel = false,
            hideIndicator = false,
            labelFormatter,
            formatter,
        },
        ref,
    ) => {
        const config = useConfig();

        if (!active || !payload?.length) {
            return null;
        }

        const renderedLabel =
            labelFormatter && label != null ? labelFormatter(label, payload) : label;

        return (
            <div
                ref={ref}
                className={cn(
                    "grid min-w-[8rem] items-start gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md",
                    className,
                )}
            >
                {!hideLabel && renderedLabel != null && (
                    <div className="text-muted-foreground">{renderedLabel}</div>
                )}
                <div className="grid gap-1.5">
                    {payload.map((item, index) => {
                        const key = `${item.dataKey ?? item.name ?? "value"}-${index}`;
                        const entry =
                            item.dataKey != null ? config[String(item.dataKey)] : undefined;
                        const name = entry?.label ?? item.name;
                        const value =
                            formatter != null
                                ? formatter(item.value, item.name, item, index, payload)
                                : item.value;
                        const markerColor = item.color ?? item.fill;

                        return (
                            <div key={key} className="flex w-full items-center gap-2">
                                {!hideIndicator && (
                                    <span
                                        aria-hidden
                                        className={cn(
                                            indicator === "line" && "h-0.5 w-4 rounded-full",
                                            indicator === "dot" && "size-2 rounded-[2px]",
                                            indicator === "dash" && "size-2 rounded-[2px] border",
                                        )}
                                        style={{
                                            backgroundColor:
                                                indicator === "dash" ? undefined : markerColor,
                                            borderColor: indicator === "dash" ? markerColor : undefined,
                                        }}
                                    />
                                )}
                                <span className="flex-1 truncate text-muted-foreground">
                                    {name}
                                </span>
                                {value != null && (
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {value}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartTooltip, ChartTooltipContent };
