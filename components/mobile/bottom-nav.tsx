"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Barre de navigation basse, fixe, translucide.
 *
 * Le bouton central "+" est une action de creation : il ressort du flux et
 * pulse en permanence (anneau orange) pour rester atteignable au pouce.
 */
const TABS = [
  { href: "/dashboard", label: "Accueil", icon: "\u{1F3E0}" },
  { href: "/commandes", label: "Commandes", icon: "\u{1F4CB}" },
  { href: "/clients", label: "Clients", icon: "\u{1F465}" },
  { href: "/plus", label: "Plus", icon: "☰" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="glass safe-bottom absolute inset-x-0 bottom-0 border-t border-slate-200/50 px-2 py-2">
      <div className="grid grid-cols-5 gap-1">
        {TABS.slice(0, 2).map((tab) => (
          <NavItem key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}

        <div className="relative flex flex-col items-center">
          <Link
            href="/commandes/nouvelle"
            aria-label="Nouvelle commande"
            className="btn-press fab-pulse absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition hover:bg-orange-600"
          >
            <span className="text-2xl font-light leading-none" aria-hidden>
              +
            </span>
          </Link>
          <span className="mt-8 text-[10px] font-semibold text-orange-500">Nouveau</span>
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
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center rounded-xl py-2 transition-colors",
        active ? "bg-orange-500/10 text-orange-500" : "text-slate-500 hover:bg-orange-500/5",
      )}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="mt-0.5 text-[10px] font-semibold">{label}</span>
    </Link>
  );
}
