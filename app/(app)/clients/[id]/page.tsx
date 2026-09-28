import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle, PlusCircle } from "lucide-react";

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
import { getClientDetail, getContext, type OrderWithClient } from "@/lib/supabase/queries";
import { statusMapping } from "@/lib/constants";
import { formatElapsed, formatFCFA } from "@/lib/utils";

/**
 * Fiche client.
 *
 * Avant cet ecran, la liste des clients etait un cul-de-sac : la carte
 * n'etait pas cliquable et l'on ne pouvait consulter ni l'historique, ni le
 * solde, ni les forfaits d'un client.
 *
 * Les totaux viennent de `ClientDetail.stats`, calcules depuis les commandes
 * (les colonnes denormalisees de `clients` ne sont maintenues par aucun
 * trigger — cf. le commentaire de `getClientSummaries`).
 */
export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { pressing } = await getContext();
  if (!pressing) notFound();

  const detail = await getClientDetail(params.id);
  if (!detail) notFound();

  const { client, orders, packs, stats } = detail;
  const phoneDigits = (client.phone ?? "").replace(/\D/g, "");

  return (
    <div className="flex flex-col gap-8">
      <Header title={client.full_name} subtitle={client.commune ?? undefined}>
        <Button asChild variant="outline">
          <Link href="/clients">Tous les clients</Link>
        </Button>
      </Header>

      <section className="grid gap-6 lg:grid-cols-3">
        {/* Identite et contact */}
        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
            <CardDescription>
              {stats.lastOrderAt
                ? `Dernière commande ${formatElapsed(stats.lastOrderAt)}`
                : "Aucune commande pour l'instant"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Téléphone</p>
              <p className="font-medium">
                {client.phone ?? "Non renseigné"}
              </p>
            </div>
            {client.email ? (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="truncate font-medium">{client.email}</p>
              </div>
            ) : null}
            {client.address ? (
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium">{client.address}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {client.phone ? (
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${client.phone}`}>
                    <Phone className="h-4 w-4" />
                    Appeler
                  </a>
                </Button>
              ) : null}
              {phoneDigits ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button asChild size="sm">
                <Link href={`/orders/new?client=${client.id}`}>
                  <PlusCircle className="h-4 w-4" />
                  Nouvelle commande
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chiffres cles */}
        <div className="grid content-start gap-4 sm:grid-cols-3 lg:col-span-2">
          <Kpi
            title="Total encaissé"
            value={formatFCFA(stats.revenue)}
            detail={`${stats.ordersCount} commande${stats.ordersCount > 1 ? "s" : ""} au total`}
          />
          <Kpi
            title="Reste à encaisser"
            value={formatFCFA(stats.outstanding)}
            detail="Sur les commandes en cours"
            tone={stats.outstanding > 0 ? "warning" : "default"}
          />
          <Kpi
            title="Points de fidélité"
            value={String(client.loyalty_points)}
            detail="Solde fidélité"
          />

          {client.notes ? (
            <Card className="border-amber-200 bg-amber-50 sm:col-span-3">
              <CardHeader>
                <CardTitle className="text-amber-900">Note interne</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-900">{client.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <ClientPacks packs={packs} />
      <ClientOrders orders={orders} />
    </div>
  );
}

/** Tuile d'indicateur : un libelle, une valeur, une precision. */
function Kpi({
  title,
  value,
  detail,
  tone = "default",
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={
            tone === "warning"
              ? "text-2xl font-bold text-orange-600"
              : "text-2xl font-bold"
          }
        >
          {value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

/** Forfaits pre-payes du client (table `customer_packs`). */
function ClientPacks({
  packs,
}: {
  packs: {
    id: string;
    name: string;
    total_quantity: number;
    used_quantity: number;
    price: number;
    expires_at: string | null;
    status: string;
  }[];
}) {
  if (packs.length === 0) return null;

  const PACK_STATUS_LABELS: Record<string, string> = {
    active: "Actif",
    exhausted: "Épuisé",
    expired: "Expiré",
    cancelled: "Annulé",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forfaits</CardTitle>
        <CardDescription>
          Forfaits pré-payés : chaque lavage décrémente le quota restant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Forfait</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead>Consommation</TableHead>
              <TableHead>Expire le</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packs.map((pack) => {
              const remaining = pack.total_quantity - pack.used_quantity;

              return (
                <TableRow key={pack.id}>
                  <TableCell className="font-medium">{pack.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFCFA(pack.price)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* Jauge : la largeur represente la part RESTANTE,
                          donc elle se vide a l'usage. */}
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{
                            width: `${Math.round(
                              pack.total_quantity > 0
                                ? (remaining / pack.total_quantity) * 100
                                : 0,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-sm text-muted-foreground">
                        {remaining} / {pack.total_quantity}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pack.expires_at
                      ? new Date(pack.expires_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pack.status === "active" ? "success" : "muted"}
                    >
                      {PACK_STATUS_LABELS[pack.status] ?? pack.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** Historique des commandes du client. */
function ClientOrders({ orders }: { orders: OrderWithClient[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des commandes</CardTitle>
        <CardDescription>
          Les {orders.length} commande{orders.length > 1 ? "s" : ""} de ce
          client, de la plus récente à la plus ancienne.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Payé</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableEmpty colSpan={5}>
                Aucune commande. La première apparaîtra ici.
              </TableEmpty>
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
                    <TableCell>
                      {status ? (
                        <Badge variant={status.variant}>{status.label}</Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {order.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatFCFA(order.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatFCFA(order.amount_paid ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("fr-FR")}
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

