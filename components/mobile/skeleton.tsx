import { cn } from "@/lib/utils";

/**
 * Squelettes de chargement.
 *
 * Ils servent de `fallback` aux frontieres Suspense et aux fichiers
 * `loading.tsx` : sur une connexion 3G, un ecran gris qui pulse est beaucoup
 * moins brutal qu'une page blanche, et il reserve la place pour eviter que le
 * contenu ne saute quand les donnees arrivent.
 *
 * La forme des squelettes reprend celle des vrais composants (hauteur de
 * carte, taille d'avatar, largeur du montant) pour que la substitution soit
 * invisible.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** En-tete d'ecran : titre + sous-titre. */
export function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 pb-4 pt-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-11 w-11 rounded-full" />
    </div>
  );
}

/** Grille de cartes chiffrees (tableau de bord, caisse, rapports). */
export function StatGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      <Skeleton className="col-span-2 h-32 rounded-2xl" />
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

/** Liste de lignes generiques, facon cartes de commande. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-5">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Ecran complet : en-tete + grille + liste. Le repli le plus courant. */
export function ScreenSkeleton({ stats = 2, rows = 4 }: { stats?: number; rows?: number }) {
  return (
    <div className="h-full overflow-hidden animate-fade-in">
      <HeaderSkeleton />
      <StatGridSkeleton count={stats} />
      <div className="mt-6">
        <ListSkeleton rows={rows} />
      </div>
    </div>
  );
}

/** Ecran de liste sans statistiques (catalogue, clients, notifications). */
export function ListScreenSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full overflow-hidden animate-fade-in">
      <HeaderSkeleton />
      <div className="px-5 pb-4">
        <Skeleton className="h-12" />
      </div>
      <ListSkeleton rows={rows} />
    </div>
  );
}
