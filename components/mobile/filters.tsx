"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Champ de recherche qui pilote l'URL (`?q=...`).
 * La saisie est anti-rebondee pour ne pas relancer une requete a chaque
 * frappe ; l'etat local garde l'affichage fluide.
 */
export function SearchInput({
  placeholder = "Rechercher...",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  const [isPending, startTransition] = useTransition();

  // Resynchronise si la navigation change l'URL (retour arriere, reset).
  useEffect(() => {
    setValue(searchParams.get(paramName) ?? "");
  }, [searchParams, paramName]);

  useEffect(() => {
    const current = searchParams.get(paramName) ?? "";
    if (value === current) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params}` : pathname, {
          scroll: false,
        });
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [value, paramName, pathname, router, searchParams]);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3">
      <span className={cn("text-slate-400", isPending && "animate-pulse")} aria-hidden>
        &#128269;
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Effacer la recherche"
          className="btn-press text-slate-400"
        >
          &times;
        </button>
      ) : null}
    </div>
  );
}

/**
 * Filtres par statut, Horizontalement defilables, refletes dans l'URL
 * (`?statut=ready`). Un Server Component peut ainsi lire `searchParams`.
 */
const FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "Reçues" },
  { value: "in_processing", label: "En traitement" },
  { value: "ready", label: "Prêtes" },
  { value: "out_for_delivery", label: "En livraison" },
  { value: "delivered", label: "Livrées" },
] as const;

export function OrderFilters() {
  return <FilterChips paramName="statut" options={[...FILTERS]} allLabel="Toutes" />;
}

/**
 * Puces de filtre generiques, pilotees par l'URL.
 *
 * Le filtre vit dans l'URL (`?categorie=cuir`) et non dans un etat local :
 * un Server Component peut alors lire `searchParams`, la vue reste
 * partageable par lien, et le bouton "retour" du navigateur fonctionne.
 *
 * `allLabel` sert a nommer la puce "tout afficher" selon le contexte
 * ("Toutes" pour des commandes, "Tous" pour des articles).
 */
export function FilterChips({
  paramName,
  options,
  allLabel = "Tout",
}: {
  paramName: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(paramName) ?? "all";
  const [isPending, startTransition] = useTransition();

  const select = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(paramName);
    else params.set(paramName, value);
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {[{ value: "all", label: allLabel }, ...options].map((option) => {
        const selected = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => select(option.value)}
            aria-pressed={selected}
            className={cn(
              "btn-press shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition",
              selected
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              isPending && selected && "opacity-70",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

