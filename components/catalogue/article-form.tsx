"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
    createArticle,
    deleteArticle,
    toggleArticle,
    updateArticle,
} from "@/app/actions/catalogue";
import {
    ARTICLE_CATEGORIES,
    ARTICLE_CATEGORY_LABELS,
    WASH_TYPES,
    WASH_TYPE_LABELS,
} from "@/lib/constants";
import { articleFormSchema, fieldErrorsOf } from "@/lib/validation/catalogue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/supabase/types";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];

const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/** Champ de formulaire : libelle, controle, message d'erreur. */
function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}

/**
 * Formulaire d'article du catalogue — creation ET edition.
 *
 * Un seul composant pour les deux ecrans : champs, bornes et messages sont
 * identiques, seules les Server Actions appelees differentent.
 *
 * La validation est faite des deux cotes : ici avec `articleFormSchema` pour
 * afficher le message sous le bon champ, et de nouveau dans la Server Action —
 * une Server Action est un point d'entree HTTP, elle ne peut pas faire
 * confiance au client.
 */
export function ArticleForm({
    article,
    canEdit = true,
}: {
    /** Absent = creation. */
    article?: ArticleRow;
    /**
     * L'utilisateur peut-il enregistrer ?
     *
     * `false` pour un caissier : la policy « articles: modification par l'admin
     * du pressing » lui refuse l'ecriture. Les champs sont alors desactives et
     * les boutons d'action masques — la CREATION, elle, reste ouverte a tout le
     * personnel. C'est le pendant visuel de `requireAdmin()` (lib/guards.ts).
     */
    canEdit?: boolean;
}) {
    const router = useRouter();
    const isEdit = Boolean(article);

    const [isPending, startTransition] = useTransition();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [name, setName] = useState(article?.name ?? "");
    const [category, setCategory] = useState<string>(
        article?.category ?? ARTICLE_CATEGORIES.HABIT,
    );
    const [washType, setWashType] = useState<string>(
        article?.wash_type ?? WASH_TYPES.SEC,
    );
    const [price, setPrice] = useState(String(article?.price ?? 500));
    const [hours, setHours] = useState(String(article?.estimated_hours ?? 24));
    const [description, setDescription] = useState(article?.description ?? "");
    const [isActive, setIsActive] = useState(article?.is_active ?? true);

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        // Double garde : les boutons sont masques, mais le formulaire peut
        // encore etre soumis au clavier (Entree depuis un champ).
        if (!canEdit) return;
        setErrors({});

        const parsed = articleFormSchema.safeParse({
            name,
            category,
            washType,
            price,
            estimatedHours: hours,
            description,
            isActive,
        });

        if (!parsed.success) {
            setErrors(fieldErrorsOf(parsed.error));
            return;
        }

        startTransition(async () => {
            try {
                if (article) {
                    await updateArticle(article.id, parsed.data);
                    toast.success("Article mis à jour.");
                } else {
                    await createArticle(parsed.data);
                    toast.success("Article ajouté au catalogue.");
                }
                router.push("/catalogue");
                router.refresh();
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : "Enregistrement impossible.",
                );
            }
        });
    }

    function handleToggle() {
        if (!article || !canEdit) return;
        startTransition(async () => {
            try {
                await toggleArticle(article.id, !isActive);
                setIsActive(!isActive);
                toast.success(isActive ? "Article masqué." : "Article réactivé.");
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Action impossible.");
            }
        });
    }

    function handleDelete() {
        if (!article || !canEdit) return;
        startTransition(async () => {
            try {
                await deleteArticle(article.id);
                toast.success("Article supprimé.");
                router.push("/catalogue");
                router.refresh();
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : "Suppression impossible.",
                );
            }
        });
    }


    return (
        <form onSubmit={handleSubmit} className="max-w-2xl">
            <Card>
                <CardContent className="grid gap-6 pt-6">
                    {/*
                     * Lecture seule : on dit POURQUOI plutot que de laisser des
                     * champs grises sans explication. Meme formulation que le
                     * refus renvoye par `requireAdmin()` cote serveur.
                     */}
                    {!canEdit ? (
                        <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                            Seul un gérant ou un responsable peut modifier le
                            catalogue. Les champs sont affichés en lecture seule.
                        </p>
                    ) : null}

                    <Field id="name" label="Nom de l'article" error={errors.name}>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex. Chemise en coton"
                            disabled={!canEdit}
                        />
                    </Field>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Field id="category" label="Catégorie">
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                disabled={!canEdit}
                                className={selectClass}
                            >
                                {Object.values(ARTICLE_CATEGORIES).map((value) => (
                                    <option key={value} value={value}>
                                        {ARTICLE_CATEGORY_LABELS[value]}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field id="washType" label="Type de lavage">
                            <select
                                id="washType"
                                value={washType}
                                onChange={(e) => setWashType(e.target.value)}
                                disabled={!canEdit}
                                className={selectClass}
                            >
                                {Object.values(WASH_TYPES).map((value) => (
                                    <option key={value} value={value}>
                                        {WASH_TYPE_LABELS[value]}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field id="price" label="Prix (FCFA)" error={errors.price}>
                            <Input
                                id="price"
                                type="number"
                                min={0}
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                disabled={!canEdit}
                            />
                        </Field>

                        <Field
                            id="estimatedHours"
                            label="Délai (heures)"
                            error={errors.estimatedHours}
                        >
                            <Input
                                id="estimatedHours"
                                type="number"
                                min={1}
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                disabled={!canEdit}
                            />
                        </Field>
                    </div>


                    <Field id="description" label="Description" error={errors.description}>
                        <textarea
                            id="description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!canEdit}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </Field>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            disabled={!canEdit}
                            className="h-4 w-4 rounded border-input"
                        />
                        Article actif (visible à la prise de commande)
                    </label>

                    <div className="flex flex-wrap gap-2 border-t pt-6">
                        {canEdit ? (
                            <Button type="submit" disabled={isPending}>
                                {isPending
                                    ? "Enregistrement…"
                                    : isEdit
                                      ? "Enregistrer les modifications"
                                      : "Ajouter au catalogue"}
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/catalogue")}
                        >
                            Annuler
                        </Button>

                        {isEdit && canEdit ? (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={isPending}
                                onClick={handleToggle}
                            >
                                {isActive ? "Masquer" : "Réactiver"}
                            </Button>
                        ) : null}

                        {isEdit && canEdit ? (
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isPending}
                                onClick={handleDelete}
                            >
                                Supprimer
                            </Button>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
