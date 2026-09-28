import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Conteneur de tableau.
 *
 * Le voile blanc (`glass-table-wrap`) est pose ICI, sur le `div` englobant,
 * et non sur le `<table>` : une table occupe toute la largeur de son
 * conteneur, donc le voile couvre la totalite de la zone — en-tete et pied
 * compris. Le `overflow: hidden` de la classe rogne les coins arrondis et
 * evite qu'une ligne deborde sous le verre.
 *
 * Sans ce voile, un tableau pose sur le fond anime laissait passer les
 * taches entre les lignes : la lecture d'une colonne de montants devenait
 * difficile, meme si chaque carte individuelle etait assez opaque.
 */
const Table = React.forwardRef<
    HTMLTableElement,
    React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
    <div className="glass-table-wrap relative w-full overflow-auto">
        <table
            ref={ref}
            className={cn("w-full caption-bottom text-sm", className)}
            {...props}
        />
    </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tbody
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
    />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tfoot
        ref={ref}
        className={cn(
            "border-t bg-muted/80 font-medium [&>tr]:last:border-b-0",
            className
        )}
        {...props}
    />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
    HTMLTableRowElement,
    React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={cn(
            // `hover:bg-muted/70` et non `/50` : sur un fond de verre, 50 %
            // d'opacite donnait un survol a peine perceptible — on ne savait
            // plus sur quelle ligne se trouvait le curseur.
            "border-b border-slate-100/80 transition-colors hover:bg-brand-700/[0.07] data-[state=selected]:bg-brand-700/10",
            className
        )}
        {...props}
    />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
    HTMLTableCellElement,
    React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={cn(
            "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
            className
        )}
        {...props}
    />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
    HTMLTableCellElement,
    React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <td
        ref={ref}
        className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
        {...props}
    />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
    <caption
        ref={ref}
        className={cn("mt-4 text-sm text-muted-foreground", className)}
        {...props}
    />
))
TableCaption.displayName = "TableCaption"

/**
 * Ligne d'etat vide d'un tableau.
 *
 * `colSpan` vaut le nombre de colonnes reelles : sans lui, un <td> unique
 * n'occupe qu'une colonne et le message se retrouve case a gauche au lieu
 * d'etre centre. Les tableaux de l'application ont tous au moins 3 colonnes.
 */
function TableEmpty({
    colSpan,
    children,
}: {
    colSpan: number;
    children: React.ReactNode;
}) {
    return (
        <TableRow>
            <TableCell
                colSpan={colSpan}
                className="h-24 text-center text-muted-foreground"
            >
                {children}
            </TableCell>
        </TableRow>
    )
}
TableEmpty.displayName = "TableEmpty"

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
    TableCaption,
    TableEmpty,
}