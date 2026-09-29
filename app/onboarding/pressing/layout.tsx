import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/supabase/queries";
import { isFreshAccount } from "@/lib/validation/auth";
import { resolveDestination } from "@/lib/routing";
import { StuckAccountNotice } from "@/components/onboarding/stuck-account-notice";

/**
 * Garde du parcours d'onboarding gerant.
 *
 * Quatre sorties de parcours, chacune avec sa destination :
 *   - pas de session      -> /login (le middleware joue deja, filet de securite)
 *   - role 'client'       -> /onboarding/client (Etape 3 du contrat)
 *   - pressing deja cree  -> /dashboard, l'onboarding est sans objet
 *   - pas de pressing     -> on laisse passer
 *
 * Le dernier cas est nuance : un compte de quelques minutes est une inscription
 * en cours, et l'utilisateur doit voir le parcours normal. Un compte de plusieurs
 * jours, en revanche, est le piege decrit dans `StuckAccountNotice` — on lui
 * montre alors un avertissement AVANT les etapes, plutot que de le laisser
 * remplir trois formulaires pour decouvrir qu'il tourne en rond.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, pressing, profile } = await getContext();

  /*
   * Une seule regle de routage pour toute l'application (lib/routing.ts).
   *
   * On ne compare plus le role « a la main » : c'est exactement ce calcul qui
   * avait diverge, un gerant se retrouvant sur l'ecran client parce qu'un
   * profil illisible avait valeur `client` par defaut. La fonction centrale
   * applique le meme ordre de tests partout.
   */
  const destination = resolveDestination({
    userId,
    role: profile?.role ?? null,
    hasPressing: pressing !== null,
  });

  // Sortie du parcours : on redirige vers l'ecran calcule. On compare a la
  // destination courante pour ne jamais boucler sur soi-meme.
  if (destination !== "/onboarding/pressing") {
    redirect(destination);
  }

  /*
   * Un compte ancien sans pressing est un cas a part : soit l'utilisateur a
   * cree un second compte en croyant recommencer, soit il a perdu l'accès au
   * premier. Dans les deux cas, commencer les etapes n'est pas la reponse.
   */
  const looksStuck = !isFreshAccount(profile?.createdAt ?? "");

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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {looksStuck ? <StuckAccountNotice /> : null}
        {children}
      </main>
    </div>
  );
}
