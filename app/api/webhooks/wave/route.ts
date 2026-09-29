/**
 * Webhook Wave Checkout.
 *
 * Le SEUL endroit ou un abonnement est active. C'est donc l'endroit le plus
 * sensible de l'application : une erreur ici distribue des plans gratuits, ou
 * fait perdre de l'argent a un client qui a paye.
 *
 * Regles non negociables :
 *
 * 1. La signature est verifiee sur le CORPS BRUT, avant tout `JSON.parse`.
 *    Parser d'abord, puis re-serialiser, changerait des octets et ferait
 *    echouer une signature valide.
 *
 * 2. On ne fait JAMAIS confiance a `custom_fields` seul. Le pressing vise
 *    est relu aupres de l'API Wave (`retrieveCheckoutSession`) avant toute
 *    ecriture : un POST forge, meme signe avec une session inventee, ne
 *    doit pas pouvoir commander un abonnement pour un pressing arbitraire.
 *
 * 3. Idempotence. Wavelivre le meme evenement plusieurs fois. L'`id`
 *    d'evenement est unique et sert de cle : `saas_subscriptions.transaction_id`
 *    porte cet identifiant et sa contrainte d'unicite fait office de garde-fou
 *    au niveau de la base.
 *
 * 4. On repond TOUJOURS 2xx, sauf signature invalide. Une erreur de
 *    traitement ne doit pas provoquer une boucle de retentatives infinie :
 *    le handler journalise et acknowledge, et l'echec se voit dans les logs.
 *
 * Reference : https://docs.wave.com/webhook
 */
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  parseWaveEvent,
  retrieveCheckoutSession,
  verifyWaveSignature,
  WAVE_EVENTS,
  WaveApiError,
} from "@/lib/wave";

/** Le webhook est par nature dynamique : jamais de cache. */
export const dynamic = "force-dynamic";

/**
 * Runtime Node.js explicite.
 *
 * Ce handler utilise `node:crypto` (HMAC de la signature) et le client
 * Supabase. Les deux exigent le runtime Node — sur l'Edge, l'import
 * echouerait a la compilation. La valeur par defaut d'un Route Handler est
 * Node.js, mais la dire evite un edition accidentelle en `edge` plus tard.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Corps BRUT, avant toute lecture de la signature.
  const rawBody = await request.text();

  const verdict = verifyWaveSignature({
    header: request.headers.get("wave-signature"),
    rawBody,
    secret: process.env.WAVE_WEBHOOK_SECRET,
  });

  if (!verdict.ok) {
    // Seul cas ou l'on ne repond pas 2xx : une requete non authentifiee
    // n'est pas un evenement, et la signaler a Wave evite qu'il insiste.
    console.error("[wave] signature refusee :", verdict.reason);
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }

  const event = parseWaveEvent(rawBody);
  if (!event) {
    console.error("[wave] charge utile illisible");
    return NextResponse.json({ received: true });
  }

  if (event.type === WAVE_EVENTS.completed) {
    try {
      await onPaymentCompleted(event.id, event.data.id ?? null);
    } catch (error) {
      // On acknowledge quand meme : un rejeu ne corrigerait pas une erreur
      // de logique, et ferait boucler Wave pendant des heures.
      console.error("[wave] traitement du paiement echoue :", error);
    }
  } else {
    // `checkout.session.payment_failed` et les evenements non abonnes ne
    // demandent aucune action : le client retentera depuis la page Wave.
    console.log(`[wave] evenement ignore : ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

/**
 * Confirme le paiement aupres de Wave, puis active l'abonnement.
 *
 * La confirmation API est le coeur de la securite : elle garantit que la
 * session existe bien, qu'elle est `complete`, et qu'elle porte le montant
 * attendu. Le webhook n'est qu'un signal ; cette lecture est la preuve.
 */
async function onPaymentCompleted(eventId: string, sessionId: string | null) {
  if (!sessionId) {
    console.error("[wave] evenement sans identifiant de session");
    return;
  }

  const session = await retrieveCheckoutSession(sessionId);

  if (session.payment_status !== "complete" && session.checkout_status !== "complete") {
    // Evenement annonce comme termine, mais l'API dit le contraire. On ne
    // fait rien : mieux vaut un abonnement manquant qu'un abonnement offert.
    console.error(
      `[wave] session ${sessionId} : statut ${session.payment_status}/${session.checkout_status}`,
    );
    return;
  }

  const pressingId = session.custom_fields?.pressing_id;
  const plan = session.custom_fields?.plan;
  if (!pressingId || !plan) {
    console.error(`[wave] session ${sessionId} : pressing_id ou plan manquant`);
    return;
  }

  const supabase = createClient();

  /*
   * Idempotence cote base : `transaction_id` est UNIQUE. Si l'evenement a
   * deja ete traite, l'appel echoue — ce qui est le comportement voulu, et
   * economise le test d'existence en base.
   */
  const { error } = await supabase.rpc("set_pressing_subscription", {
    p_pressing_id: pressingId,
    p_plan: plan,
    p_expires_at: expiryFor(session.when_paid ?? new Date().toISOString()),
    p_price: Number.parseInt(session.amount, 10) || 0,
    p_billing_cycle: "monthly",
    p_transaction_id: eventId,
    p_payment_method: "wave",
  } as never);

  if (error) {
    // Contrainte d'unicite : l'evenement a deja ete traite. Ce n'est pas
    // une erreur, c'est le fonctionnement nominal d'une livraison en double.
    if (error.message.includes("duplicate key")) {
      console.log(`[wave] evenement deja traite : ${eventId}`);
      return;
    }
    if (error instanceof WaveApiError) throw error;
    throw new Error(`Activation impossible : ${error.message}`);
  }

  console.log(`[wave] abonnement active — pressing ${pressingId}, plan ${plan}`);
}

/** Un mois d'abonnement a partir du paiement. */
function expiryFor(paidAt: string): string {
  const date = new Date(paidAt);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}