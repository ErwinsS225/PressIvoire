"use server";

/**
 * Actions d'abonnement — passage au plan payant via Wave Checkout.
 *
 * Le paiement se fait en DEUX temps, et c'est deliberé :
 *
 *   1. ici, on cree une session Wave et on renvoie le gerant sur la page de
 *      paiement. Rien n'est active.
 *   2. le webhook Wave (`app/api/webhooks/wave/route.ts`) confirme le
 *      paiement aupres de l'API, puis appelle `set_pressing_subscription()`.
 *
 * Pourquoi ne pas activer directement au retour du client ? Parce que
 * `success_url` est une URL publique : n'importe qui peut l'ouvrir, meme sans
 * avoir paye. Le seul signal fiable est la relecture de la session par Wave.
 */
import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/app-url";
import { requireAdmin } from "@/lib/guards";
import { PLANS, type PlanId } from "@/lib/plans";
import { getContext } from "@/lib/supabase/queries";
import { createCheckoutSession, WaveApiError } from "@/lib/wave";

export interface CheckoutState {
  error?: string;
}

/** Seuls ces plans se vendent en ligne aujourd'hui. */
const PURCHASABLE: PlanId[] = ["pro"];

export async function startSubscriptionCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const planId = String(formData.get("plan") ?? "") as PlanId;

  if (!PURCHASABLE.includes(planId)) {
    return { error: "Ce plan ne se souscrit pas en ligne." };
  }

  // Seul un gerant ou un responsable decide du budget du pressing.
  const guard = await requireAdmin("souscrire un abonnement");
  if (!guard.ok) return { error: guard.error };

  const { pressing, profile } = await getContext();
  if (!pressing) return { error: "Aucun pressing n'est rattaché à ce compte." };

  // Un abonnement deja actif ne doit pas se payer deux fois.
  if (pressing.subscription_plan === planId && pressing.subscription_expires_at) {
    const stillActive = new Date(pressing.subscription_expires_at) > new Date();
    if (stillActive) {
      return { error: "Cet abonnement est déjà actif." };
    }
  }

  const plan = PLANS[planId];
  const appUrl = getAppUrl();

  try {
    const session = await createCheckoutSession({
      amount: plan.price,
      description: `PressIvoire — plan ${plan.name}`,
      customer: {
        // Le nom affiche sur la page de paiement est celui du PAYEUR, donc
        // du gerant — pas celui de l'etablissement.
        ...(profile?.full_name ? { name: profile.full_name } : {}),
      },
      successUrl: `${appUrl}/abonnement?paiement=succes`,
      cancelUrl: `${appUrl}/abonnement?paiement=annule`,
      /*
       * Ces deux champs sont le lien entre le webhook et la ligne a
       * modifier. Ils ne sont pas consideres comme fiables : le webhook
       * relit la session aupres de Wave avant d'ecrire quoi que ce soit.
       */
      customFields: {
        pressing_id: pressing.id,
        plan: planId,
      },
    });

    if (!session.url) {
      return { error: "Wave n'a pas renvoyé de lien de paiement. Reessayez." };
    }

    // Hors de toute Server Action : on part sur le site de Wave.
    redirect(session.url);
  } catch (error) {
    if (error instanceof WaveApiError) {
      return { error: error.message };
    }
    // `redirect()` leve une exception : la remonter telle quelle est le seul
    // comportement correct, sinon on la relaverait et on afficherait une
    // erreur a la place de naviguer.
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[abonnement] creation de session impossible :", error);
    return { error: "Le paiement n'a pas pu être lancé. Reessayez." };
  }
}