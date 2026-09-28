"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/supabase/queries";
import { ORDER_STATUS, type OrderStatus } from "@/lib/constants";

/**
 * Ecriture des commandes via la session de l'utilisateur.
 *
 * Cote RLS, une Server Action herite de la session : les policies filtrent deja
 * sur `app_current_pressing_id()`. On conserve malgre tout un controle
 * d'appartenance explicite (`getWritableClient`) : il coute une requete et
 * protege meme si une policy etait un jour relachee par erreur.
 *
 * Le mode demonstration et la cle `service_role` ont ete supprimes a
 * l'onboarding (Phase 2 - Etape 2).
 */
async function getWritableClient(pressingId: string, orderId?: string) {
  const { db, pressing } = await getContext();
  if (!pressing || pressing.id !== pressingId) {
    throw new Error("Pressing inconnu pour la session courante.");
  }
  if (orderId) {
    const { data: order } = await db
      .from("orders")
      .select("pressing_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.pressing_id !== pressingId) {
      throw new Error("Commande introuvable pour ce pressing.");
    }
  }
  return { db, pressing };
}

/** Fait passer une commande a l'etat suivant du workflow. */
export async function advanceOrderStatus(orderId: string, pressingId: string) {
  const { db } = await getWritableClient(pressingId, orderId);

  const { data: order } = await db
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Commande introuvable.");

  const flow: OrderStatus[] = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.PICKUP_SCHEDULED,
    ORDER_STATUS.PICKED_UP,
    ORDER_STATUS.IN_PROCESSING,
    ORDER_STATUS.READY,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERED,
  ];
  const index = flow.indexOf(order.status as OrderStatus);
  const next = index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
  if (!next) throw new Error("Cette commande est deja terminee.");

  const { error } = await db
    .from("orders")
    .update({ status: next })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/livraisons");
  return next;
}

/** Enregistre un encaissement (total ou partiel) sur une commande. */
export async function recordPayment(
  orderId: string,
  pressingId: string,
  amount: number,
  method: string,
) {
  const { db } = await getWritableClient(pressingId, orderId);

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Montant invalide.");
  }

  /*
   * On delegue a la fonction Postgres `record_payment` (migration 004) plutot
   * que d'ecrire depuis ici. Deux raisons :
   *
   *   1. ATOMICITE — la fonction met a jour `orders.amount_paid` ET insere la
   *      ligne de journal dans `payments`. Deux requetes separees laisseraient,
   *      en cas d'echec de la seconde, une commande marquee payee sans trace
   *      d'encaissement : la caisse ne pourrait plus ventiler par moyen de
   *      paiement.
   *   2. PLAFONNEMENT — le montant est borne au reste du cote base, donc un
   *      double-clic ne peut pas enregistrer deux fois le solde complet.
   */
  const { error } = await db.rpc("record_payment", {
    p_order_id: orderId,
    p_amount: amount,
    p_method: method,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/caisse");
}

export interface NewOrderItem {
  articleId: string;
  articleName: string;
  quantity: number;
  unitPrice: number;
  washType: string;
}

export interface NewOrderInput {
  clientId: string;
  items: NewOrderItem[];
  deliveryType: "in_store" | "home_delivery";
  deliveryAddress?: string;
  notes?: string;
}

/**
 * Cree une commande et ses lignes.
 *
 * Le numero suit le format PR-AAAA-NNNN et est unique PAR PRESSING
 * (contrainte orders_pressing_number_uk). On le derive du plus grand numero
 * existant pour ce pressing : deux caissiers creant en meme temps peuvent
 * concourir, la contrainte reste la seule source de verite et l'echec est
 * remontee proprement.
 */
export async function createOrder(input: NewOrderInput): Promise<{ orderId: string }> {
  const { db, pressing } = await getContext();
  if (!pressing) throw new Error("Aucun pressing courant.");
  if (input.items.length === 0) throw new Error("La commande est vide.");

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const deliveryFee = input.deliveryType === "home_delivery" ? (pressing.delivery_fee ?? 0) : 0;
  const total = subtotal + deliveryFee;

  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;

  const { data: last } = await db
    .from("orders")
    .select("order_number")
    .eq("pressing_id", pressing.id)
    .like("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(1);

  const lastSeq = last?.[0]?.order_number
    ? Number.parseInt(last[0].order_number.slice(prefix.length), 10)
    : 0;
  const orderNumber = `${prefix}${String((Number.isNaN(lastSeq) ? 0 : lastSeq) + 1).padStart(4, "0")}`;

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      pressing_id: pressing.id,
      client_id: input.clientId,
      order_number: orderNumber,
      status: ORDER_STATUS.PENDING,
      pickup_type: "in_store",
      delivery_type: input.deliveryType,
      delivery_address: input.deliveryAddress ?? null,
      subtotal,
      delivery_fee: deliveryFee,
      express_fee: 0,
      discount: 0,
      total,
      payment_status: "unpaid",
      amount_paid: 0,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Creation de la commande impossible.");
  }

  const rows = input.items.map((item) => ({
    order_id: order.id,
    article_id: item.articleId,
    // Instantane : l'historique survit au renommage/suppression de l'article.
    article_name: item.articleName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    wash_type: item.washType,
  }));

  const { error: itemsError } = await db.from("order_items").insert(rows);
  if (itemsError) {
    // On ne laisse pas une commande sans ligne : la supprimer serait en
    // violation de la politique "pas de DELETE sur orders" cote RLS.
    await db.from("orders").delete().eq("id", order.id);
    throw new Error(itemsError.message);
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { orderId: order.id };
}
