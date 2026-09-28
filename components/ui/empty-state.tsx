import { cn } from "@/lib/utils";

/**
 * Etat vide : message centre quand une liste ne contient rien.
 *
 * `hint` explique pourquoi la liste est vide — sans lui, l'utilisateur voit
 * un ecran vide et suppose a un bug.
 */
export function EmptyState({
  icon,
  title,
  hint,
  className,
}: {
  /** Emoji d'illustration. */
  icon?: string;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="text-3xl" aria-hidden>
          {icon}
        </span>
      ) : null}
      <p className="font-medium">{title}</p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}