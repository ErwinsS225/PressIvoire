import { cn } from "@/lib/utils";

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Titre facultatif : plusieurs ecrans (Clients, Parametres) placent
     * eux-memes leur <h1> dans `children` et n'en fournissent pas ici.
     * Rendu uniquement s'il est renseigne, pour eviter un <h1> vide.
     */
    title?: string;
    subtitle?: string;
}

export function Header({ title, subtitle, children, className }: HeaderProps) {
    return (
        <div className={cn("flex items-center justify-between", className)}>
            {(title || subtitle) && (
                <div className="grid gap-1">
                    {title && (
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    )}
                    {subtitle && (
                        <p className="text-muted-foreground">{subtitle}</p>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}
