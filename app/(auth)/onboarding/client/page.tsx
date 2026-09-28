import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/supabase/queries";

/**
 * Titre de l'ecran.
 *
 * Local et non repris de `AuthHeader` : ce composant vit dans un fichier
 * "use client" (il contient `AuthForm`), l'importer ici transformerait la page
 * en Client Component pour deux lignes de JSX. `AuthHeader` ne fait que de
 * l'affichage, le dupliquer evite de payer ce cout.
 */
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1 text-center">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

/**
 * Accueil d'un client inscrit.
 *
 * Ce compte n'a pas de pressing a creer : son `pressing_id` est null, donc
 * toute l'application de gestion (commandes, caisse, catalogue) lui est
 * inutile. C'est aussi pourquoi `getContext()` renvoie volontairement un
 * contexte vide plutot qu'un pressing de demonstration.
 *
 * Cette page est donc un point d'attente honnete, pas un ecran vide. Elle dit
 * ce que le compte permet, et comment changer d'avis si l'utilisateur croyait
 * avoir cree un pressing : dans ce cas, il faut reprendre l'inscription en
 * choississant « Je gere un pressing ».
 *
 * Elle est placee dans le route group `(auth)` — l'URL reste `/onboarding/client`
 * — pour heriter du layout verre des ecrans d'authentification. Un client
 * qui vient de s'inscrire ne doit pas tomber dans une coquille grise sans
 * style au moment ou il decouvre le produit.
 *
 * @see SignUpIN.md § 9 — le defaut signale, et sa correction
 */
export default async function ClientOnboardingPage() {
  const { userId, profile, pressing } = await getContext();

  if (!userId) redirect("/login");

  // Un gerant (ou un membre d'equipe) n'a rien a faire ici.
  if (profile?.role !== "client" || pressing) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 text-center">
      <PageHeader
        title="Votre compte est prêt"
        subtitle="Il ne reste rien à configurer."
      />

      <p className="text-sm leading-relaxed text-slate-600">
        Dès qu&apos;un pressing vous aura attribué une commande, vous pourrez la
        suivre depuis cette application et être prévenu quand votre linge sera
        prêt.
      </p>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Ce que vous pouvez faire
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span aria-hidden>✓</span>
            Suivre l&apos;état de vos commandes
          </li>
          <li className="flex gap-2">
            <span aria-hidden>✓</span>
            Être prévenu par WhatsApp quand le linge est prêt
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-flag-200 bg-flag-50 p-5 text-left">
        <p className="text-sm font-bold text-slate-900">
          Vous vouliez plutôt gérer un pressing ?
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Créez un compte avec l&apos;option « Je gère un pressing » pour
          configurer votre établissement.
        </p>
        <Link
          href="/register"
          className="btn-press mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-button px-4 text-sm font-bold text-white transition hover:bg-button-strong"
        >
          Créer un compte pressing
        </Link>
      </div>

      <p className="text-xs text-slate-400">
        Un problème ?{" "}
        <Link
          href="/forgot-password"
          className="font-semibold text-brand-700 hover:underline"
        >
          Mot de passe oublié
        </Link>
      </p>
    </div>
  );
}