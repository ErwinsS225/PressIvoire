import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Badges d'état.
 *
 * Trois couleurs, trois significations, zéro ambiguïté. Le même code est
 * utilisé partout — clients, commandes, équipe, abonnements — pour qu'on
 * apprenne une fois et qu'on lise partout ensuite :
 *
 *   success  VERT   actif, validé, livré, en cours
 *   danger   ROUGE  inactif, annulé, litige, en retard
 *   warning  JAUNE  neutre — ni bon ni mauvais, à traiter
 *
 * Pastilles CLAIRES (fond teinté, texte foncé), pas des aplats saturés : sur
 * un fond blanc, du texte blanc sur rouge vire au rose et devient
 * difficile à lire. Un aplat, lui, alourdit la ligne et vole l'attention au
 * chiffre qu'il accompagne.
 *
 * Les teintes viennent de variables CSS pour suivre le thème sombre — un
 * aplat codé en dur y resterait criard.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-button text-white",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",

        /* --- Les trois états métier --- */

        success:
          "border-transparent bg-[#dcfce7] text-[#15803d] dark:bg-[#22c55e]/15 dark:text-[#4ade80]",
        danger:
          "border-transparent bg-[#fee2e2] text-[#b91c1c] dark:bg-[#ef4444]/15 dark:text-[#f87171]",
        warning:
          "border-transparent bg-[#fef3c7] text-[#b45309] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]",

        /* En cours : ni validé, ni en échec. */
        info: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
        muted:
          "border-transparent bg-muted text-muted-foreground dark:bg-muted",
        /* `destructive` est un ALIAS de `danger` : le nom est trop ancré dans
           le code pour être remplacé partout d'un coup, mais il doit désigner
           la MÊME couleur — sinon deux écrans affichent des nuances
           différentes pour un même état. */
        destructive:
          "border-transparent bg-[#fee2e2] text-[#b91c1c] dark:bg-[#ef4444]/15 dark:text-[#f87171]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
