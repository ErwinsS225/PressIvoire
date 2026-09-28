"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

/**
 * Barre de filtres du catalogue.
 *
 * Les filtres vivent dans l'URL (`?q=…&categorie=cuir`) et non dans un etat
 * local : la page reste partageable par lien, le bouton "retour" du
 * navigateur fonctionne, et le Server Component peut lire `searchParams`.
 *
 * La recherche est differee (300 ms) : sans cela, chaque frappe re-rendait la
 * page — donc re-interrogeait Supabase — pour un resultat identique au
 * caractere precedent.
 */
export function CatalogueFilters({
    categories,
    washTypes,
    allLabel = "Toutes",
}: {
    categories: { value: string; label: string }[];
    washTypes: { value: string; label: string }[];
    allLabel?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    const urlQuery = searchParams.get("q") ?? "";
    const [value, setValue] = useState(urlQuery);

    // Resynchronise le champ quand l'URL change depuis l'exterieur (retour
    // arriere, clic sur un lien de tri) : sans cet effet, le champ garde la
    // frappe de l'utilisateur alors que le filtre ne correspond plus.
    useEffect(() => {
        setValue(urlQuery);
    }, [urlQuery]);

    /*
     * Recherche differee.
     *
     * On compare `value` a la valeur deja appliquee dans l'URL : sans cet
     * etat, le premier rendu apres le retour arriere reprogrammerait une
     * navigation identique a celle qu'on vient d'annuler.
     */
    const applied = useRef(urlQuery);
    useEffect(() => {
        if (value === applied.current) return;

        const timer = setTimeout(() => {
            applied.current = value;
            const params = new URLSearchParams(searchParams.toString());
            if (!value) params.delete("q");
            else params.set("q", value);
            startTransition(() => {
                router.replace(
                    `${pathname}${params.toString() ? `?${params.toString()}` : ""}`,
                    { scroll: false },
                );
            });
        }, 300);

        // Annule le minuteur si l'utilisateur continue de taper : une seule
        // requete sera emise, pour le dernier etat.
        return () => clearTimeout(timer);
    }, [value, pathname, router, searchParams]);

    function updateParam(key: string, next: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (!next || next === "all") params.delete(key);
        else params.set(key, next);
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }

    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    value={value}
                    placeholder="Rechercher un article…"
                    onChange={(event) => setValue(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                />
            </div>

            <select
                aria-label="Catégorie"
                value={searchParams.get("categorie") ?? "all"}
                onChange={(event) => updateParam("categorie", event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
                <option value="all">{allLabel} (catégories)</option>
                {categories.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            <select
                aria-label="Type de lavage"
                value={searchParams.get("lavage") ?? "all"}
                onChange={(event) => updateParam("lavage", event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
                <option value="all">{allLabel} (lavages)</option>
                {washTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}