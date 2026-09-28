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
import { getContext, getNotificationCounts, getNotifications } from "@/lib/supabase/queries";
import { formatRelativeDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

/** Libelles des etats de la file d'envoi (table `notifications`). */
const STATUS_LABELS: Record<string, string> = {
  queued: "En attente",
  sending: "En cours",
  sent: "Envoyé",
  failed: "Échec",
  cancelled: "Annulé",
};

/**
 * Variante de badge associee a chaque etat.
 *
 * Un etat inconnu retombe sur "muted" plutot que de produire une classe
 * inexistante : ajouter un etat en base ne doit pas casser l'affichage.
 */
const STATUS_VARIANTS: Record<string, "muted" | "info" | "success" | "destructive"> = {
  queued: "muted",
  sending: "info",
  sent: "success",
  failed: "destructive",
  cancelled: "muted",
};

/** Libelles des canaux d'envoi. */
const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
};

/** Libelles des evenements declencheurs. */
const EVENT_LABELS: Record<string, string> = {
  order_created: "Commande enregistrée",
  order_ready: "Commande prête",
  out_for_delivery: "Commande en livraison",
  order_delivered: "Commande livrée",
  payment_received: "Paiement reçu",
  pickup_scheduled: "Collecte planifiée",
};

/**
 * Journal d'envoi SMS / WhatsApp.
 *
 * ⚠ Aucune passerelle d'envoi n'est branchee a ce stade : la table
 * `notifications` reste vide tant que le module d'envoi (Phase suivante)
 * n'existe pas. L'ecran affiche donc un etat vide explicite plutot qu'un faux
 * historique — l'objectif est de donner au gerant une vision honnete, pas de
 * simuler une fonctionnalite absente.
 */
export default async function NotificationsPage() {
  const { pressing } = await getContext();

  if (!pressing) {
    redirect("/settings");
  }

  const [counts, notifications] = await Promise.all([
    getNotificationCounts(pressing.id),
    getNotifications(pressing.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <Header title="Notifications" subtitle="File d'envoi SMS et WhatsApp" />

      <section className="grid gap-4 md:grid-cols-3">
        <Kpi title="En attente d'envoi" value={counts.queued} />
        <Kpi title="Envoyés" value={counts.sent} />
        <Kpi
          title="Échecs à relancer"
          value={counts.failed}
          tone={counts.failed > 0 ? "warning" : "default"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Journal d&apos;envoi</CardTitle>
          <CardDescription>
            L&apos;envoi automatique des SMS et messages WhatsApp n&apos;est pas
            encore activé : cette file se remplira dès qu&apos;il le sera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Événement</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableEmpty colSpan={6}>
                  Aucun envoi enregistré pour le moment.
                </TableEmpty>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium">
                      {EVENT_LABELS[notification.event ?? ""] ??
                        notification.event ??
                        "Notification"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CHANNEL_LABELS[notification.channel ?? ""] ??
                          notification.channel ??
                          "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {notification.recipient ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {notification.message ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[notification.status] ?? "muted"}>
                        {STATUS_LABELS[notification.status] ?? notification.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatRelativeDate(notification.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/** Compteur simple : un libelle et une valeur. */
function Kpi({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: number;
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
              ? "text-3xl font-bold text-orange-600"
              : "text-3xl font-bold"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
