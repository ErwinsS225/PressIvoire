import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import {
  ThemeProvider,
  themeInitScript,
} from "@/components/theme/theme-provider";
import { ServiceWorkerRegistrar } from "@/components/pwa/install-prompt";
import { BRAND_NAME, BRAND_THEME_COLOR } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PressingPro — Gestion de pressing, Côte d'Ivoire",
    template: "%s · PressingPro",
  },
  description:
    "SaaS de gestion de pressing et pressing-à-sec en Côte d'Ivoire : commandes, livraison, paiement mobile money, fidélité et pilotage.",
  applicationName: "PressingPro",
  /*
   * PWA — c'est ce qui rend l'application installable sur un telephone.
   *
   * Vercel n'a aucune fonction de "conversion" : ce sont ces trois elements
   * qui font le travail. Le manifest donne nom, icones, couleurs et mode
   * d'affichage ; `appleWebApp` ajoute le plein ecran sur iOS, qui ne lit
   * pas le manifest ; `viewport` interdit le zoom automatique, qui est
   * refuse par iOS des qu'un ecran est tactile.
   */
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  formatDetection: { telephone: false },
  keywords: [
    "pressing",
    "pressing Abidjan",
    "gestion pressing",
    "laverie",
    "nettoyage à sec",
    "SaaS Côte d'Ivoire",
  ],
};

export const viewport: Viewport = {
  // Depuis `lib/brand`, et non en dur : cette valeur doit rester identique a
  // celle du manifeste. `lib/brand.test.ts` verifie l'egalite des deux.
  themeColor: BRAND_THEME_COLOR,
  width: "device-width",
  // `maximumScale: 1` est refuse par iOS : on le laisse a 5 pour ne pas
  // bloquer l'utilisateur qui zoome volontairement.
  maximumScale: 5,
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * `suppressHydrationWarning` : le script ci-dessous ajoute la classe
     * `dark` sur <html> AVANT l'hydratation de React. Sans cet attribut,
     * React signalerait un écart entre le HTML servi et son DOM attendu.
     */
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/*
          Thème appliqué AVANT le premier rendu, et volontairement SANS
          `next/script` : un script injecté par Next peut s'exécuter après
          le premier rendu selon la stratégie de chargement. Or un thème posé
          tardivement produit un éclair blanc sur fond noir — exactement ce que
          ce script existe pour éviter.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans min-h-dvh bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        {/*
          Service worker : hors-ligne et capacite d'installation.

          Il vit dans le layout ROOT, sans quoi chaque page devrait y penser et
          une seule omission annulerait cette capacite pour tout le site. Il ne
          rend aucun HTML : c'est un point de branchement.
        */}
        <ServiceWorkerRegistrar />
        {/*
         * Mesure d'audience (Vercel Analytics).
         *
         * Rend un composant invisible qui collecte les pages vues et les Web
         * Vitals. Il doit vivre dans le layout RACINE et non dans une page :
         * c'est le seul endroit rendu sur toutes les routes, donc le seul
         * qui garantit qu'aucune vue n'est manquée.
         *
         * Il ne signale AUCUNE donnee identifiante : ni session, ni
         * email, ni nom. Sans `mode="debug"`, l'envoi a lieu uniquement en
         * production — en developpement, les appels vers Vercel ne polluent
         * donc pas les statistiques.
         */}
        <Analytics />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  );
}
