import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Conteneur de tableau.
 *
 * L'élévation (`elev-table`) est posée ICI, sur le `div` englobant, et non
 * sur le `<table>` : une table occupe toute la largeur de son conteneur,
 * donc l'ombre et la bordure couvrent la totalité de la zone — en-tête et
 * pied compris. Le `overflow: hidden` de la classe rogne les coins arrondis,
 * sans quoi les lignes déborderaient aux angles.
 *
 * Un tableau est le cas le plus exigeant en profondeur : beaucoup de lignes,
 * des colonnes de chiffres à suivre verticalement. D'où une ombre propre au
 * tableau et un en-tête posé plus haut, dont l'ombre tombe sur les lignes.
 */
const Table = React.forwardRef<
    HTMLTableElement,
    React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
    <div className="elev-table relative w-full overflow-auto">
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
            /*
             * Survol de ligne : gris ASSOMBRI, pas teinte d'accent.
             *
             * On indiquait `#2563EB` à 7 % — assez discret pour être
             * quasiment invisible, donc inutile : on ne savait plus sur
             * quelle ligne se trouvait le curseur. Un gris plus foncé que la
             * ligne est franc, sans concurrencer les badges de statut.
             *
             * Les couleurs viennent de VARIABLES CSS : une classe
             * `dark:` écrite en dur dans un composant peut être purgée au
             * build sans la moindre erreur (cf. le piège des `bg-[#2563EB]`).
             */
            "border-b transition-colors duration-150 hover:bg-[hsl(var(--table-row-hover))] data-[state=selected]:bg-[hsl(var(--table-row-hover))] border-[hsl(var(--divider))]",
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