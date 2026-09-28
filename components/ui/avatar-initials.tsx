"use client";

import { cn } from "@/lib/utils";

/**
 * Avatar genere a partir des initiales.
 *
 * Aucune image n'est stockee pour un client : on derive donc un rond colore
 * des initiales plutot que d'afficher une image cassee. La couleur est
 * deterministe (derivee du nom), donc le meme client garde toujours la
 * meme teinte.
 */
const PALETTE = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

/** Couleur stable pour un nom donne : le meme nom donne toujours la meme. */
function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/** Initiales : premier caractere de chaque mot, 2 max. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        SIZES[size],
        colorFor(name),
        className,
      )}
      aria-hidden
      title={name}
    >
      {initialsOf(name)}
    </span>
  );
}