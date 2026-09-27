import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { StatCard } from "@/components/mobile/stat-card";
import { EmptyState } from "@/components/mobile/order-card";
import { getContext, getNotificationCounts, getNotifications } from "@/lib/supabase/queries";
import { formatRelativeDate, staggerStyle } from "@/lib/utils";

export const metadata = { title: "Notifications" };

/** Libelles des etats de la file d'envoi (table `notifications`). */
const NOTIFICATION_STATUS: Record<string, { label: string; className: string }> = {
  queued: { label: "En attente", className: "bg-slate-100 text-slate-600" },
  sending: { label: "En cours", className: "bg-blue-100 text-blue-700" },
  sent: { label: "Envoyé", className: "bg-green-100 text-green-700" },
  failed: { label: "Échec", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulé", className: "bg-slate-100 text-slate-400" },
};

/** Libelles des canaux d'envoi. */
const CHANNEL_ICONS: Record<string, string> = {
  sms: "📱",
  whatsapp: "💬",
  email: "✉️",
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
    return (
      <Screen>
        <ScreenHeader title="Notifications" />
      </Screen>
    );
  }

  const [counts, notifications] = await Promise.all([
    getNotificationCounts(pressing.id),
    getNotifications(pressing.id),
  ]);

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        subtitle="File d'envoi SMS et WhatsApp"
        backHref="/plus"
      />

      <div className="grid grid-cols-2 gap-3 px-5">
        <StatCard
          index={0}
          icon="📤"
          iconClass="bg-slate-100"
          value={counts.queued}
          label="En attente d'envoi"
        />
        <StatCard
          index={1}
          icon="✅"
          iconClass="bg-green-50"
          value={counts.sent}
          label="Envoyées"
        />
        {counts.failed > 0 ? (
          <StatCard
            index={2}
            className="col-span-2"
            icon="⚠️"
            iconClass="bg-red-50"
            value={counts.failed}
            label="Échecs à relancer"
            accent="text-red-600"
          />
        ) : null}
      </div>

      <section className="mt-6 px-5">
        <SectionTitle>Journal d&apos;envoi</SectionTitle>

        {notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Aucune notification"
            hint="L'envoi automatique des SMS et messages WhatsApp n'est pas encore activé : cette file se remplira dès qu'il le sera."
          />
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
            {notifications.map((notification, index) => {
              const status =
                NOTIFICATION_STATUS[notification.status] ?? {
                  label: notification.status,
                  className: "bg-slate-100 text-slate-600",
                };

              return (
                <div
                  key={notification.id}
                  className="stagger-item flex items-start gap-3 p-3"
                  style={staggerStyle(index)}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base"
                    aria-hidden
                  >
                    {CHANNEL_ICONS[notification.channel] ?? "🔔"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {EVENT_LABELS[notification.event ?? ""] ?? notification.event ?? "Notification"}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {notification.message}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {notification.recipient} · {formatRelativeDate(notification.created_at)}
                      {notification.retries > 0 ? ` · ${notification.retries} tentative(s)` : ""}
                    </p>

                    {notification.error_message ? (
                      <p className="mt-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700">
                        {notification.error_message}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Screen>
  );
}
