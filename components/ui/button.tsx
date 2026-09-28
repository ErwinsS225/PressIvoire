import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Boutons — fond bleu, texte blanc.
 *
 * Le BLEU est le point de départ, pas une décoration. Toutes les variantes
 * « pleines » partagent le même fond : un utilisateur sait que ce bloc est
 * une action avant même d'en lire le libellé. C'est ce qui rend une interface
 * d'administration lisible en un coup d'œil.
 *
 * CONTRASTE — pourquoi `#2563EB` et pas un bleu plus vif :
 *
 *   #3B82F6  3.68:1  ✗ ne respecte que le « grand texte » (≥ 18px)
 *   #2563EB  5.17:1  ✓ AA pour du texte normal  ← retenu
 *   #1D4ED8  6.70:1  ✓ AA, plus foncé
 *
 * Un `#3B82F6` aurait été plus « brillant », mais un texte blanc de 14 px
 * dessus serait illisible. Un bouton qu'on ne peut pas lire n'est pas un
 * bouton.
 *
 * `outline`, `ghost` et `link` restent sans fond : ce ne sont pas des
 * actions principales, et les noyer dans le bleu supprimerait la hiérarchie
 * — on ne saurait plus quoi cliquer. Ils partagent en revanche la TEINTE
 * bleue (bordure ou texte), pour rester dans la même famille.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* Action principale — le cas le plus courant. */
        default:
          "bg-button text-white shadow-sm hover:bg-button-strong active:bg-button-deep",
        /* Action secondaire : même famille, une nuance plus sombre pour
           marquer la différence de poids sans quitter le bleu. */
        secondary:
          "bg-button-strong text-white shadow-sm hover:bg-button-deep active:bg-button-deep",
        /* Accent : bleu le plus profond — réservé aux deux ou trois actions
           qu'on veut voir en premier dans un écran dense. */
        accent:
          "bg-button-deep text-white shadow-sm hover:bg-button-deep active:bg-button-deep",
        /* Destructif : reste rouge. Un bouton « Supprimer » en bleu
           serait un piège — l'utilisateur valide une action irréversible
           sans l'avoir vue venir. */
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        /* Secondaires sans fond : bordure ou texte bleu. */
        outline:
          "border border-button/40 bg-background text-button-strong shadow-sm hover:bg-button/10",
        ghost: "text-button-strong hover:bg-button/10 hover:text-button-strong",
        link: "text-button-strong underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-6 text-base",
        icon: "h-10 w-10",
        /* Carré compact — réservé aux barres d'outils (header de carte…). */
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
