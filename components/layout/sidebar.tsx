"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Package,
    Users,
    Settings,
    LogOut,
    Shirt,
    Wallet,
    Truck,
    BarChart3,
    Bell,
    Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navigation desktop.
 *
 * `href` sert a la fois de cle de rendu et de test d'activite. Une route
 * mere que ses enfants (`/orders` et `/orders/123`) met le lien parent en
 * gras : sans cela, ouvrir une commande ne laisserait plus aucun lien actif.
 *
 * `requires` marque une entrée réservée au plan Pro. Ces entrées restent
 * VISIBLES mais non cliquables : les cacher ferait croire que l'option
 * n'existe pas, alors qu'elle se débloque. Le verrou réel est posé côté
 * serveur (Server Actions, lib/plans.ts) — ceci n'est que le reflet.
 */
export type Capability = "deliveries" | "reports" | "notifications";

const navLinks: {
  href: string;
  label: string;
  icon: typeof Home;
  requires?: Capability;
}[] = [
    { href: "/dashboard", label: "Tableau de bord", icon: Home },
    { href: "/orders", label: "Commandes", icon: Package },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/catalogue", label: "Catalogue", icon: Shirt },
    { href: "/livraisons", label: "Livraisons", icon: Truck, requires: "deliveries" },
    { href: "/caisse", label: "Caisse", icon: Wallet },
    { href: "/rapports", label: "Rapports", icon: BarChart3, requires: "reports" },
    {
        href: "/notifications",
        label: "Notifications",
        icon: Bell,
        requires: "notifications",
    },
    { href: "/settings", label: "Paramètres", icon: Settings },
    { href: "/equipe", label: "Équipe", icon: Users },
];

export function Sidebar({
    capabilities = [],
}: {
    /** Capacités accordées par le plan courant. Vide = plan gratuit. */
    capabilities?: Capability[];
}) {
    const pathname = usePathname();

    const hasCapability = (c: Capability) => capabilities.includes(c);
    return (
        <aside className="flex h-full w-64 flex-col border-r bg-white">
            <div className="flex h-16 items-center border-b px-6 text-xl font-bold">
                Press<span className="text-brand-700">Plus</span>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {navLinks.map((link) => {
                    const isActive =
                        pathname === link.href || pathname.startsWith(`${link.href}/`);
                    // Une capacité absente du plan courant reste visible mais
                    // n'est pas cliquable : la cacher ferait croire que
                    // l'option n'existe pas, alors qu'elle se débloque.
                    const locked = link.requires && !hasCapability(link.requires);
                    return (
                        <Link
                            key={link.href}
                            // Un lien verrouillé pointe quand même vers sa page :
                            // celle-ci affiche l'écran « réservé au plan Pro »
                            // avec le détail de ce qui manque.
                            href={link.href}
                            aria-disabled={locked}
                            onClick={(event) => {
                                if (locked) event.preventDefault();
                            }}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                locked && "opacity-50",
                                isActive && !locked
                                    ? "bg-brand-50 font-semibold text-brand-700"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                            title={locked ? "Réservé au plan Pro" : undefined}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                            {locked ? (
                                <Lock className="ml-auto h-3.5 w-3.5" />
                            ) : null}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t p-3">
                <form action="/api/signout" method="post">
                    <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                    </button>
                </form>
            </div>
        </aside>
    );
}