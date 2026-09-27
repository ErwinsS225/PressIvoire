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
  manifest: undefined,
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
