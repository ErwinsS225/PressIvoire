"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/guards";
import {
  processNotificationQueue,
  retryNotification,
  cancelNotification,
  clearQueue as clearQueueInternal,
} from "@/lib/notifications-server";
import { NOTIFICATION_STATUS } from "@/lib/notifications";

/**
 * Server Actions pour la gestion des notifications.
 *
 * Toutes ces actions sont protégées par `requireStaff()` : seul le personnel
 * du pressing peut manipuler la file d'attente. Les politiques RLS de Supabase
 * garantissent qu'on ne peut agir que sur les notifications du pressing auquel
 * l'utilisateur est rattaché.
 */

/** Traite les notifications éligibles dans la file d'attente. */
export async function processQueue() {
  const result = await requireStaff("de traiter la file de notifications");
  if (!result.ok) throw new Error(result.error);

  const { pressing } = result.context;
  const outcome = await processNotificationQueue(pressing.id);

  revalidatePath("/notifications");
  return outcome;
}

/** Relance une notification qui a échoué. */
export async function retryNotificationAction(notificationId: string) {
  const result = await requireStaff("de relancer cette notification");
  if (!result.ok) throw new Error(result.error);

  const { pressing } = result.context;
  const outcome = await retryNotification(notificationId, pressing.id);

  revalidatePath("/notifications");
  return outcome;
}

/** Annule une notification en attente. */
export async function cancelNotificationAction(notificationId: string) {
  const result = await requireStaff("d'annuler cette notification");
  if (!result.ok) throw new Error(result.error);

  const { pressing } = result.context;
  const outcome = await cancelNotification(notificationId);

  revalidatePath("/notifications");
  return outcome;
}

/** Supprime les notifications terminées de la file. */
export async function clearQueue() {
  const result = await requireStaff("de vider la file de notifications");
  if (!result.ok) throw new Error(result.error);

  await clearQueueInternal();
  revalidatePath("/notifications");
}
