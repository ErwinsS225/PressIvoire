/**
 * Passerelles de notification — Orange SMS et WhatsApp Cloud API.
 *
 * Ce module n'est PAS un fichier de Server Actions : pas de "use server"
 * ici. La directive imposerait que chaque export soit une fonction `async`,
 * ce qui exclut les helpers synchrones (`describeProviders`), les types et les
 * interfaces exportes plus bas. Les points d'entree reellement cliquables
 * restent des Server Actions, dans `app/actions/notifications.ts` et
 * `app/actions/orders.ts`, qui importent d'ici.
 *
 * Aucun import client : ce fichier lit `process.env` et la session Supabase.
 * Les seules exceptions sont `describeProviders` et les helpers de test, tous
 * consommes depuis des Server Components ou des Server Actions.
 */
import {
  NOTIFICATION_STATUS,
  attemptRefusalReason,
  buildNotificationMessage,
  buildWhatsAppTemplateParams,
  canAttempt,
  classifySendFailure,
  composeSms,
  configuredChannels,
  describeChannelConfig,
  nextAttemptAt,
  notificationEventForStatus,
  pickChannel,
  toGatewayRecipient,
  type ChannelConfiguration,
  type NotificationChannel,
  type NotificationEvent,
  type OrderMessageContext,
  type QueueEntry,
  type SendFailure,
  type SupportedChannel,
} from "@/lib/notifications";
import { isPlanActive, resolvePlan } from "@/lib/plans";
import {
  getContext as getContextBase,
  type AppContext,
} from "@/lib/supabase/queries";
import type { Json } from "@/lib/supabase/types";
import type { OrderStatus } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/* Environnement                                                                */
/* -------------------------------------------------------------------------- */

export type NotificationEnv = Record<string, string | undefined>;

/**
 * Variables lues par les passerelles.
 *
 * `ORANGE_SMS_BASE_URL` et `WHATSAPP_TEMPLATE_LANGUAGE` sont optionnelles :
 * la premiere permet de viser une passerelle compatible OneAPI (ou un bac a
 * sable), la seconde de suivre la langue du gabarit approuve.
 */
function readEnv(): NotificationEnv {
  return {
    ORANGE_SMS_CLIENT_ID: process.env.ORANGE_SMS_CLIENT_ID,
    ORANGE_SMS_CLIENT_SECRET: process.env.ORANGE_SMS_CLIENT_SECRET,
    ORANGE_SMS_SENDER: process.env.ORANGE_SMS_SENDER,
    ORANGE_SMS_BASE_URL: process.env.ORANGE_SMS_BASE_URL,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_TEMPLATE_LANGUAGE,
  };
}

async function getContext() {
  const context = await getContextBase();
  return context;
}

/** Etat des passerelles, pour l'ecran Notifications. */
export function describeProviders(): ChannelConfiguration[] {
  return describeChannelConfig(readEnv());
}

/* -------------------------------------------------------------------------- */
/* Constantes de transport                                                      */
/* -------------------------------------------------------------------------- */

const ORANGE_TOKEN_URL = "https://api.orange.com/oauth/v3/token";
const ORANGE_DEFAULT_BASE_URL = "https://api.orange.com";
/** Version du Graph API Meta, figee : une version qui disparait casserait tout. */
const WHATSAPP_GRAPH_BASE_URL = "https://graph.facebook.com/v21.0";

/** Au-dela, on considere la passerelle injoignable et on relancera plus tard. */
const SEND_TIMEOUT_MS = 10_000;

/** On rafraichit le jeton une minute avant son echeance, pas apres. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

interface CachedToken {
  token: string;
  expiresAt: number;
}

/*
 * Jeton OAuth2 d'Orange, garde en memoire du process.
 *
 * Sans cache, chaque SMS declencherait deux appels HTTP, et l'API d'Orange
 * limite le nombre de jetons emis — un pressing qui envoie vingt messages
 * d'affilee se ferait refuser au bout de quelques minutes.
 */
const orangeTokens = new Map<string, CachedToken>();

/** Vide le cache des jetons. Reserve aux tests : l'etat est celui du process. */
export function resetProviderCaches(): void {
  orangeTokens.clear();
}

