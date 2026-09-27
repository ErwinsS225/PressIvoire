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
  type ArticleCategory,
  type WashType,
} from "@/lib/constants";
import { articleFormSchema, fieldErrorsOf } from "@/lib/validation/catalogue";
import { cn, formatFCFA } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];

/**
 * Formulaire d'article du catalogue — creation ET edition.
 *
 * Un seul composant pour les deux ecrans : les champs, les bornes et les
 * messages d'erreur sont identiques, seules les actions diffèrent. Cela evite
 * que le formulaire de creation et celui d'edition divergent au fil du temps.
 *
 * La validation est faite des deux cotes : ici avec `articleFormSchema` pour
 * afficher le message sous le bon champ, et de nouveau dans la Server Action
 * (une Server Action ne peut pas faire confiance au client).
 */
export function ArticleForm({
  article,
  canDelete = true,
}: {
  /** Absent = creation. */
  article?: ArticleRow;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(article);

  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(article?.name ?? "");
  const [category, setCategory] = useState<string>(article?.category ?? ARTICLE_CATEGORIES.HABIT);
  const [washType, setWashType] = useState<string>(article?.wash_type ?? WASH_TYPES.SEC);
  const [price, setPrice] = useState(String(article?.price ?? 500));
  const [hours, setHours] = useState(String(article?.estimated_hours ?? 24));
  const [description, setDescription] = useState(article?.description ?? "");
  const [isActive, setIsActive] = useState(article?.is_active ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const payload = { name, category, washType, price, estimatedHours: hours, description, isActive };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = articleFormSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      toast.error("Vérifiez les champs signalés.");
      return;
    }

    setErrors({});
    startTransition(async () => {
      const result = article
        ? await updateArticle(article.id, payload)
        : await createArticle(payload);

      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
        toast.error("Vérifiez les champs signalés.");
        return;
      }
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(article ? "Article mis à jour." : "Article ajouté au catalogue.");
      router.push("/catalogue");
      router.refresh();
    });
  };

  const handleToggle = () => {
    if (!article) return;
    const next = !isActive;
    setIsActive(next);
    startTransition(async () => {
      const result = await toggleArticle(article.id, next);
      if (result.error) {
        setIsActive(!next); // on revient sur nos pas si la base a refuse
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Article remis au catalogue." : "Article masqué.");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!article) return;
    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Article supprimé.");
      router.push("/catalogue");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-5">
      <Field label="Nom de l'article" error={errors.name}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chemise"
          maxLength={120}
          className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
      </Field>

      <Field label="Catégorie" error={errors.category}>
        <ChipGroup
          options={Object.values(ARTICLE_CATEGORIES).map((value) => ({
            value,
            label: ARTICLE_CATEGORY_LABELS[value as ArticleCategory],
          }))}
          value={category}
          onChange={setCategory}
        />
      </Field>

      <Field label="Type de lavage" error={errors.washType}>
        <ChipGroup
          options={Object.values(WASH_TYPES).map((value) => ({
            value,
            label: WASH_TYPE_LABELS[value as WashType],
          }))}
          value={washType}
          onChange={setWashType}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix (FCFA)" error={errors.price}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={1000000}
            step={25}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
          />
        </Field>

        <Field label="Délai (heures)" error={errors.estimatedHours}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={336}
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
          />
        </Field>
      </div>

      {price !== "" && Number.isFinite(Number(price)) ? (
        <p className="text-xs text-slate-400">
          Aperçu : <span className="font-semibold text-slate-600">{formatFCFA(Number(price))}</span>
          {" · "}prêt sous {hours} h
        </p>
      ) : null}

      <Field label="Description (optionnel)" error={errors.description}>
        <textarea
          value={description ?? ""}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Traitement particulier, tissu délicat..."
          className="w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
      </Field>

      <button
        type="button"
        onClick={handleToggle}
        disabled={!isEdit || isPending}
        aria-pressed={isEdit && isActive}
        className={cn(
          "btn-press flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition",
          isEdit && isActive ? "border-slate-100 bg-white" : "border-amber-200 bg-amber-50",
          !isEdit && "opacity-60",
        )}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">
            {isEdit && isActive ? "Visible en caisse" : "Masqué en caisse"}
          </span>
          <span className="block text-xs text-slate-500">
            {isEdit
              ? "Touchez pour changer l'état."
              : "Un article masqué n'apparaît plus à la prise de commande."}
          </span>
        </span>
        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            isEdit && isActive ? "bg-green-500" : "bg-slate-300",
          )}
          aria-hidden
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
              isEdit && isActive ? "left-[22px]" : "left-0.5",
            )}
          />
        </span>
      </button>

      <button
        type="submit"
        disabled={isPending}
        className="btn-press w-full rounded-xl bg-orange-500 py-4 font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
      >
        {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter l'article"}
      </button>

      {isEdit && canDelete ? (
        confirmDelete ? (
          <div className="animate-scale-in space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">
              Supprimer définitivement « {article?.name} » ? Les commandes passées ne sont pas
              modifiées : elles conservent le nom et le prix appliqués.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="btn-press flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-press flex-1 rounded-lg bg-white py-2.5 text-sm font-bold text-slate-600"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-press w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            Supprimer l&apos;article
          </button>
        )
      ) : null}
    </form>
  );
}

/** Champ de formulaire : libelle, contenu, message d'erreur sous le champ. */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
      {error ? <p className="animate-fade-in text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

/** Groupe de puces a selection unique. */
function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "btn-press rounded-full px-3.5 py-2 text-xs font-semibold transition",
              selected
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
