import Link from "next/link";
import { Suspense } from "react";
import { Screen, ScreenHeader } from "@/components/mobile/screen";
import { FilterChips, SearchInput } from "@/components/mobile/filters";
import { EmptyState } from "@/components/mobile/order-card";
import { StatCard } from "@/components/mobile/stat-card";
import {
  getCatalogue,
  getContext,
  groupByCategory,
  summariseCatalogue,
} from "@/lib/supabase/queries";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_LABELS,
  WASH_TYPES,
  WASH_TYPE_LABELS,
  type ArticleCategory,
  type WashType,
} from "@/lib/constants";
import { formatAmount, formatFCFA, staggerStyle } from "@/lib/utils";

export const metadata = { title: "Catalogue" };

/**
 * Gestion du catalogue : c'est ici que le gerant change ses PRIX.
 *
 * L'onboarding (Phase 2 - Etape 2) cree le catalogue une fois pour toutes ;
 * sans cet ecran, un pressing ne pourrait plus jamais ajuster sa grille
 * tarifaire apres son inscription — le seul moyen serait de modifier la base.
 *
 * L'ecran affiche aussi les articles MASQUES, qui restent gerables mais
 * n'apparaissent plus a la prise de commande (`is_active = false`).
 */
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: { q?: string; categorie?: string; lavage?: string };
}) {
  const { pressing } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Catalogue" />
      </Screen>
    );
  }

  const [articles, allArticles] = await Promise.all([
    getCatalogue(pressing.id, {
      search: searchParams.q ?? "",
      category: searchParams.categorie ?? "all",
      washType: searchParams.lavage ?? "all",
    }),
    // Second appel volontaire : les compteurs de l'en-tete doivent porter sur
    // TOUT le catalogue, pas seulement sur le resultat du filtre courant.
    // Sans cela, filtrer sur "Cuir" afficherait "12 articles" au lieu de 40.
    getCatalogue(pressing.id),
  ]);

  const summary = summariseCatalogue(allArticles);
  const groups = groupByCategory(articles);

  return (
    <Screen>
      <ScreenHeader
        title="Catalogue"
        subtitle={`${summary.active} actif${summary.active > 1 ? "s" : ""}${
          summary.inactive > 0 ? ` · ${summary.inactive} masqué${summary.inactive > 1 ? "s" : ""}` : ""
        }`}
        action={
          <Link
            href="/catalogue/nouveau"
            aria-label="Nouvel article"
            className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-light leading-none text-white shadow transition hover:bg-orange-600"
          >
            +
          </Link>
        }
      />
      <CatalogueStats
        total={summary.total}
        active={summary.active}
        minPrice={summary.minPrice}
        maxPrice={summary.maxPrice}
      />

      <CatalogueFilterBar />

      <div className="mt-5 space-y-5 px-5">
        {articles.length === 0 ? (
          <EmptyState
            icon="🧺"
            title="Aucun article"
            hint={
              searchParams.q
                ? `Aucun résultat pour « ${searchParams.q} ».`
                : "Ajoutez un article pour pouvoir le proposer en caisse."
            }
            action={
              <Link
                href="/catalogue/nouveau"
                className="btn-press inline-flex rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Ajouter un article
              </Link>
            }
          />
        ) : (
          groups.map((group, groupIndex) => (
            <section key={group.category}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                {ARTICLE_CATEGORY_LABELS[group.category as ArticleCategory] ?? group.category}
                <span className="ml-1.5 font-medium normal-case text-slate-300">
                  ({group.items.length})
                </span>
              </h2>

              <div className="space-y-2">
                {group.items.map((article, index) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    style={staggerStyle(groupIndex * 2 + index)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </Screen>
  );
}

/** Trois chiffres de tete : volume, articles actifs, amplitude des prix. */
function CatalogueStats({
  total,
  active,
  minPrice,
  maxPrice,
}: {
  total: number;
  active: number;
  minPrice: number;
  maxPrice: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      <StatCard
        index={0}
        icon="🧾"
        iconClass="bg-orange-50"
        value={total}
        label="Articles au total"
      />
      <StatCard
        index={1}
        icon="✅"
        iconClass="bg-green-50"
        value={active}
        label="Actifs en caisse"
      />
      <StatCard
        index={2}
        className="col-span-2"
        variant="plain"
        value={`${formatAmount(minPrice)} – ${formatAmount(maxPrice)}`}
        unit="FCFA"
        label="Amplitude tarifaire du catalogue"
      />
    </div>
  );
}

/**
 * Recherche + deux jeux de puces (categorie, type de lavage).
 *
 * Les composants lisent l'URL eux-memes, donc ils ont besoin d'une frontiere
 * Suspense : `useSearchParams()` force un rendu client et Next exige un repli
 * pendant l'hydratation statique.
 */
function CatalogueFilterBar() {
  return (
    <div className="mt-5 space-y-3 px-5">
      <Suspense fallback={<div className="h-12" />}>
        <SearchInput placeholder="Rechercher un article..." />
      </Suspense>

      <Suspense fallback={<div className="h-10" />}>
        <FilterChips
          paramName="categorie"
          allLabel="Toutes"
          options={Object.values(ARTICLE_CATEGORIES).map((value) => ({
            value,
            label: ARTICLE_CATEGORY_LABELS[value as ArticleCategory],
          }))}
        />
      </Suspense>

      <Suspense fallback={<div className="h-10" />}>
        <FilterChips
          paramName="lavage"
          allLabel="Tous lavages"
          options={Object.values(WASH_TYPES).map((value) => ({
            value,
            label: WASH_TYPE_LABELS[value as WashType],
          }))}
        />
      </Suspense>
    </div>
  );
}

/** Ligne d'article : nom, type de lavage, delai, prix, etat. */
function ArticleRow({
  article,
  style,
}: {
  article: {
    id: string;
    name: string;
    wash_type: string;
    price: number;
    estimated_hours: number;
    is_active: boolean;
  };
  style: React.CSSProperties;
}) {
  return (
    <Link
      href={`/catalogue/${article.id}`}
      className="stagger-item card-hover flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
      style={style}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{article.name}</p>
          {!article.is_active ? (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Masqué
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {WASH_TYPE_LABELS[article.wash_type as WashType] ?? article.wash_type}
          {" · "}
          {article.estimated_hours} h
        </p>
      </div>

      <p className="shrink-0 text-sm font-black text-slate-900">{formatFCFA(article.price)}</p>
    </Link>
  );
}

