"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    Users,
    Wallet,
    Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Barre de navigation basse, pour le telephone.
 *
 * Le reste de l'application est concu en desktop (cf. components/layout/sidebar).
 * Cette barre n'est qu'un second point d'entree pour l'ecran etroit : meme
 * base de code, memes composants — seule la presentation change, via les
 * prefixes `md:`.
 *
 * Le bouton central « + » est une action de creation : il ressort du flux
 * pour rester atteignable au pouce.
 *
 * Les chemins pointent vers les routes DESKTOP (`/orders`, pas `/commandes`) :
 * les ecrans mobiles ont ete supprimes, ces liens seraient morts sinon.
 */
const TABS = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/orders", label: "Commandes", icon: Package },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/caisse", label: "Caisse", icon: Wallet },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="glass border-t border-slate-200/50 px-2 py-2 md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {TABS.slice(0, 2).map((tab) => (
          <NavItem key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}

        <div className="relative flex flex-col items-center">
          <Link
            href="/orders/new"
            aria-label="Nouvelle commande"
            className="btn-press absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-button text-white shadow-lg transition hover:bg-button-strong"
          >
            <Plus className="h-7 w-7" aria-hidden />
          </Link>
          <span className="mt-8 text-[10px] font-semibold text-button-strong">
            Nouveau
          </span>
        </div>

        {TABS.slice(2).map((tab) => (
          <NavItem key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center rounded-xl py-2 transition-colors",
        active
          ? "bg-button/10 text-button-strong"
          : "text-slate-500 hover:bg-button/5",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="mt-0.5 text-[10px] font-semibold">{label}</span>
    </Link>
  );
}