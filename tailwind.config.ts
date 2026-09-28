import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-poppins)", "var(--font-inter)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        /*
         * BLEU DES BOUTONS.
         *
         * Déclaré ici pour que les classes `bg-button`, `text-button-strong`,
         * etc. existent dans le CSS généré. Les valeurs pointent sur des
         * VARIABLES CSS, pas sur des hex.
         *
         * C'est la seule façon fiable : écrire `bg-[#2563EB]` directement dans
         * un composant fonctionne en développement, mais Tailwind peut
         *PURGER la classe au build — le build « passe » sans erreur et le
         * bouton sort INCOLORE en production. Une variable déclarée dans
         * globals.css n'a pas ce risque.
         */
        button: {
          DEFAULT: "hsl(var(--button))",
          strong: "hsl(var(--button-strong))",
          deep: "hsl(var(--button-deep))",
        },
        /*
         * Brand PressingPro — ARDOISE BLEUTÉE.
         *
         * Ces valeurs pointent sur les variables CSS, pas sur des hex : c'est
         * ce qui fait que `bg-brand-700` suit automatiquement le thème. Avec
         * des hex en dur, le bouton principal resterait vert sur fond sombre.
         *
         * Pourquoi l'ardoise et non le vert d'origine : une couleur très
         * saturée sur de grandes surfaces capte l'œil plus fort que l'ombre
         * qui porte le relief. On regarde alors l'objet au lieu de regarder sa
         * profondeur — alors que la profondeur est justement l'effet visé.
         */
        brand: {
          DEFAULT: "hsl(var(--primary))",
          50: "hsl(var(--primary) / 0.04)",
          100: "hsl(var(--primary) / 0.08)",
          200: "hsl(var(--primary) / 0.16)",
          500: "hsl(var(--primary) / 0.7)",
          600: "hsl(var(--primary) / 0.85)",
          700: "hsl(var(--primary))",
          800: "hsl(var(--primary) / 0.92)",
          900: "hsl(var(--primary-foreground))",
        },
        /*
         * Accent sarcelle : liens, statuts actifs, éléments « en cours ».
         * L'ambre (`flag`) est réservé aux alertes et aux compteurs.
         */
        teal: {
          DEFAULT: "hsl(var(--accent))",
          50: "hsl(var(--accent) / 0.06)",
          100: "hsl(var(--accent) / 0.12)",
          200: "hsl(var(--accent) / 0.24)",
          500: "hsl(var(--accent) / 0.7)",
          600: "hsl(var(--accent) / 0.88)",
          700: "hsl(var(--accent))",
        },
        /* Ambre — signal : ce qui doit accrocher l'œil. */
        flag: {
          DEFAULT: "hsl(var(--flag-500))",
          50: "hsl(var(--flag-500) / 0.06)",
          100: "hsl(var(--flag-500) / 0.12)",
          200: "hsl(var(--flag-500) / 0.24)",
          400: "hsl(var(--flag-500) / 0.7)",
          500: "hsl(var(--flag-500))",
          600: "hsl(var(--flag-500) / 0.88)",
        },
        /* vert WhatsApp — statuts "pret", confirmations, succes */
        whatsapp: {
          DEFAULT: "#25D366",
          500: "#25D366",
          600: "#1EBE5A",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        /* --- animations de l'interface mobile (cf. maquette) --- */
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "ring-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.7)" },
          "70%": { boxShadow: "0 0 0 15px rgba(249, 115, 22, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0)" },
        },
        checkmark: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "drawer-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        /* Barres du graphique : elles poussent depuis la ligne de base. */
        "grow-up": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        /* Barres horizontales : ventilation par moyen de paiement. */
        "grow-right": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "ring-pulse": "ring-pulse 2s infinite",
        /*
         * `checkmark` etait declare en keyframe mais ABSENT d'ici : l'animation
         * n'etait donc jamais generee dans le CSS et le trace du check de la
         * maquette restait inutilisable. Corrige ici.
         */
        "checkmark": "checkmark 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.2s forwards",
        "slide-in-left": "slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in": "pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "drawer-up": "drawer-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "grow-up": "grow-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
