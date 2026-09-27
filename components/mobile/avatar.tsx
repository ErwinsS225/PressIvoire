import { cn } from "@/lib/utils";

/** Couleurs de degrade pour les avatars, stables selon l'initiale. */
const GRADIENTS = [
  "from-orange-400 to-orange-600",
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-emerald-400 to-emerald-600",
  "from-rose-400 to-rose-600",
  "from-cyan-400 to-cyan-600",
] as const;

/**-gradient deterministe a partir du nom : le meme client garde la meme couleur. */
function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return GRADIENTS[hash % GRADIENTS.length];
}

/** Initiales d'un nom : "Awa Koné" -> "AK", "Fatou Diallo N'Guessan" -> "FD". */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SIZES = {
  sm: "h-10 w-10 text-sm",
  md: "h-11 w-11 text-sm",
  lg: "h-12 w-12 text-base",
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
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white",
        gradientFor(name),
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
