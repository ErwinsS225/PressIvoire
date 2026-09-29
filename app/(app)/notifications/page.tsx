import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { UpgradeRequired } from "@/components/subscription/upgrade-required";
import { getEffectivePlan } from "@/lib/subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { describeProviders } from "@/lib/notifications-server";
import { processQueue, retryNotificationAction, cancelNotificationAction, clearQueue } from "@/app/actions/notifications";
import {
  notificationStatusVariant,
  notificationStatusLabel,
  notificationChannelLabel,
  notificationEventLabel,
  attemptRefusalReason,
  canAttempt,
  type QueueEntry,
} from "@/lib/notifications";
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
    redirect("/onboarding/pressing");
  }

  /*
   * Les notifications SMS et WhatsApp sont une capacité Pro.
   * L'accès est contrôlé ici pour l'affichage de l'écran.
   */
  const context = await getEffectivePlan();
  if (context && !context.limits.notifications) {
    return (
      <div className="flex flex-col gap-8">
        <Header title="Notifications" subtitle="File d'envoi SMS et WhatsApp" />
        <UpgradeRequired
          feature="les notifications SMS et WhatsApp"
          currentPlanId={context.plan.id}
        />
      </div>
    );
  }

  const providers = describeProviders();
  const hasConfiguredProvider = providers.some(p => p.configured);

  const [counts, notifications] = await Promise.all([
    getNotificationCounts(pressing.id),
    getNotifications(pressing.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <Header title="Notifications" subtitle="File d'envoi SMS et WhatsApp" />

      {!hasConfiguredProvider && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertDescription className="text-amber-800">
            ⚠️ Aucune passerelle de notification n&apos;est configurée. Renseignez les variables d&apos;environnement
            pour Orange SMS ou WhatsApp Cloud pour activer l&apos;envoi automatique.
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-wrap gap-4">
        <div className="grid gap-4 md:grid-cols-3 flex-1 min-w-[300px]">
          <Kpi title="En attente d'envoi" value={counts.queued} />
          <Kpi title="Envoyés" value={counts.sent} />
          <Kpi
            title="Échecs à relancer"
            value={counts.failed}
            tone={counts.failed > 0 ? "warning" : "default"}
          />
        </div>
        <div className="flex flex-col gap-2">
          {hasConfiguredProvider && (
            <form action={processQueue}>
              <Button type="submit" className="w-full">
                Traiter la file
              </Button>
            </form>
          )}
          {(counts.sent + counts.cancelled) > 0 && (
            <form action={clearQueue}>
              <Button type="submit" variant="secondary" className="w-full">
                Vider les terminaux
              </Button>
            </form>
          )}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Journal d&apos;envoi</CardTitle>
          <CardDescription>
            {hasConfiguredProvider
              ? "Les notifications sont envoyées automatiquement. Utilisez le bouton \"Traiter la file\" pour relancer le traitement."
              : "Aucune passerelle n'est configurée : les notifications ne peuvent pas être envoyées."}
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableEmpty colSpan={7}>
                  Aucun envoi enregistré pour le moment.
                </TableEmpty>
              ) : (
                notifications.map((notification) => {
                  const entry: QueueEntry = {
                    status: notification.status,
                    retries: notification.retries ?? 0,
                    attempted_at: notification.attempted_at,
                  };
                  const canRetry = canAttempt(entry);
                  const refusalReason = attemptRefusalReason(entry);
                  const canCancel = notification.status === "queued" || notification.status === "failed";

                  return (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">
                        {notificationEventLabel(notification.event)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {notificationChannelLabel(notification.channel)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {notification.recipient ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {notification.message ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={notificationStatusVariant(notification.status)}>
                          {notificationStatusLabel(notification.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeDate(notification.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canRetry && hasConfiguredProvider && (
                            <form action={async () => {
                              'use server';
                              await retryNotificationAction(notification.id);
                            }}>
                              <Button type="submit" size="sm" variant="secondary">
                                Relancer
                              </Button>
                            </form>
                          )}
                          {canCancel && (
                            <form action={async () => {
                              'use server';
                              await cancelNotificationAction(notification.id);
                            }}>
                              <Button type="submit" size="sm" variant="destructive">
                                Annuler
                              </Button>
                            </form>
                          )}
                          {!canRetry && refusalReason && (
                            <span className="text-xs text-muted-foreground self-center">
                              {refusalReason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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