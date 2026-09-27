import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/supabase/queries";

/**
 * Garde du parcours d'onboarding gerant.
 *
 * Quatre sorties de parcours, chacune avec sa destination :
 *   - pas de session      -> /login (le middleware joue deja, filet de securite)
 *   - role 'client'       -> /onboarding/client (Etape 3 du contrat)
 *   - pressing deja cree  -> /dashboard, l'onboarding est sans objet
 *   - pas de pressing     -> on laisse passer
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, pressing, profile } = await getContext();

  // L'onboarding est reserve a un vrai compte connecte de role 'owner'.
  if (!userId) {
    redirect("/login");
  }

  if (profile?.role === "client") {
    redirect("/onboarding/client");
  }

  if (pressing) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 text-xs font-black text-white"
          >
            PP
          </span>
          <span className="text-sm font-black tracking-tight text-slate-900">
            PressingPro
          </span>
        </Link>
        <p className="text-xs text-slate-500">Configuration de votre pressing</p>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
