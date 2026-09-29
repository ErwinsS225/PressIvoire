/**
 * Domaine des notifications client (SMS / WhatsApp).
 *
 * Module PUR : ni reseau, ni Next, ni Supabase — donc importable aussi bien par
 * un Server Component que par un composant client. L'ecran /notifications s'en
 * sert pour l'apercu du message ; les appels aux passerelles vivent dans
 * `lib/notifications-server.ts`.
 *
 * Pourquoi separer ainsi ? Parce que la partie qui coute cher a deboguer (un
 * numero mal normalise, un message qui part en deux SMS, une relance qui ne
 * relance rien) n'a besoin ni de base de donnees ni de passerelle pour etre
 * verifiee. Tout ce qui est decide ici est teste dans `notifications.test.ts`,
 * sans reseau.
 *
 * ⚠ Les notifications sont une capacite du plan Pro (`lib/plans.ts`) : le
 * controle d'acces est fait cote serveur, dans la Server Action, pas ici.
 */

import { normalizeIvorianPhone, isValidIvorianPhone } from "@/lib/utils";
import { type OrderStatus } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/* Vocabulaire                                                                  */
/* -------------------------------------------------------------------------- */

/** Canaux d'envoi, alignes sur le CHECK de `notifications.channel`. */
export const NOTIFICATION_CHANNELS = ["sms", "whatsapp", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * Etats de la file, alignes sur le CHECK de `notifications.status`.
 *
 * `queued -> sending -> sent` est le chemin nominal ; `failed` est un etat
 * stable (on ne retente que sur demande), `cancelled` un etat terminal.
 */
export const NOTIFICATION_STATUS = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

/** Evenements declencheurs, alignes sur les valeurs de `notifications.event`. */
export const NOTIFICATION_EVENTS = {
  ORDER_CREATED: "order_created",
  PICKUP_SCHEDULED: "pickup_scheduled",
  ORDER_READY: "order_ready",
  OUT_FOR_DELIVERY: "out_for_delivery",
  ORDER_DELIVERED: "order_delivered",
  PAYMENT_RECEIVED: "payment_received",
} as const;
export type NotificationEvent =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

/* -------------------------------------------------------------------------- */
/* Libelles                                                                     */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  queued: "En attente",
  sending: "En cours",
  sent: "Envoyé",
  failed: "Échec",
  cancelled: "Annulé",
};

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  order_created: "Commande enregistrée",
  pickup_scheduled: "Collecte planifiée",
  order_ready: "Commande prête",
  out_for_delivery: "Commande en livraison",
  order_delivered: "Commande livrée",
  payment_received: "Paiement reçu",
};

/**
 * Variante de badge associee a un etat.
 *
 * Un etat inconnu retombe sur "muted" plutot que de produire une classe
 * inexistante : ajouter un etat en base ne doit pas casser l'affichage.
 */
export function notificationStatusVariant(
  status: string,
): "muted" | "info" | "success" | "destructive" {
  switch (status) {
    case NOTIFICATION_STATUS.SENDING:
      return "info";
    case NOTIFICATION_STATUS.SENT:
      return "success";
    case NOTIFICATION_STATUS.FAILED:
      return "destructive";
    default:
      return "muted";
  }
}

/** Libelle affichable, avec repli sur la valeur brute si l'etat est inconnu. */
export function notificationStatusLabel(status: string): string {
  return NOTIFICATION_STATUS_LABELS[status as NotificationStatus] ?? status;
}

/** Libelle affichable du canal, avec repli sur la valeur brute. */
export function notificationChannelLabel(channel: string): string {
  return NOTIFICATION_CHANNEL_LABELS[channel as NotificationChannel] ?? channel;
}

/** Libelle affichable de l'evenement, avec repli. */
export function notificationEventLabel(event: string | null): string {
  if (!event) return "Notification";
  return NOTIFICATION_EVENT_LABELS[event as NotificationEvent] ?? event;
}

/* -------------------------------------------------------------------------- */
/* Evenement declencheur                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Quel message merite le statut atteint par la commande.
 *
 * `null` = rien a dire au client, et c'est un choix : « collectee » et « en
 * traitement » sont des etapes internes, et un litige se traite au telephone.
 * Un SMS envoye pour rien coute de l'argent et banalise les suivants.
 */
