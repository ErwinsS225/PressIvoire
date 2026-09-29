"use client";

import { useMemo, useState } from "react";
import { useOnboardingStore } from "@/lib/stores/onboarding";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_LABELS,
  WASH_TYPES,
  WASH_TYPE_LABELS,
  type ArticleCategory,
  type WashType,
} from "@/lib/constants";
import { formatAmount } from "@/lib/utils";

const WASH_LIST = Object.values(WASH_TYPES);
const CATEGORY_LIST = Object.values(ARTICLE_CATEGORIES);

/**
 * Catalogue editable de l'etape 2 : ajouter, modifier, desactiver, retirer.
 *
 * ## Les trois bugs que cet editeur a eus
 *
 * 1. Le champ de nom etait un `<input value="">` en dur. Un composant React
 *    controle qui recoit toujours `""` ne peut rien afficher : la frappe
 *    declenchait bien une mise a jour, mais le rendu repartait de zero.
 *    **On ne pouvait pas nommer un article.**
 *
 * 2. La cle de rendu valait `${name}-${washType}-${index}`. Comme elle change a
 *    chaque frappe, React demonte puis remonte le champ : le focus etait perdu
 *    des le second caractere. La cle est desormais le `clientId`, stable.
 *
 * 3. Une ligne ajoutee naissait `isActive: false`, alors que le filtre par
 *    defaut masquait les inactifs : **le bouton « Ajouter » semblait ne rien
 *    faire**. Les lignes naissent actives et visibles.
 *
 * Le nom reste desormais toujours saisi dans un champ, et plus affiche en
 * texte fige des qu'il est renseigne : c'etait la seule facon de corriger une
 * faute de frappe.
 */
export function CatalogueEditor({ errors }: { errors: Record<string, string> }) {
  const articles = useOnboardingStore((state) => state.step2.articles);
  const addArticle = useOnboardingStore((state) => state.addArticle);
  const updateArticle = useOnboardingStore((state) => state.updateArticle);
  const removeArticle = useOnboardingStore((state) => state.removeArticle);

  const [filter, setFilter] = useState<WashType | "all">("all");
  const [showInactive, setShowInactive] = useState(true);

  const visible = useMemo(
    () =>
      articles.filter(
        (article) =>
          (filter === "all" || article.washType === filter) &&
          (showInactive || article.isActive),
      ),
    [articles, filter, showInactive],
  );

  const active = articles.filter((article) => article.isActive);
  const activeSum = active.reduce(
    (sum, article) => sum + (Number.isFinite(article.price) ? article.price : 0),
    0,
  );

  const onAdd = () => {
    addArticle();
    // On revient sur la liste complete : la ligne neuve est active, mais le
    // filtre courant pourrait la cacher.
    setFilter("all");
    setShowInactive(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Votre catalogue</h2>
            <p className="mt-1 text-xs text-slate-500">
              {active.length} article{active.length > 1 ? "s" : ""} actif
              {active.length > 1 ? "s" : ""} sur {articles.length}. Ajustez les prix du
              marché ivoirien ou désactivez ce que vous ne proposez pas.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
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
            {(["all", ...WASH_LIST] as const).map((key) => (
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
          const blank = article.name.trim().length === 0;
          return (
            <li
              // Cle STABLE : `clientId` ne change jamais pour une ligne donnee,
              // contrairement a son contenu.
              key={article.clientId}
              className={`flex flex-wrap items-center gap-3 p-3 ${
                article.isActive ? "" : "bg-slate-50/60"
              }`}
            >
              <input
                type="checkbox"
                checked={article.isActive}
                onChange={(event) =>
                  updateArticle(article.clientId, { isActive: event.target.checked })
                }
                aria-label={`Activer ${article.name || "cet article"}`}
                className="h-4 w-4 shrink-0 rounded border-slate-300"
              />

              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  // La valeur vient de l'etat : c'etait precisement ce qui
                  // manquait. En dur a `""`, le champ etait coupe de la saisie.
                  value={article.name}
                  onChange={(event) =>
                    updateArticle(article.clientId, { name: event.target.value })
                  }
                  placeholder="Nom de l'article"
                  aria-label="Nom de l'article"
                  aria-invalid={blank}
                  className={`h-8 w-full rounded border px-2 text-sm text-slate-900 ${
                    blank
                      ? "border-dashed border-amber-400 bg-amber-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                />

                {blank ? (
                  <p className="mt-1 text-[11px] font-medium text-amber-700">
                    Nommez cet article pour pouvoir continuer.
                  </p>
                ) : null}

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <select
                    value={article.washType}
                    onChange={(event) =>
                      updateArticle(article.clientId, {
                        washType: event.target.value as WashType,
                      })
                    }
                    aria-label="Type de lavage"
                    className="h-7 rounded border border-slate-200 bg-white px-1 text-[11px] text-slate-700"
                  >
                    {WASH_LIST.map((type) => (
                      <option key={type} value={type}>
                        {WASH_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={article.category}
                    onChange={(event) =>
                      updateArticle(article.clientId, {
                        category: event.target.value as ArticleCategory,
                      })
                    }
                    aria-label="Categorie"
                    className="h-7 rounded border border-slate-200 bg-white px-1 text-[11px] text-slate-700"
                  >
                    {CATEGORY_LIST.map((category) => (
                      <option key={category} value={category}>
                        {ARTICLE_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1 text-[11px] text-slate-500">
                    Délai
                    <input
                      type="number"
                      min={1}
                      max={336}
                      value={article.estimatedHours}
                      onChange={(event) =>
                        updateArticle(article.clientId, {
                          estimatedHours: Number.parseInt(event.target.value, 10) || 1,
                        })
                      }
                      aria-label="Délai en heures"
                      className="h-7 w-14 rounded border border-slate-200 bg-white px-1 text-right text-[11px] text-slate-900"
                    />
                    h
                  </label>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={article.price}
                  onChange={(event) =>
                    updateArticle(article.clientId, {
                      price: Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                    })
                  }
                  aria-label={`Prix de ${article.name || "cet article"}`}
                  className="h-8 w-20 rounded border border-slate-200 bg-white px-2 text-right text-xs text-slate-900"
                />
                <span className="text-[10px] text-slate-400">FCFA</span>
                <button
                  type="button"
                  onClick={() => removeArticle(article.clientId)}
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
          {articles.length === 0
            ? "Aucun article pour l'instant. Ajoutez le premier, ou revenez en arrière pour charger le catalogue proposé."
            : "Aucun article ne correspond à ce filtre."}
        </p>
      ) : null}

      <div className="border-t border-slate-100 p-3 text-xs text-slate-500">
        Somme des prix unitaires actifs :{" "}
        <span className="font-bold text-slate-900">
          {formatAmount(activeSum)} FCFA
        </span>
      </div>
    </div>
  );
}

