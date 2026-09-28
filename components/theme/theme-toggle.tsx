"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

/**
 * Bascule de thème.
 *
 * Le rendu du bouton est volontairement neutre avant que le thème ne soit
 * connu (`mounted === false`) : afficher « Sombre » sur une machine déjà en
 * sombre ferait clignoter l'icône au chargement. On rend donc un squelette
 * de même taille — pas de décalage de mise en page.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div
        className={cn("h-10 w-[7.5rem] rounded-md bg-secondary", className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Thème de l'interface"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border bg-secondary p-1",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