const EVENT_BY_STATUS: Record<OrderStatus, NotificationEvent | null> = {
  pending: null,
  pickup_scheduled: NOTIFICATION_EVENTS.PICKUP_SCHEDULED,
  picked_up: null,
  in_processing: null,
  ready: NOTIFICATION_EVENTS.ORDER_READY,
  out_for_delivery: NOTIFICATION_EVENTS.OUT_FOR_DELIVERY,
  delivered: NOTIFICATION_EVENTS.ORDER_DELIVERED,
  cancelled: null,
  disputed: null,
};

export function notificationEventForStatus(
  status: OrderStatus,
): NotificationEvent | null {
  return EVENT_BY_STATUS[status] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Redaction du message                                                         */
/* -------------------------------------------------------------------------- */

/** Variables disponibles pour rediger un message. */
export interface OrderMessageContext {
  /** Nom du pressing, en tete de message : c'est l'expediteur, pas l'app. */
  pressingName: string;
  orderNumber: string;
  /** Montant total de la commande, en FCFA. */
  total?: number;
  /** Montant encaisse (evenement `payment_received`). */
  amountPaid?: number;
  /** Reste a payer apres encaissement. */
  remaining?: number;
  /** Date de la collecte planifiee (`pickup_scheduled`). */
  scheduledAt?: string | Date | null;
}

/** Date courte deterministe : "12/03 a 09h30". */
function shortDateTime(value: string | Date | null | undefined): string {
  if (!value) return "une date a confirmer";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "une date a confirmer";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} a ${pad(date.getHours())}h${pad(date.getMinutes())}`;
}

/**
 * Parametres positionnels du gabarit WhatsApp (`{{1}}`, `{{2}}`…).
 *
 * WhatsApp n'accepte PAS de texte libre pour un message ouvert par
 * l'entreprise : il faut un gabarit approuve, dont l'ordre des parametres est
 * fige. Cet ordre est donc un contrat avec le gabarit declare dans
 * `WHATSAPP_TEMPLATE_NAME` — le modifier casse l'envoi. C'est la raison pour
 * laquelle cette fonction est testee explicitement.
 */
export function buildWhatsAppTemplateParams(
  event: NotificationEvent,
  context: OrderMessageContext,
): string[] {
  const who = context.pressingName.trim() || "Votre pressing";

  switch (event) {
    case NOTIFICATION_EVENTS.ORDER_CREATED:
      return [who, context.orderNumber, "prête"];
    case NOTIFICATION_EVENTS.PICKUP_SCHEDULED:
      return [who, context.orderNumber, shortDateTime(context.scheduledAt)];
    case NOTIFICATION_EVENTS.ORDER_READY:
    case NOTIFICATION_EVENTS.OUT_FOR_DELIVERY:
    case NOTIFICATION_EVENTS.ORDER_DELIVERED:
      return [who, context.orderNumber];
    case NOTIFICATION_EVENTS.PAYMENT_RECEIVED:
      return [
        who,
        amount(context.amountPaid),
        context.orderNumber,
        context.remaining ? amount(context.remaining) : "0",
      ];
    default: {
      const unreachable: never = event;
      return [who, context.orderNumber, String(unreachable)];
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Segmentation SMS                                                             */
/* -------------------------------------------------------------------------- */

/*
 * Un SMS n'est pas un texte de 160 caracteres : c'est un texte de 160
 * caracteres dans l'alphabet GSM 7 bits, ou de 70 seulement des qu'un caractere
 * sort de cet alphabet — l'operateur bascule alors tout le message en UCS-2.
 * Le cas n'a rien de theorique en francais : « prête » contient un ê, absent de
 * GSM 7 bits, donc CHAQUE message « commande prete » est facture au double.
 * D'ou `composeSms()`, qui mesure avant d'envoyer et coupe proprement.
 */

/** Alphabet GSM 03.38 par defaut (chaque caractere = 1 unite). */
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/** Caracteres etendus : precedee d'un ESC, chacun compte pour 2 unites. */
const GSM7_EXTENDED = "^{}\\[~]|€";

const GSM7_BASIC_SET = new Set(GSM7_BASIC);
const GSM7_EXTENDED_SET = new Set(GSM7_EXTENDED);

const SMS_LIMITS = {
  gsm7: { single: 160, multi: 153 },
  ucs2: { single: 70, multi: 67 },
} as const;

/** Longueur d'un texte dans l'alphabet GSM 7 bits, ou `null` s'il en sort. */
function gsm7Length(text: string): number | null {
  let length = 0;
  for (const char of text) {
    if (GSM7_EXTENDED_SET.has(char)) length += 2;
    else if (GSM7_BASIC_SET.has(char)) length += 1;
    else return null;
  }
  return length;
}

export interface SmsComposition {
  /** Texte final, eventuellement tronque. */
  text: string;
  encoding: "gsm7" | "ucs2";
  /** Longueur facturee : un caractere etendu compte 2 en GSM 7 bits. */
  length: number;
  segments: number;
  /** `true` si le texte a ete coupe pour tenir dans `maxSegments`. */
  truncated: boolean;
}

/** Mesure un texte : encodage, longueur facturee, nombre de segments. */
export function measureSms(text: string): Omit<SmsComposition, "truncated"> {
  const normalized = text.replace(/\s+/g, " ").trim();
  const gsm7 = gsm7Length(normalized);

  if (gsm7 !== null) {
    return {
      text: normalized,
      encoding: "gsm7",
      length: gsm7,
      segments:
        gsm7 <= SMS_LIMITS.gsm7.single
          ? Math.max(1, Math.ceil(gsm7 / SMS_LIMITS.gsm7.single))
          : Math.ceil(gsm7 / SMS_LIMITS.gsm7.multi),
    };
  }

  // Hors GSM 7 bits : l'operateur compte des points de code, pas des octets.
  const codePoints = [...normalized].length;
  return {
    text: normalized,
    encoding: "ucs2",
    length: codePoints,
    segments:
      codePoints <= SMS_LIMITS.ucs2.single
        ? Math.max(1, Math.ceil(codePoints / SMS_LIMITS.ucs2.single))
        : Math.ceil(codePoints / SMS_LIMITS.ucs2.multi),
  };
}

/** Nombre de segments factures, sans autre detail. */
export function smsSegments(text: string): number {
  return measureSms(text).segments;
}

/** Plafond d'envoi : au-dela de 2 SMS, le message est coupe. */
export const MAX_SMS_SEGMENTS = 2;

/**
 * Prepare un texte pour l'envoi, en le coupant si necessaire.
 *
 * La coupe se fait sur un espace, jamais au milieu d'un mot, et se signale par
 * "..." — trois points ASCII, la seule ellipse disponible en GSM 7 bits (le
 * caractere « … » ferait basculer le message en UCS-2 a lui seul).
 */
export function composeSms(
  text: string,
  maxSegments: number = MAX_SMS_SEGMENTS,
): SmsComposition {
  const measured = measureSms(text);
  if (measured.segments <= maxSegments) {
    return { ...measured, truncated: false };
  }

  const { encoding } = measured;
  const unitLimit =
    maxSegments <= 1
      ? SMS_LIMITS[encoding].single
      : maxSegments * SMS_LIMITS[encoding].multi;
  const fits = (candidate: string) => {
    const candidateMeasure = measureSms(candidate);
    return (
      candidateMeasure.encoding === encoding &&
      candidateMeasure.length <= unitLimit
    );
  };

  const chars = [...measured.text];
  let truncatedText = "";

  /*
   * Coupe propre : on retire des MOTS entiers, jamais des caracteres. Une phrase
   * coupee au milieu d'un mot (« votre commande PR-2026-00... ») est illisible
   * et fait douter de la legitimite du message.
   */
  const kept: string[] = [];
  for (const word of measured.text.split(" ")) {
    const candidate = [...kept, word].join(" ");
    if (fits(`${candidate}...`)) kept.push(word);
    else break;
  }
  if (kept.length > 0) truncatedText = `${kept.join(" ")}...`;

  /*
   * Cas extreme : un seul mot plus long que le budget (nom de pressing
   * interminable). Faute de pouvoir couper proprement, on coupe en plein mot —
   * un message tronque reste preferable a un message jamais envoye.
   */
  while (!truncatedText && chars.length > 0) {
    chars.pop();
    const candidate = chars.join("").trimEnd();
    if (fits(`${candidate}...`)) truncatedText = `${candidate}...`;
  }

  if (!truncatedText) return { ...measured, truncated: false };

  return { ...measureSms(truncatedText), truncated: true };
}

/* -------------------------------------------------------------------------- */
/* Politique de relance                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Nombre de tentatives automatiques avant de classer l'envoi en echec.
 *
 * Trois : au-dela, l'incident n'est plus un alea de reseau mais un probleme de
 * configuration (cle expiree, numero invalide), et insister ne fait que
 * consommer du credit sans rien changer.
 */
export const MAX_SEND_ATTEMPTS = 3;

/** Delai avant la 2e puis la 3e tentative, en millisecondes. */
export const RETRY_BACKOFF_MS = [60_000, 300_000] as const;

/**
 * Delai a respecter avant la prochaine tentative.
 *
 * `retries` = nombre de tentatives DEJA effectuees (semantique de la colonne
 * `notifications.retries`, incrementee a chaque appel). Un envoi jamais tente
 * (0) part immediatement ; apres deux echecs, on attend une minute puis cinq.
 */
export function nextAttemptDelayMs(retries: number): number {
  if (retries <= 0) return 0;
  const index = Math.min(retries, RETRY_BACKOFF_MS.length) - 1;
  return RETRY_BACKOFF_MS[index] ?? 0;
}

/** Date a laquelle une ligne redevient eligible, apres `retries` echecs. */
export function nextAttemptAt(retries: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + nextAttemptDelayMs(retries));
}

/** Etat minimal d'une ligne de la file, pour decider. */
export interface QueueEntry {
  status: string;
  retries: number;
  /** Date de la derniere tentative (`attempted_at`) si elle a ete enregistree. */
  attempted_at?: string | null;
}

/**
 * Peut-on (re)lancer cette ligne ?
 *
 * Trois cas sont refuses volontairement :
 *   - `sent` et `cancelled` : etats finaux, reenvoyer ferait doublon ;
 *   - `sending` depuis moins de `STALLED_SENDING_MS` : un autre appel est en
 *     cours, on ne double pas l'envoi ;
 *   - `failed` au-dela du plafond : un humain doit regarder.
 */
export const STALLED_SENDING_MS = 5 * 60_000;

export function canAttempt(
  entry: QueueEntry,
  now: Date = new Date(),
): boolean {
  if (entry.status === NOTIFICATION_STATUS.QUEUED) return true;
  if (entry.status === NOTIFICATION_STATUS.SENT) return false;
  if (entry.status === NOTIFICATION_STATUS.CANCELLED) return false;

  if (entry.status === NOTIFICATION_STATUS.SENDING) {
    /*
     * Un envoi reste `sending` parce que le process est mort en vol. Sans cette
     * porte de sortie, la ligne resterait bloquee pour toujours : la file n'a
     * pas de balayeur automatique.
     */
    if (!entry.attempted_at) return false;
    const attempted = new Date(entry.attempted_at).getTime();
    if (Number.isNaN(attempted)) return false;
    return now.getTime() - attempted > STALLED_SENDING_MS;
  }

  if (entry.status === NOTIFICATION_STATUS.FAILED) {
    return entry.retries < MAX_SEND_ATTEMPTS;
  }

  return false;
}

/** Motif d'un refus de relance, pret a etre affiche au gerant. */
export function attemptRefusalReason(entry: QueueEntry): string | null {
  if (canAttempt(entry)) return null;

  switch (entry.status) {
    case NOTIFICATION_STATUS.SENT:
      return "Ce message est déjà parti.";
    case NOTIFICATION_STATUS.CANCELLED:
      return "Ce message a été annulé.";
    case NOTIFICATION_STATUS.SENDING:
      return "Un envoi est déjà en cours pour ce message.";
    default:
      return `Échec définitif après ${entry.retries} tentatives : vérifiez le numéro du client ou la configuration de la passerelle.`;
  }
}

/* -------------------------------------------------------------------------- */
/* Machine a etats                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Transitions autorisees, alignees sur la realite de la file.
 *
 * Construite a partir de `NOTIFICATION_STATUS` : chaque etat doit y figurer.
 * `sent` et `cancelled` sont terminaux ; `failed` peut repartir en `queued`
 * (relance manuelle) — c'est tout l'interet de garder l'echec.
 */
const ALLOWED_TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  queued: [NOTIFICATION_STATUS.SENDING, NOTIFICATION_STATUS.CANCELLED],
  sending: [
    NOTIFICATION_STATUS.SENT,
    NOTIFICATION_STATUS.FAILED,
    NOTIFICATION_STATUS.QUEUED,
  ],
  sent: [],
  failed: [NOTIFICATION_STATUS.QUEUED, NOTIFICATION_STATUS.CANCELLED],
  cancelled: [],
};

export function canTransition(
  from: NotificationStatus,
  to: NotificationStatus,
): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/* -------------------------------------------------------------------------- */
/* Redaction du message                                                         */
/* -------------------------------------------------------------------------- */


/** Montant sans devise, pour rester court : 4000 -> "4 000". */
function amount(value: number | undefined): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR").format(value);
}

/**
 * Redige le message envoye au client.
 *
 * Trois regles de redaction, apprises du terrain :
 *   1. le nom du pressing ouvre le message — le client doit savoir qui ecrit
 *      avant de lire la suite, sans quoi il prend le SMS pour du demarchage ;
 *   2. l'information utile vient en premier (l'action a faire), la formule de
 *      politesse en dernier : si le message doit etre tronque, c'est elle qui
 *      saute ;
 *   3. pas de lien : un lien raccourci inconnu est lu comme une tentative de
 *      fraude, et le message est bloque.
 */
export function buildNotificationMessage(
  event: NotificationEvent,
  context: OrderMessageContext,
): string {
  const who = context.pressingName.trim() || "Votre pressing";
  const num = context.orderNumber;

  switch (event) {
    case NOTIFICATION_EVENTS.ORDER_CREATED:
      return `${who} : commande ${num} enregistrée. Nous vous préviendrons dès qu'elle sera prête.`;

    case NOTIFICATION_EVENTS.PICKUP_SCHEDULED:
      return `${who} : collecte de la commande ${num} planifiée le ${shortDateTime(context.scheduledAt)}. Merci de préparer vos articles.`;

    case NOTIFICATION_EVENTS.ORDER_READY:
      return `${who} : votre commande ${num} est prête. Vous pouvez venir la retirer.`;

    case NOTIFICATION_EVENTS.OUT_FOR_DELIVERY:
      return `${who} : votre commande ${num} est en route. Le livreur vous appelle avant d'arriver.`;

    case NOTIFICATION_EVENTS.ORDER_DELIVERED:
      return `${who} : commande ${num} livrée. Merci de votre confiance.`;

    case NOTIFICATION_EVENTS.PAYMENT_RECEIVED:
      if (!context.remaining) {
        return `${who} : paiement de ${amount(context.amountPaid)} reçu. La commande ${num} est entièrement payée.`;
      }
      return `${who} : paiement de ${amount(context.amountPaid)} reçu sur la commande ${num}. Reste à payer : ${amount(context.remaining)}.`;

    default: {
      /* Garde d'exhaustivite : ajouter un evenement sans message ne compile pas. */
      const unreachable: never = event;
      return `${who} : mise à jour de la commande ${num} (${String(unreachable)}).`;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Classification des erreurs fournisseur                                       */
/* -------------------------------------------------------------------------- */

/** Ce qu'il faut retenir d'un echec d'envoi. */
export interface SendFailure {
  /** Faut-il retenter automatiquement ? */
  retryable: boolean;
  /** Explication en francais, stockee dans `notifications.error_message`. */
  message: string;
}

/**
 * Traduit une reponse de passerelle en decision de relance.
 *
 * La regle qui compte : ne JAMAIS classer un 5xx en echec definitif. Orange
 * comme Meta repondent 500 quand leurs propres dependances hoquetent ; un
 * message perdu pour cette raison, c'est un client qui ne vient pas chercher son
 * linge. A l'inverse, un 401 (cle refusee) ou un 400 (numero invalide) ne
 * s'arrangera pas en reessayant : autant le dire tout de suite, en francais.
 */
export function classifySendFailure(input: {
  httpStatus?: number | null;
  timedOut?: boolean;
  detail?: string | null;
}): SendFailure {
  const detail = input.detail?.trim();

  if (input.timedOut) {
    return {
      retryable: true,
      message: "La passerelle n'a pas répondu à temps.",
    };
  }

  const status = input.httpStatus ?? 0;

  /* 0 = la requete n'est jamais partie (DNS, TLS, hors ligne). */
  if (status === 0) {
    return {
      retryable: true,
      message: "Passerelle injoignable (problème réseau).",
    };
  }
  if (status === 401 || status === 403) {
    return {
      retryable: false,
      message:
        "Identifiants refusés par la passerelle : vérifiez la configuration SMS / WhatsApp.",
    };
  }
  if (status === 429) {
    return {
      retryable: true,
      message: "Passerelle saturée (trop de requêtes) : nouvel essai plus tard.",
    };
  }
  if (status === 400 || status === 404 || status === 422) {
    return {
      retryable: false,
      message: detail
        ? `Destinataire ou gabarit refusé : ${detail}`
        : "Destinataire ou gabarit refusé par la passerelle.",
    };
  }
  if (status >= 500) {
    return {
      retryable: true,
      message: `Panne de la passerelle (${status}) : nouvel essai plus tard.`,
    };
  }

  return {
    retryable: false,
    message: detail
      ? `Refus de la passerelle (${status}) : ${detail}`
      : `Refus de la passerelle (${status}).`,
  };
}

/* -------------------------------------------------------------------------- */
/* Configuration des passerelles                                                */
/* -------------------------------------------------------------------------- */

/** Canaux pour lesquels une passerelle est reellement implementee. */
export const SUPPORTED_CHANNELS = ["sms", "whatsapp"] as const;
export type SupportedChannel = (typeof SUPPORTED_CHANNELS)[number];

/**
 * Variables d'environnement requises par canal, dans l'ordre de `.env.example`.
 *
 * `email` n'y figure pas : le seul envoi d'email du produit est celui de
 * Supabase Auth (confirmation de compte, mot de passe), qui ne passe pas par
 * cette file. Mieux vaut un canal absent qu'un canal qui pretend envoyer.
 */
export const CHANNEL_ENV_VARS: Record<SupportedChannel, string[]> = {
  sms: ["ORANGE_SMS_CLIENT_ID", "ORANGE_SMS_CLIENT_SECRET", "ORANGE_SMS_SENDER"],
  whatsapp: [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_TEMPLATE_NAME",
  ],
};

/** Etat de configuration d'un canal, tel qu'affiche sur l'ecran Notifications. */
export interface ChannelConfiguration {
  channel: SupportedChannel;
  configured: boolean;
  /** Variables manquantes — nommees, pour que le gerant sache quoi demander. */
  missing: string[];
}

/**
 * Etat des passerelles, a partir d'un environnement donne.
 *
 * L'environnement est passe en parametre plutot que lu dans `process.env` :
 * c'est ce qui rend la fonction testable sans toucher a l'environnement du
 * process, et ce qui permet a l'appelant serveur de resoudre les variables ou
 * il veut.
 */
export function describeChannelConfig(
  env: Record<string, string | undefined>,
): ChannelConfiguration[] {
  return SUPPORTED_CHANNELS.map((channel) => {
    const missing = CHANNEL_ENV_VARS[channel].filter((name) => !env[name]);
    return { channel, configured: missing.length === 0, missing };
  });
}

/** Canaux utilisables dans cet environnement. */
export function configuredChannels(
  env: Record<string, string | undefined>,
): SupportedChannel[] {
  return describeChannelConfig(env)
    .filter((entry) => entry.configured)
    .map((entry) => entry.channel);
}

/**
 * Canal effectivement utilise pour un envoi.
 *
 * Si le canal prefere n'est pas configure, on bascule sur l'autre s'il l'est :
 * un client sans compte WhatsApp doit quand meme recevoir son SMS. Si aucun
 * n'est configure, on renvoie `null` — la ligne reste alors en file, au lieu
 * d'etre marquee envoyee a tort.
 */
export function pickChannel(
  preferred: NotificationChannel,
  env: Record<string, string | undefined>,
): SupportedChannel | null {
  const available = configuredChannels(env);
  if (available.length === 0) return null;

  if (available.includes(preferred as SupportedChannel)) {
    return preferred as SupportedChannel;
  }
  return available[0] ?? null;
}

/**
 * Numero tel qu'attendu par la passerelle, ou `null` si inutilisable.
 *
 * Deux formats, deux conventions : Orange attend une adresse E.164 en tete de
 * requete (`tel:+2250707070707`), la Cloud API de Meta attend le numero
 * international SANS le `+` (2250707070707). La base, elle, stocke `+225…`
 * (CHECK de `clients.phone`) — d'ou cette conversion, seule et unique.
 */
export function toGatewayRecipient(
  channel: NotificationChannel,
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;

  const normalized = normalizeIvorianPhone(phone);
  if (!isValidIvorianPhone(normalized)) return null;

  if (channel === "whatsapp") return normalized.replace("+", "");
  if (channel === "sms") return normalized;
  return null;
}


