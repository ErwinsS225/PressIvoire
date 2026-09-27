import { ListScreenSkeleton } from "@/components/mobile/skeleton";

/**
 * Repli de chargement du catalogue.
 *
 * Next affiche ce composant des que la navigation vers /catalogue commence,
 * avant meme que la requete Supabase ne reponde : sur 3G, le gerant voit la
 * forme de l'ecran tout de suite au lieu d'une page blanche.
 */
export default function CatalogueLoading() {
  return <ListScreenSkeleton rows={6} />;
}
