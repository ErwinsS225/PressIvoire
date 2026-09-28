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
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navigation desktop.
 *
 * `href` sert a la fois de cle de rendu et de test d'activite. Une route
 * mere que ses enfants (`/orders` et `/orders/123`) met le lien parent en
 * gras : sans cela, ouvrir une commande ne laisserait plus aucun lien actif.
 */
const navLinks = [
    { href: "/dashboard", label: "Tableau de bord", icon: Home },
    { href: "/orders", label: "Commandes", icon: Package },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/catalogue", label: "Catalogue", icon: Shirt },
    { href: "/livraisons", label: "Livraisons", icon: Truck },
    { href: "/caisse", label: "Caisse", icon: Wallet },
    { href: "/rapports", label: "Rapports", icon: BarChart3 },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex h-full w-64 flex-col border-r bg-white">
            <div className="flex h-16 items-center border-b px-6 text-xl font-bold">
                Press<span className="text-brand-700">Plus</span>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {navLinks.map((link) => {
                    const isActive =
                        pathname === link.href || pathname.startsWith(`${link.href}/`);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                isActive
                                    ? "bg-brand-50 font-semibold text-brand-700"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.label}
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