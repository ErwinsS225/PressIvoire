import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderActions } from "@/components/orders/order-actions";
import { getContext, getOrderDetail } from "@/lib/supabase/queries";
import {
  isStaffRole,
  ORDER_STATUS_LABELS,
  WASH_TYPE_LABELS,
  toOrderStatus,
  statusMapping,
  type OrderStatus,
} from "@/lib/constants";
import { formatElapsed, formatFCFA } from "@/lib/utils";

/** Titre d'onglet = numero de commande. */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const { db } = await getContext();
  const { data } = await db
    .from("orders")
    .select("order_number")
    .eq("id", params.id)
    .maybeSingle();
  return { title: data?.order_number ?? "Commande" };
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const { pressing, profile } = await getContext();
  const order = await getOrderDetail(params.id);

  // Le pressing est verifie explicitement : une commande d'un autre pressing
  // ne doit pas etre accessible, meme si l'UUID est connu.
  if (!order || !pressing || order.pressing_id !== pressing.id) notFound();

  const clientName = order.client?.full_name ?? "Client supprimé";
  const status = toOrderStatus(order.status);

  return (
    <div className="flex flex-col gap-8">
      <Header
        title={order.order_number}
        subtitle={`Créée ${formatElapsed(order.created_at)}`}
      >
        <Button asChild variant="outline">
          <Link href="/orders">Toutes les commandes</Link>
        </Button>
      </Header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6">
          <StatusCard
            status={status}
            estimatedReadyAt={order.estimated_ready_at}
          />

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total à payer</p>
              <p className="mt-1 text-3xl font-bold">{formatFCFA(order.total)}</p>
              {order.amount_paid > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Déjà réglé : {formatFCFA(order.amount_paid)}
                </p>
              ) : null}
              <div className="mt-3">
                {/*
                 * Paiement : vert si réglée, jaune si en cours, ROUGE si
                 * impayée. Un impayé était en gris — ce qui le faisait passer
                 * pour une simple absence d'information, alors que c'est un
                 * encours dont la caisse a besoin.
                 */}
                <Badge
                  variant={
                    order.payment_status === "paid"
                      ? "success"
                      : order.payment_status === "partial"
                        ? "warning"
                        : "danger"
                  }
                >
                  {order.payment_status === "paid"
                    ? "Payée"
                    : order.payment_status === "partial"
                      ? "Partiellement payée"
                      : "Impayée"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">{clientName}</p>
                {order.client?.phone ? (
                  <a
                    href={`tel:${order.client.phone}`}
                    className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {order.client.phone}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun téléphone
                  </p>
                )}
              </div>
              {order.client?.phone ? (
                <Button asChild variant="outline" size="icon">
                  <a
                    href={`tel:${order.client.phone}`}
                    aria-label={`Appeler ${clientName}`}
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Articles ({order.items.length})</CardTitle>
              <CardDescription>
                Le détail est figé à la création de la commande : un article
                renommé ou supprimé plus tard ne modifie pas cet historique.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Lavage</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.length === 0 ? (
                    <TableEmpty colSpan={5}>
                      Aucun article sur cette commande.
                    </TableEmpty>
                  ) : (
                    order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.article_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {WASH_TYPE_LABELS[
                            item.wash_type as keyof typeof WASH_TYPE_LABELS
                          ] ?? item.wash_type}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatFCFA(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatFCFA(item.total_price ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* `canManage` : pendant visuel de `requireStaff()`. Un compte qui n'est
          pas du personnel (role `client`) voit la commande en lecture seule
          plutot que des boutons qui echoueraient. */}
      <OrderActions
        orderId={order.id}
        pressingId={pressing.id}
        status={order.status}
        total={order.total}
        amountPaid={order.amount_paid}
        currency="FCFA"
        canManage={isStaffRole(profile?.role)}
      />
    </div>
  );
}

/** Carte de statut, avec la date de fin estimee lorsqu'elle est connue. */
function StatusCard({
  status,
  estimatedReadyAt,
}: {
  status: OrderStatus;
  estimatedReadyAt: string | null;
}) {
  const info = statusMapping[status];

  return (
    <Card>
      <CardHeader>
        <CardDescription>Statut actuel</CardDescription>
        <CardTitle className="text-2xl">
          {ORDER_STATUS_LABELS[status]}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {info ? <Badge variant={info.variant}>{info.label}</Badge> : null}
        {estimatedReadyAt ? (
          <p className="text-sm text-muted-foreground">
            Prêt estimé le{" "}
            {new Date(estimatedReadyAt).toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

