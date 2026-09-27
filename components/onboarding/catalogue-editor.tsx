"use client";

import { useMemo, useState } from "react";
import { useOnboardingStore } from "@/lib/stores/onboarding";
import { ARTICLE_CATEGORY_LABELS, WASH_TYPE_LABELS, type WashType } from "@/lib/constants";
import { formatAmount } from "@/lib/utils";
import type { CatalogArticle } from "@/lib/validation/onboarding";

/**
 * Tableau de catalogue editable : modifier les prix, desactiver un article,
 * en ajouter un.
 *
 * Les prix sont saisis en FCFA et stockes en nombre entier, comme la colonne
 * `articles.price`.
 */
export function CatalogueEditor({ errors }: { errors: Record<string, string> }) {
  const articles = useOnboardingStore((state) => state.step2.articles);
  const setStep2 = useOnboardingStore((state) => state.setStep2);
  const [filter, setFilter] = useState<WashType | "all">("all");
  const [showInactive, setShowInactive] = useState(false);

  const visible = useMemo(
    () =>
      articles.filter(
        (article) =>
          (filter === "all" || article.washType === filter) &&
          (showInactive || article.isActive),
      ),
    [articles, filter, showInactive],
  );

  const activeCount = articles.filter((article) => article.isActive).length;

  const update = (index: number, patch: Partial<CatalogArticle>) => {
    const next = [...articles];
    next[index] = { ...next[index], ...patch };
    setStep2({ articles: next });
  };

  const addArticle = () => {
    setStep2({
      articles: [
        ...articles,
        {
          name: "",
          category: "habit",
          washType: "eau",
          price: 1000,
          estimatedHours: 24,
          sortOrder: (articles.at(-1)?.sortOrder ?? 0) + 10,
          isActive: false,
        },
      ],
    });
  };

  const remove = (index: number) => {
    setStep2({ articles: articles.filter((_, i) => i !== index) });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Votre catalogue</h2>
            <p className="mt-1 text-xs text-slate-500">
              {activeCount} article{activeCount > 1 ? "s" : ""} actif
              {activeCount > 1 ? "s" : ""} sur {articles.length}. Ajustez les prix du
              marché ivoirien ou désactivez ce que vous ne proposez pas.
            </p>
          </div>
          <button
            type="button"
            onClick={addArticle}
            className="btn-press rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            + Ajouter un article
          </button>
        </div>

        {errors.articles ? (
          <p className="mt-2 text-xs font-medium text-destructive">{errors.articles}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {(["all", "sec", "eau", "repassage_seul", "detachage"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`btn-press shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  filter === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {key === "all" ? "Tous" : WASH_TYPE_LABELS[key]}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Voir les articles désactivés
          </label>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {visible.map((article) => {
          // Index dans le tableau COMPLET : l'edition doit viser le bon element
          // meme quand un filtre est actif.
          const index = articles.indexOf(article);
          return (
            <li
              key={`${article.name}-${article.washType}-${index}`}
              className={`flex items-center gap-3 p-3 ${article.isActive ? "" : "bg-slate-50/60"}`}
            >
              <input
                type="checkbox"
                checked={article.isActive}
                onChange={(event) => update(index, { isActive: event.target.checked })}
                aria-label={`Activer ${article.name || "cet article"}`}
                className="h-4 w-4 shrink-0 rounded border-slate-300"
              />

              <div className="min-w-0 flex-1">
                {article.name ? (
                  <>
                    <p className="truncate text-sm font-medium text-slate-900">
                      {article.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {WASH_TYPE_LABELS[article.washType]} &middot;{" "}
                      {ARTICLE_CATEGORY_LABELS[article.category]} &middot;{" "}
                      {article.estimatedHours} h
                    </p>
                  </>
                ) : (
                  <input
                    type="text"
                    value=""
                    onChange={(event) => update(index, { name: event.target.value })}
                    placeholder="Nom de l'article"
                    aria-label="Nom de l'article"
                    className="h-8 w-full rounded border border-dashed border-slate-300 px-2 text-sm"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={article.price}
                  onChange={(event) =>
                    update(index, { price: Number.parseInt(event.target.value, 10) || 0 })
                  }
                  aria-label={`Prix de ${article.name || "cet article"}`}
                  className="h-8 w-20 rounded border border-slate-200 px-2 text-right text-xs"
                />
                <span className="text-[10px] text-slate-400">FCFA</span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Supprimer ${article.name || "cet article"}`}
                  className="btn-press ml-1 text-slate-300 hover:text-red-500"
                >
                  &times;
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400">
          Aucun article ne correspond à ce filtre.
        </p>
      ) : null}

      <div className="border-t border-slate-100 p-3 text-xs text-slate-500">
        Somme des prix unitaires actifs :{" "}
        <span className="font-bold text-slate-900">
          {formatAmount(
            articles.filter((a) => a.isActive).reduce((sum, a) => sum + a.price, 0),
          )}{" "}
          FCFA
        </span>
      </div>
    </div>
  );
}

