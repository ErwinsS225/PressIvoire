import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CatalogueFilters } from "@/components/catalogue/filters";
import { getCatalogue, getContext } from "@/lib/supabase/queries";
import {
    ARTICLE_CATEGORIES,
    ARTICLE_CATEGORY_LABELS,
    WASH_TYPES,
    WASH_TYPE_LABELS,
} from "@/lib/constants";
import { formatFCFA } from "@/lib/utils";

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
        redirect("/onboarding/pressing");
    }

    const [articles, allArticles] = await Promise.all([
        getCatalogue(pressing.id, {
            search: searchParams.q ?? "",
            category: searchParams.categorie ?? "all",
            washType: searchParams.lavage ?? "all",
        }),
        // Second appel volontaire : les compteurs de l'en-tete doivent porter
        // sur TOUT le catalogue, pas seulement sur le resultat du filtre.
        // Sans cela, filtrer sur "Cuir" afficherait "12 articles" au lieu de 40.
        getCatalogue(pressing.id),
    ]);

    const active = allArticles.filter((a) => a.is_active).length;
    const hidden = allArticles.length - active;



    return (
        <div className="flex flex-col gap-8">
            <Header
                title="Catalogue"
                subtitle={`${active} article${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""}${hidden > 0 ? ` · ${hidden} masqué${hidden > 1 ? "s" : ""}` : ""}`}
            >
                <Button asChild>
                    <Link href="/catalogue/nouveau">Nouvel article</Link>
                </Button>
            </Header>

            <CatalogueFilters
                categories={Object.values(ARTICLE_CATEGORIES).map((value) => ({
                    value,
                    label: ARTICLE_CATEGORY_LABELS[value],
                }))}
                washTypes={Object.values(WASH_TYPES).map((value) => ({
                    value,
                    label: WASH_TYPE_LABELS[value],
                }))}
                allLabel="Tous"
            />

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Article</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Lavage</TableHead>
                                <TableHead className="text-right">Délai</TableHead>
                                <TableHead className="text-right">Prix</TableHead>
                                <TableHead className="text-right">État</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {articles.length === 0 ? (
                                <TableEmpty colSpan={6}>
                                    {searchParams.q
                                        ? `Aucun résultat pour « ${searchParams.q} ».`
                                        : "Ajoutez un article pour pouvoir le proposer en caisse."}
                                </TableEmpty>
                            ) : (
                                articles.map((article) => (
                                    <TableRow key={article.id}>
                                        <TableCell>
                                            <Link
                                                href={`/catalogue/${article.id}`}
                                                className="font-medium hover:underline"
                                            >
                                                {article.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {ARTICLE_CATEGORY_LABELS[
                                                article.category as keyof typeof ARTICLE_CATEGORY_LABELS
                                            ] ?? article.category}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {WASH_TYPE_LABELS[
                                                article.wash_type as keyof typeof WASH_TYPE_LABELS
                                            ] ?? article.wash_type}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">
                                            {article.estimated_hours} h
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">
                                            {formatFCFA(article.price)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {article.is_active ? (
                                                <Badge variant="success">Actif</Badge>
                                            ) : (
                                                <Badge variant="muted">Masqué</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
