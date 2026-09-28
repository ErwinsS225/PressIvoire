"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Thème de l'application : clair, sombre, ou « suit le système ».
 *
 * Trois états et non deux, parce que `prefers-color-scheme` de l'OS est un
 * choix réel : quelqu'un qui a réglé son téléphone en sombre s'attend à ce que
 * les applications suivent. Forcer un clair ou un sombre lui impose un réglage
 * que ses autres applications ne suivent pas.
 *
 * `localStorage` et non un cookie : le thème n'a pas besoin d'être connu du
 * serveur, et éviter un cookie dispense de le marquer `sameSite`/`secure` et
 * de le renvoyer à chaque requête.
 */

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "pressingpro:theme";

interface ThemeContextValue {
  theme: Theme;
  /** Thème RÉELLEMENT appliqué, « system » résolu. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  /** Pas encore connu tant que le thème système n'a pas été lu. */
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Lit le thème avant le premier rendu, côté client.
 *
 * DOIT être appelé dans un `<script>` injecté dans le `<head>`, pas dans un
 * `useEffect` : un effet s'exécute APRÈS le premier rendu, donc l'utilisateur
 * verrait un éclair blanc avant que la classe `dark` ne soit posée. Ce script
 * est volontairement synchrone et placé avant le contenu.
 */
export const themeInitScript = `(function(){try{var k="${STORAGE_KEY}";var s=localStorage.getItem(k)||"system";var d=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Lecture du thème stocké au premier rendu client.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    setMounted(true);
  }, []);

  // Application effective : on bascule la classe `dark` sur <html>, que
  // Tailwind (`darkMode: ["class"]`) et le bloc `.dark` de globals.css lisent.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark =
        theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      // `color-scheme` fait Colorer nativement les contrôles du navigateur
      // (barres de défilement, champs de formulaire) ; sans lui, un champ
      // blanc reste blanc sur fond noir.
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      setResolvedTheme(dark ? "dark" : "light");
    };

    apply();

    // On écoute le changement de thème système : si l'utilisateur règle son
    // téléphone le soir, l'application en « system » doit suivre.
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Navigation privée, quota plein : le thème ne sera pas retenu, mais
      // l'application doit continuer à fonctionner.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Accès au thème. Erreur explicite si utilisé hors `ThemeProvider`. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur de <ThemeProvider>.");
  }
  return context;
}
