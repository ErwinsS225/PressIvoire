import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

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
    title: "PressingPro",
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
  themeColor: "#0F766E",
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
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans min-h-dvh bg-background text-foreground`}
      >
        {children}
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
