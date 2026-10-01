/**
 * Abonnement aux notifications push.
 *
 * ## Ce que le navigateur fait a notre place
 *
 * `pushManager.subscribe()` renvoie une `PushSubscription` dont l'`endpoint`
 * est une URL unique a l'appareil. Nous n'avons rien a implementer de la
 * cryptographie de l'abonnement : le navigateurpossede deja la cle privee, qui
 * ne quitte JAMAIS le telephone. C'est ce qui rend le push acceptable pour une
 * application de gestion : le serveur ne peut pas lire ce qu'il transmet.
 *
 * ## La cle VAPID
 *
 * VAPID (Voluntary Application Server Identification) identifie notre serveur
 * aupres du service de push. Elle existe pour une raison qui compte ici : sans
 * elle, un tiers pourrait envoyer des notifications au nom de PressingPro aux
 * abonnes de l'application. La cle est une paire ECDSA P-256 :
 *
 * - la cle **publique** est exposee au navigateur, c'est elle qui signe
 *   l'abonnement ;
 * - la cle **privée** reste cote serveur, dans une variable d'environnement.
 *
 * Elle est generee une fois (`npm run push:keys`) et n'est jamais renewee
 * tant que les abonnements existants doivent continuer a fonctionner : la
 * changer invalide les abonnements deja enregistres.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Ce que le navigateur renvoie apres `pushManager.subscribe()`. */
export interface PushSubscriptionRecord {
  endpoint: string;
  /** Cle publique de l'appareil, en base64url. */
  p256dh: string;
  /** Secret de l'authentification, en base64url. */
  auth: string;
}

/**
 * Etat de l'abonnement, tel que vu par l'utilisateur.
 *
 * `unsupported` est un etat a part entiere et non une erreur : iOS ne permet
 * le push que depuis une PWA INSTALLEE, et Safari ancien n'expose rien. Il
 * faut pouvoir dire « votre telephone ne peut pas recevoir de notifications »
 * sans que l'ecran paraisse casse.
 */
export type PushState =
  | "supported"
  | "unsupported"
  | "denied"
  | "insecure"
  | "subscribed"
  | "unsubscribed";

/** Le push est-il techniquement possible sur ce navigateur ? */
export function isPushSupported(container: {
  serviceWorker?: unknown;
  PushManager?: unknown;
}): boolean {
  // `serviceWorker` ET `PushManager` : iOS 16.4+ fournit le second, mais le
  // push n'y fonctionne qu'une fois l'application installee — ce controle-la
  // reste transforme en erreur plus loin.
  return "serviceWorker" in container && "PushManager" in container;
}

/**
 * Etat initial derive du navigateur.
 *
 * `insecure` passe AVANT `denied`, volontairement : sur `http://` la
 * Notification API n'existe pas du tout, et parler d'un refus de
 * l'utilisateur serait faux.
 */
export function resolveInitialPushState(win: {
  isSecureContext: boolean;
  serviceWorker?: unknown;
  PushManager?: unknown;
  Notification?: { permission?: string };
}): PushState {
  if (!win.isSecureContext) return "insecure";
  if (!isPushSupported(win)) return "unsupported";
  if (win.Notification?.permission === "denied") return "denied";
  // Ni abonnement ni refus : le navigateur est d'accord, l'utilisateur
  // n'a simplement rien demande. C'est l'etat par defaut d'un ecran qui
  // propose un bouton « Activer les notifications ».
  return "unsubscribed";
}

/**
 * Convertit une `PushSubscription` en ligne de table.
 *
 * Le JSON renvoye par le navigateur porte `expirationTime`, que l'on jette :
 * la colonne n'a pas d'expiration, et une expiration URL serait un champ
 * obsolete dans notre schema.
 */
export function toSubscriptionRow(
  subscription: { endpoint: string; getKeys: () => Record<string, string> },
): PushSubscriptionRecord | null {
  const keys = subscription.getKeys();
  const p256dh = keys["p256dh"];
  const auth = keys["auth"];

  // Sans ces deux cles, l'envoi echouera. Mieux vaut refuser l'abonnement que
  // d'ecrire une ligne qui ne pourra jamais servir.
  if (!p256dh || !auth) return null;

  return { endpoint: subscription.endpoint, p256dh, auth };
}

/**
 * Enregistre l'abonnement, de facon idempotente.
 *
 * `onConflict: "endpoint"` transforme un double abonnement en mise a jour : le
 * second appel (rechargement de page, utilisateur qui rejoue le geste) ne cree
 * pas de doublon. C'est ce qui rend le bouton « Activer » sans risque.
 */
export async function saveSubscription(
  db: SupabaseClient,
  pressingId: string,
  profileId: string,
  subscription: PushSubscriptionRecord,
): Promise<void> {
  const { error } = await db
    .from("push_subscriptions")
    .upsert(
      { ...subscription, pressing_id: pressingId, profile_id: profileId },
      { onConflict: "endpoint" },
    );

  if (error) throw new Error(`Push : abonnement enregistre — ${error.message}`);
}

/** Retire l'abonnement. L'absence de ligne n'est pas une erreur. */
export async function removeSubscription(
  db: SupabaseClient,
  endpoint: string,
): Promise<void> {
  const { error } = await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(`Push : desabonnement — ${error.message}`);
}