/** Erreur HTTP d'une passerelle, avec de quoi decider d'une relance. */
class ProviderHttpError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly detail: string | null,
  ) {
    super(detail ?? `HTTP ${httpStatus}`);
    this.name = "ProviderHttpError";
  }
}

/** `response.json()` qui ne fait pas echouer l'appelant sur un corps vide. */
async function readJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Recupere un message d'erreur exploitable dans une reponse de passerelle.
 *
 * Orange et Meta n'ont pas la meme forme d'erreur, et une reponse tronquee
 * arrive vite : on cherche donc plusieurs emplacements, et on borne la taille
 * — `error_message` est affiche dans un tableau, pas dans une page.
 */
function providerDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const error = (record.error ?? null) as Record<string, unknown> | null;
  const errorData = (error?.error_data ?? null) as Record<
    string,
    unknown
  > | null;

  const candidates = [
    record.message,
    record.description,
    record.error_description,
    error?.message,
    errorData?.details,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().slice(0, 200);
    }
  }
  return null;
}

/** Une coupure de delai se distingue d'une vraie erreur de passerelle. */
function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "TimeoutError" || error.name === "AbortError";
}

/* -------------------------------------------------------------------------- */
/* Passerelle SMS : Orange OneAPI                                               */
/* -------------------------------------------------------------------------- */

/**
 * Jeton OAuth2 d'Orange, mis en cache.
 *
 * L'API SMS d'Orange fonctionne en `client_credentials` : un POST sur
 * `/oauth/v3/token`, avec l'identifiant et le secret en Basic, renvoie un jeton
 * valable une heure.
 */
