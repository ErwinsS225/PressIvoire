import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CSSProperties } from "react";

/** Fusionne des classes Tailwind de facon safe (shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate un montant en FCFA : 4000 -> "4 000 FCFA". */
export function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

/**
 * Formate un montant sans la devise : 4000 -> "4 000".
 * Utilise quand l'interface affiche "FCFA" separement (KPI, panier flottant).
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

/**
 * Date relative courte pour les listes : "Aujourd'hui 10h42", "Hier 18h30",
 * "12 mars". Les dates d demain / d'hier utilises le libelle correspondant.
 */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);

  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (days === 0) return `Aujourd'hui ${time}`;
  if (days === 1) return `Hier ${time}`;
  if (days < 7) return date.toLocaleDateString("fr-FR", { weekday: "long" });
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** "il y a 2 heures", "il y a 3 jours" — pour l'en-tete de detail. */
export function formatElapsed(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  return months < 12
    ? `il y a ${months} mois`
    : `il y a ${Math.floor(months / 12)} an(s)`;
}

/** Normalise un numero ivoirien : "07 00 00 00 00" -> "+2250700000000". */
export function normalizeIvorianPhone(input: string): string {
  const digits = input.replace(/\D/g, "").replace(/^225/, "");
  if (digits.length === 0) return "";
  return `+225${digits}`;
}
/**
 * Valide un chemin de redirection interne.
 *
 * Le parametre `redirect` vient de l'URL, donc de l'utilisateur : sans ce
 * filtre, un lien de phishing du type `/login?redirect=https://pressingpro.
 * ci.evil.com` transformerait la page de connexion en passerelle ouverte vers un
 * site tiers apres authentification — l'utilisateur voit sa session volee
 * sur un site qui imite parfaitement le vrai.
 *
 * Regles :
 *   - doit commencer par `/` : on n'accepte que des chemins internes ;
 *   - pas de `//` : interpreted comme un URL protocol-relative par le
 *     navigateur, donc une absolue redirection vers un autre site ;
 *   - pas de `/\` : certains navigateurs normalisent le backslash en slash,
 *     ce qui reintroduit le cas `//evil.com` ;
 *   - pas de backslash ni de caractere de controle, qui servoient a
 *     contourner les deux tests precedents.
 *
 * Toute valeur qui ne passe pas ces tests retombe sur `fallback`.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof value !== "string") return fallback;

  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (path.includes("\\") || path.includes("\n") || path.includes("\r")) {
    return fallback;
  }
  return path;
}

/** Extrait les initiales d'un nom complet pour les avatars : "Jean Dupont" -> "JD". */
export function getInitials(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Valide un numero ivoirien au format +225 + 8 a 10 chiffres. */
export function isValidIvorianPhone(input: string): boolean {
  return /^\+225[0-9]{8,10}$/.test(input);
}

/* -------------------------------------------------------------------------- */
/* Animations                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Delai d'apparition en cascade pour une liste.
 *
 * Renvoie la variable CSS `--stagger-index` attendue par `.stagger-item`
 * (cf. app/globals.css — regle unique, en fin de feuille), a poser dans le
 * `style` de l'element :
 *
 *   <div className="stagger-item" style={staggerStyle(index)} />
 *
 * La variable est un INDEX sans unite : le pas (55 ms) est applique en CSS,
 * une seule fois. On passe par une variable plutot que par une classe
 * `stagger-N` : ces classes doivent apparaitre en clair dans le source pour
 * survivre a la purge de Tailwind (donc `stagger-${index}` n'est pas fiable)
 * et sont plafonnees a 6, ce qui tronque les listes plus longues.
 *
 * L'index est lui-meme plafonne a `maxIndex` pour qu'une liste de 80 clients
 * n'impose pas 4 secondes d'attente avant l'affichage du dernier.
 */
export function staggerStyle(index: number, maxIndex = 12): CSSProperties {
  return {
    "--stagger-index": Math.min(Math.max(index, 0), maxIndex),
  } as CSSProperties;
}

/** Delai d'animation d'une barre de graphique (`.bar-grow`, cf. globals.css). */
export function barStyle(index: number, step = 70): CSSProperties {
  return {
    "--bar-delay": `${Math.max(index, 0) * step}ms`,
  } as CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* Helpers du tableau de bord desktop (app/(app)/orders)                       */
/* -------------------------------------------------------------------------- */

/** Montant pour le tableau de bord : 4000 -> "4 000 FCFA". */
export function formatCurrency(amount: number): string {
  return formatFCFA(amount);
}

/** Date + heure pour le tableau de bord : "27/09/2026 14:30". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

