import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * En-tete d'ecran : bouton retour optionnel, titre, sous-titre, action a droite.
 * Le contenu scrollable commence juste en dessous (cf. maquette).
 */
export function ScreenHeader({
  title,
  subtitle,
  backHref,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-5 pb-4 pt-4 animate-slide-up", className)}>
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Retour"
          className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-200"
        >
          <span aria-hidden>&larr;</span>
        </Link>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>

      {action}
    </div>
  );
}

/**
 * Conteneur d'ecran : gere le defilement vertical et reserve la place
 * necessaire a la barre de navigation fixe du bas.
 */
export function Screen({
  children,
  className,
  withNav = true,
}: {
  children: React.ReactNode;
  className?: string;
  withNav?: boolean;
}) {
  return (
    <div
      className={cn(
        "h-full overflow-y-auto scrollbar-hide animate-fade-in",
        withNav ? "pb-28" : "pb-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Titre de section, en petites capitales grises (maquette). */
export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Pastille de notifications, qui mene a la file d'envoi.
 *
 * Auparavant un `<button>` sans action : l'icone clignotait un compteur mais
 * ne menait nulle part. C'est desormais un lien vers /notifications, et le
 * compteur vient de `getNotificationCounts()` (en attente + echecs).
 */
export function NotificationBell({
  count = 0,
  href = "/notifications",
}: {
  count?: number;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
      className="btn-press relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-200"
    >
      <span className="text-lg" aria-hidden>
        &#128276;
      </span>
      {count > 0 ? (
        <>
          {/* Halo : signale qu'il y a quelque chose a traiter. */}
          <span
            className="absolute inset-0 animate-ping rounded-full bg-orange-400/30"
            aria-hidden
          />
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">
            {count > 9 ? "9+" : count}
          </span>
        </>
      ) : null}
    </Link>
  );
}