async function orangeAccessToken(env: NotificationEnv): Promise<string> {
  const clientId = env.ORANGE_SMS_CLIENT_ID ?? "";
  const clientSecret = env.ORANGE_SMS_CLIENT_SECRET ?? "";
  const cacheKey = `${clientId}:${clientSecret}`;

  const cached = orangeTokens.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
    return cached.token;
  }

  const response = await fetch(ORANGE_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  const payload = await readJsonSafe(response);
  if (!response.ok) {
    throw new ProviderHttpError(response.status, providerDetail(payload));
  }

  const record = (payload ?? {}) as Record<string, unknown>;
  const token =
    typeof record.access_token === "string" ? record.access_token : null;
  if (!token) {
    throw new ProviderHttpError(
      0,
      "Jeton d'accès absent de la réponse Orange.",
    );
  }

  const expiresIn =
    typeof record.expires_in === "number" ? record.expires_in : 3600;
  orangeTokens.set(cacheKey, {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return token;
}

/**
 * Envoie un SMS via l'API Orange (GSMA OneAPI).
 *
 * Le chemin porte l'expediteur encode (`tel%3A%2B225…`) et le corps est
 * l'enveloppe `outboundSMSMessageRequest` — c'est la forme attendue par
 * l'operateur, et non un simple couple « to / text » comme chez la plupart des
 * agregateurs.
 */
async function sendOrangeSms(input: {
  recipient: string;
  text: string;
  env: NotificationEnv;
}): Promise<string | null> {
  const token = await orangeAccessToken(input.env);
  const senderAddress = orangeSenderAddress(input.env.ORANGE_SMS_SENDER ?? "");
  const baseUrl = input.env.ORANGE_SMS_BASE_URL || ORANGE_DEFAULT_BASE_URL;

  const response = await fetch(
    `${baseUrl}/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: `tel:${input.recipient}`,
          senderAddress,
          outboundSMSTextMessage: { message: input.text },
        },
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    },
  );

  const payload = await readJsonSafe(response);
  if (!response.ok) {
    throw new ProviderHttpError(response.status, providerDetail(payload));
  }

  const record = (payload ?? {}) as {
    outboundSMSMessageRequest?: { resourceURL?: string };
  };
  return record.outboundSMSMessageRequest?.resourceURL ?? null;
}

/**
 * Adresse d'expediteur attendue par Orange.
 *
 * Un numero se declare en `tel:+225…` ; un identifiant alphanumerique (le cas de
 * `ORANGE_SMS_SENDER=PRESSINGPRO` dans `.env.example`) se declare TEL QUEL.
 * Prefixer `tel:` un nom d'expediteur le fait refuser par l'operateur.
 */
function orangeSenderAddress(sender: string): string {
  return /^\+?[0-9]+$/.test(sender) ? `tel:${sender}` : sender;
}

/* -------------------------------------------------------------------------- */
/* Passerelle WhatsApp : Cloud API de Meta                                      */
/* -------------------------------------------------------------------------- */

/**
 * Envoie un message WhatsApp depuis un gabarit approuve.
 *
 * Meta refuse le texte libre pour un message ouvert par l'entreprise (hors
 * fenetre de 24 h) : seuls les gabarits pre-approuves partent. Le numero est
 * attendu sans le `+`, contrairement a la base — conversion faite par
 * `toGatewayRecipient()`.
 */
async function sendWhatsAppTemplate(input: {
  recipient: string;
  params: string[];
  env: NotificationEnv;
}): Promise<string | null> {
  const phoneNumberId = input.env.WHATSAPP_PHONE_NUMBER_ID ?? "";

  const response = await fetch(
    `${WHATSAPP_GRAPH_BASE_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.env.WHATSAPP_ACCESS_TOKEN ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.recipient,
        type: "template",
        template: {
          name: input.env.WHATSAPP_TEMPLATE_NAME ?? "",
          language: { code: input.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr" },
          components: [
            {
              type: "body",
              parameters: input.params.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    },
  );

  const payload = await readJsonSafe(response);
  if (!response.ok) {
    throw new ProviderHttpError(response.status, providerDetail(payload));
  }

  const record = (payload ?? {}) as { messages?: { id?: string }[] };
  return record.messages?.[0]?.id ?? null;
}

/* -------------------------------------------------------------------------- */
/* Envoi unitaire                                                               */
/* -------------------------------------------------------------------------- */

export interface DeliveryRequest {
  /** Canal prefere : celui de la ligne mise en file. */
  channel: NotificationChannel;
  /** Numero du destinataire, tel que stocke en base. */
  phone: string;
  /** Texte du message (SMS, et trace dans le journal). */
  message: string;
  /** Parametres positionnels du gabarit WhatsApp, dans l'ordre du gabarit. */
  templateParams?: string[];
  /** Environnement a utiliser. Par defaut `process.env`. */
  env?: NotificationEnv;
}

export type DeliveryResult =
  | {
      ok: true;
      channel: SupportedChannel;
      /** Identifiant cote passerelle, ou `null` si elle n'en renvoie pas. */
      providerId: string | null;
      /** Texte reellement transmis (mesure, et coupe si besoin). */
      text: string;
      segments: number;
    }
  | {
      ok: false;
      channel: SupportedChannel | null;
      text: string;
      segments: number;
      failure: SendFailure;
    };

/**
 * Envoie une notification par le canal disponible.
 *
 * Ne leve jamais : une passerelle en panne, un numero invalide ou un canal non
 * configure sont des REPONSES, pas des exceptions. C'est ce qui permet a
 * l'appelant de marquer la ligne et de continuer son travail.
 */
export async function deliverNotification(
  request: DeliveryRequest,
): Promise<DeliveryResult> {
  const env = request.env ?? readEnv();
  const composition = composeSms(request.message);

  const channel = pickChannel(request.channel, env);
  if (!channel) {
    return {
      ok: false,
      channel: null,
      text: composition.text,
      segments: composition.segments,
      failure: {
        retryable: false,
        message:
          "Aucune passerelle n'est configurée : renseignez les variables Orange SMS ou WhatsApp, puis relancez.",
      },
    };
  }

  const recipient = toGatewayRecipient(channel, request.phone);
  if (!recipient) {
    return {
      ok: false,
      channel,
      text: composition.text,
      segments: composition.segments,
      failure: {
        retryable: false,
        message: `Numéro de téléphone inutilisable : « ${request.phone} ».`,
      },
    };
  }

  const templateParams = request.templateParams ?? [];
  if (channel === "whatsapp" && templateParams.length === 0) {
    return {
      ok: false,
      channel,
      text: composition.text,
      segments: composition.segments,
      failure: {
        retryable: false,
        message:
          "Paramètres du gabarit WhatsApp manquants : ce message ne peut pas partir.",
      },
    };
  }

  try {
    const providerId =
      channel === "sms"
        ? await sendOrangeSms({ recipient, text: composition.text, env })
        : await sendWhatsAppTemplate({
            recipient,
            params: templateParams,
            env,
          });

    return {
      ok: true,
      channel,
      providerId,
      text: composition.text,
      segments: composition.segments,
    };
  } catch (error) {
    const failure = isTimeout(error)
      ? classifySendFailure({ timedOut: true })
      : error instanceof ProviderHttpError
        ? classifySendFailure({
            httpStatus: error.httpStatus,
            detail: error.detail,
          })
        : /* Ni delai ni reponse : la requete n'est pas partie (DNS, TLS, hors
             ligne). Relancable, et c'est le cas le plus courant en boutique. */
          classifySendFailure({});

    return {
      ok: false,
      channel,
      text: composition.text,
      segments: composition.segments,
      failure,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Mise en file                                                                 */
/* -------------------------------------------------------------------------- */

export interface QueueResult {
  queued: boolean;
  /** Pourquoi rien n'a ete mis en file — affichable tel quel au gerant. */
  reason?: string;
}

/** Met en file la notification correspondant au statut atteint par la commande. */
export async function queueOrderNotificationForStatus(
  orderId: string,
  status: OrderStatus,
): Promise<QueueResult> {
  const event = notificationEventForStatus(status);
  if (!event) {
    return {
      queued: false,
      reason: "Aucun message n'est prévu pour cette étape.",
    };
  }

  return queueOrderNotification(orderId, event);
}

/**
 * Prepare et met en file le message d'une commande.
 *
 * ⚠ Cette fonction ne leve JAMAIS. Elle est appelee depuis les Server Actions
 * de commande : si la passerelle est mal configuree ou si Supabase tousse, la
 * commande doit continuer sa vie. Le gerant verra une raison lisible dans le
 * journal ou sur l'ecran Notifications, pas une erreur 500 sur une commande
 * pourtant enregistree.
 */
export async function queueOrderNotification(
  orderId: string,
  event: NotificationEvent,
): Promise<QueueResult> {
  try {
    const { db, pressing } = await getContext();
    if (!pressing) {
      return {
        queued: false,
        reason: "Aucun pressing n'est rattaché à ce compte.",
      };
    }

    /*
     * Capacité du plan : sur le plan gratuit, on ne remplit pas la file de
     * messages qu'on n'a pas le droit d'envoyer — le gerant verrait « 12 en
     * attente » sans comprendre pourquoi rien ne part.
     */
    const plan = isPlanActive(
      pressing.subscription_plan,
      pressing.subscription_expires_at,
    )
      ? resolvePlan(pressing.subscription_plan)
      : resolvePlan("free");
    if (!plan.limits.notifications) {
      return {
        queued: false,
        reason: "Les notifications sont réservées aux plans payants.",
      };
    }

    /*
     * Sans passerelle configuree, on ne met RIEN en file : un message retrouve
     * trois jours plus tard annonce une commande deja retiree. Mieux vaut
     * prevenir une fois, sur l'ecran Notifications, que d'accumuler des
     * messages morts.
     */
    const env = readEnv();
    const channel = pickChannel("sms", env);
    if (!channel) {
      return {
        queued: false,
        reason: "Aucune passerelle SMS ou WhatsApp n'est configurée.",
      };
    }

    const { data: order } = await db
      .from("orders")
      .select(
        "id, pressing_id, client_id, order_number, total, amount_paid, pickup_scheduled_at",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.pressing_id !== pressing.id) {
      return {
        queued: false,
        reason: "Commande introuvable pour ce pressing.",
      };
    }

    const { data: client } = await db
      .from("clients")
      .select("id, phone")
      .eq("id", order.client_id)
      .maybeSingle();

    const recipient = toGatewayRecipient(channel, client?.phone ?? null);
    if (!recipient) {
      return {
        queued: false,
        reason: "Ce client n'a pas de numéro de téléphone utilisable.",
      };
    }

    const context: OrderMessageContext = {
      pressingName: pressing.name,
      orderNumber: order.order_number,
      total: order.total,
      amountPaid: order.amount_paid ?? 0,
      remaining: Math.max((order.total ?? 0) - (order.amount_paid ?? 0), 0),
      scheduledAt: order.pickup_scheduled_at,
    };

    /*
     * Le texte ET les parametres du gabarit sont figes ICI, au moment de la
     * commande : un envoi differe doit dire ce qui s'est passe ce jour-la, pas
     * ce que la commande est devenue depuis.
     */
    const { error } = await db.from("notifications").insert({
      pressing_id: pressing.id,
      order_id: order.id,
      client_id: client?.id ?? null,
      channel,
      event,
      recipient,
      message: buildNotificationMessage(event, context),
      status: NOTIFICATION_STATUS.QUEUED,
      retries: 0,
      payload: { params: buildWhatsAppTemplateParams(event, context) },
    });

    if (error) {
      return {
        queued: false,
        reason: `Mise en file impossible : ${error.message}`,
      };
    }
    return { queued: true };
  } catch (error) {
    return {
      queued: false,
      reason:
        error instanceof Error ? error.message : "Mise en file impossible.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Envoi de la file                                                             */
/* -------------------------------------------------------------------------- */

/** Une ligne de la file, telle que selectionnee pour l'envoi. */
interface QueueRow {
  id: string;
  channel: string;
  event: string | null;
  recipient: string;
  message: string;
  status: string;
  retries: number;
  attempted_at: string | null;
  next_attempt_at: string | null;
  payload: Json | null;
}

export interface DispatchOutcome {
  /** Lignes reellement presentees a la passerelle. */
  attempted: number;
  sent: number;
  failed: number;
  /** Lignes non tentees : encore en delai d'attente, ou definitivement en echec. */
  skipped: number;
  /** Compte rendu lisible, une ligne par envoi. */
  report: string[];
}

/**
 * Plafond par passage.
 *
 * Un clic ne doit pas vider 400 SMS d'un coup : au-dela, on ne maitrise plus ce
 * qui part, et le credit Orange s'evapore avant qu'on puisse arreter.
 */
const QUEUE_BATCH_LIMIT = 25;

/** Etats qui meritent encore une tentative — ou une explication au gerant. */
const ACTIVE_STATUSES: string[] = [
  NOTIFICATION_STATUS.QUEUED,
  NOTIFICATION_STATUS.FAILED,
  NOTIFICATION_STATUS.SENDING,
];

/** Parametres positionnels ranges dans `payload`, ignores si la forme est autre. */
function readTemplateParams(payload: Json | null): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return [];

  const params = (payload as Record<string, Json | undefined>).params;
  if (!Array.isArray(params)) return [];

  return params.filter((value): value is string => typeof value === "string");
}

/** "09h42" — pour dire au gerant quand une relance redeviendra possible. */
function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Envoie les notifications eligibles, puis met a jour la file.
 *
 * Deux precautions qui distinguent cet envoi d'une boucle naive :
 *   - la ligne passe en `sending` AVANT l'appel reseau : deux clics rapproches
 *     ne declenchent pas deux SMS, la seconde execution voyant l'envoi en cours ;
 *   - chaque ligne est mise a jour individuellement, afin qu'une panne au milieu
 *     du lot laisse les suivantes intactes plutot que muettes.
 */
export async function dispatchQueuedNotifications(
  db: AppContext["db"],
  pressingId: string,
  options: { onlyIds?: string[] } = {},
): Promise<DispatchOutcome> {
  const outcome: DispatchOutcome = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    report: [],
  };

  const env = readEnv();
  if (configuredChannels(env).length === 0) {
    outcome.report.push(
      "Aucune passerelle n'est configurée : aucun message n'a été envoyé.",
    );
    return outcome;
  }

  const projection =
    "id, channel, event, recipient, message, status, retries, attempted_at, next_attempt_at, payload";
  const base = db
    .from("notifications")
    .select(projection)
    .eq("pressing_id", pressingId);

  /* Relance ciblee : on n'ouvre pas toute la file, juste cette ligne. */
  const { data } = options.onlyIds?.length
    ? await base.in("id", options.onlyIds).limit(QUEUE_BATCH_LIMIT)
    : await base
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: true })
        .limit(QUEUE_BATCH_LIMIT);

  const rows = (data ?? []) as QueueRow[];
  const now = new Date();

  for (const row of rows) {
    const entry: QueueEntry = {
      status: row.status,
      retries: row.retries,
      attempted_at: row.attempted_at,
    };

    if (!canAttempt(entry, now)) {
      outcome.skipped += 1;
      outcome.report.push(attemptRefusalReason(entry) ?? "Envoi ignoré.");
      continue;
    }

    if (
      row.next_attempt_at &&
      new Date(row.next_attempt_at).getTime() > now.getTime()
    ) {
      outcome.skipped += 1;
      outcome.report.push(
        `En attente : nouvelle tentative possible à ${formatClock(row.next_attempt_at)}.`,
      );
      continue;
    }

    const attempts = row.retries + 1;
    outcome.attempted += 1;

    await db
      .from("notifications")
      .update({
        status: NOTIFICATION_STATUS.SENDING,
        retries: attempts,
        attempted_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    const result = await deliverNotification({
      channel: row.channel as NotificationChannel,
      phone: row.recipient,
      message: row.message,
      templateParams: readTemplateParams(row.payload),
      env,
    });

    if (result.ok) {
      outcome.sent += 1;
      await db
        .from("notifications")
        .update({
          status: NOTIFICATION_STATUS.SENT,
          sent_at: new Date().toISOString(),
          error_message: null,
          next_attempt_at: null,
        })
        .eq("id", row.id);

      outcome.report.push(
        `Envoyé à ${row.recipient} (${result.channel.toUpperCase()}, ${result.segments} SMS).`,
      );
      continue;
    }

    /*
     * Echec : la ligne reste consultable avec sa raison. On ne la repute
     * relancable que si l'incident peut se resoudre tout seul — une cle refusee
     * ou un numero invalide resteront faux, autant le dire tout de suite.
     */
    outcome.failed += 1;
    const retryable =
      result.failure.retryable &&
      canAttempt({ status: "failed", retries: attempts }, now);

    await db
      .from("notifications")
      .update({
        status: NOTIFICATION_STATUS.FAILED,
        error_message: result.failure.message,
        next_attempt_at: retryable
          ? nextAttemptAt(attempts, now).toISOString()
          : null,
      })
      .eq("id", row.id);

    outcome.report.push(
      retryable
        ? `Échec : ${result.failure.message}`
        : `Échec définitif : ${result.failure.message}`,
    );
  }

  return outcome;
}

/* -------------------------------------------------------------------------- */
/* Gestion de la file d'attente                                                */
/* -------------------------------------------------------------------------- */

/**
 * Traite les notifications en file d'attente qui sont éligibles à l'envoi.
 */
async function processNotificationQueue(pressingId: string) {
  const { db } = await getContext();
  await dispatchQueuedNotifications(db, pressingId);
}

/**
 * Relance une notification qui a échoué.
 */
async function retryNotification(notificationId: string, pressingId: string) {
  const { db } = await getContext();
  await dispatchQueuedNotifications(db, pressingId, {
    onlyIds: [notificationId],
  });
}

/**
 * Annule une notification (marque comme cancelled).
 */
async function cancelNotification(notificationId: string) {
  const { db } = await getContext();

  await db
    .from("notifications")
    .update({ status: "cancelled" })
    .eq("id", notificationId);
}

/**
 * Supprime les notifications terminées (sent ou cancelled) de la file.
 */
async function clearQueue() {
  const { db } = await getContext();

  const { data: deleted } = await db
    .from("notifications")
    .delete()
    .in("status", ["sent", "cancelled"]);

  return { deleted };
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                     */
/* -------------------------------------------------------------------------- */

export {
  processNotificationQueue,
  retryNotification,
  cancelNotification,
  clearQueue,
};
