import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
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
import { getContext, getDeliveryBoard } from "@/lib/supabase/queries";
import {
    DELIVERY_STATUS_LABELS,
    DELIVERY_TYPE_LABELS,
    statusMapping,
} from "@/lib/constants";
import { formatFCFA, formatRelativeDate } from "@/lib/utils";

export const metadata = { title: "Tournées" };

/**
 * Tournee du jour : ce qui part, ce qui revient.
 *
 * La table `deliveries` n'est alimentee par aucune action de l'application a ce
 * stade. La tournee est donc DERIVEE du statut des commandes, ce qui la rend
 * juste avec les donnees existantes ; les missions de `deliveries` sont
 * affichees en plus lorsqu'elles existent, pour l'affectation a un livreur.
 */
export default async function DeliveriesPage() {
  const { pressing } = await getContext();

  if (!pressing) {
    redirect("/onboarding/pressing");
  }

  const board = await getDeliveryBoard(pressing.id);
  const homeDeliveries = board.toDeliver.filter((order) => order.delivery_type === "home_delivery");

  return (
    <div className="flex flex-col gap-8">
      <Header
        title="Tournées"
        subtitle={`${board.toDeliver.length} à livrer · ${board.toCollect.length} à collecter`}
      />

      {board.lateOrders.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-orange-800">
              En attente depuis plus de 24 h ({board.lateOrders.length})
            </CardTitle>
            <CardDescription>
              Ces commandes sont prêtes depuis plus d&apos;une journée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Prête depuis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.lateOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>{order.client?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {DELIVERY_TYPE_LABELS[
                          order.delivery_type as keyof typeof DELIVERY_TYPE_LABELS
                        ] ?? order.delivery_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatFCFA(order.total)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {order.estimated_ready_at
                        ? formatRelativeDate(order.estimated_ready_at)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <ShipmentTable
        title="À remettre"
        hint="Commandes prêtes, à récupérer en boutique ou à livrer."
        orders={board.toDeliver}
      />

      <ShipmentTable
        title="À collecter"
        hint="Collectes à domicile restant à effectuer."
        orders={board.toCollect}
      />

      {board.missions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Missions affectées</CardTitle>
            <CardDescription>
              Tournées attribuées à un livreur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Prévue le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.missions.map((mission) => (
                  <TableRow key={mission.id}>
                    <TableCell className="font-medium">
                      {mission.order_number ?? "—"}
                    </TableCell>
                    <TableCell>{mission.client_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {DELIVERY_TYPE_LABELS[
                          mission.type as keyof typeof DELIVERY_TYPE_LABELS
                        ] ?? mission.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mission.status in DELIVERY_STATUS_LABELS ? (
                        statusMapping[mission.status] ? (
                          <Badge variant={statusMapping[mission.status].variant}>
                            {DELIVERY_STATUS_LABELS[mission.status]}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {DELIVERY_STATUS_LABELS[mission.status]}
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">
                          {mission.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {mission.scheduled_at
                        ? formatRelativeDate(mission.scheduled_at)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Tableau generique d'un lot de commandes a traiter. */
function ShipmentTable({
  title,
  hint,
  orders,
}: {
  title: string;
  hint: string;
  orders: {
    id: string;
    order_number: string;
    status: string;
    total: number;
    delivery_type: string;
    created_at: string;
    client: { full_name: string; phone: string | null } | null;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({orders.length})
        </CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableEmpty colSpan={6}>Rien à afficher.</TableEmpty>
            ) : (
              orders.map((order) => {
                const status = statusMapping[order.status];
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>{order.client?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.client?.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {DELIVERY_TYPE_LABELS[
                          order.delivery_type as keyof typeof DELIVERY_TYPE_LABELS
                        ] ?? order.delivery_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {status ? (
                        <Badge variant={status.variant}>{status.label}</Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {order.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatFCFA(order.total)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


