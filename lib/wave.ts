/**
 * ⚠ SERVEUR UNIQUEMENT. Ne jamais importer depuis un composant client :
 * ce module lit `process.env` et transporte la cle API Wave.
 *
 * Passerelle de paiement — Wave Checkout API.
 *
 * Reference : https://docs.wave.com/checkout
 *   Base      : https://api.wave.com
 *   Auth      : Authorization: Bearer wave_sn_prod_...
 *   Creer     : POST /v1/checkout/sessions
 *   Consulter : GET  /v1/checkout/sessions/:id
 *   Rembourser: POST /v1/checkout/sessions/:id/refund
 *
 * Le client paie sur la page Wave (mobile money ivoirien : Orange, MTN,
 * Moov). Nous ne recevons l'argent que par le webhook — la redirection
 * navigateur ne vaut RIEN comme preuve de paiement, car `success_url` est
 * appelable par n'importe qui.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const WAVE_API = "https://api.wave.com";

/* -------------------------------------------------------------------------- */
/* Montant                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Montant attendu par l'API : chaine, sans decimales, sans separateur.
 *
 * Le franc CFA n'a pas de sous-unite : « 5000,00 » serait rejete. On
 * arrondit aussi, parce qu'un plan tarifaire peut porter une valeur non
 * entiere et qu'un arrondi silencieux vaut mieux qu'un rejet opaque.
 */
export function formatWaveAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Montant invalide pour Wave : ${amount}`);
  }
  return String(Math.round(amount));
}

/* -------------------------------------------------------------------------- */
/* Lecture de l'evenement                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Analyse la charge utile d'un webhook.
 *
 * Renvoie `null` plutot que de lever : une charge malformee ne doit pas
 * faire tomber le handler, qui doit TOUJOURS repondre 2xx sur un evenement
 * qu'il ne comprend pas — sinon Wave reessaiera en boucle.
 */
export function parseWaveEvent(rawBody: string): WaveWebhookEvent | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const event = parsed as Partial<WaveWebhookEvent>;
    if (typeof event.id !== "string" || typeof event.type !== "string") return null;
    if (!event.data || typeof event.data !== "object") return null;

    return event as WaveWebhookEvent;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Client HTTP                                                                */
/* -------------------------------------------------------------------------- */

/** Erreur portant le code metier de Wave, pour un message utile. */
export class WaveApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "WaveApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Traduit les codes Wave en messages comprensibles.
 *
 * `unauthorized-wallet` est le cas qu'il faut savoir expliquer : le compte
 * n'a pas l'acces Checkout. Cela ne se reglera pas dans le code, mais un
 * message « Unauthorized » ne dit pas a l'utilisateur qu'il doit contacter
 * Wave pour obtenir l'acces.
 */
function describeWaveError(body: WaveErrorBody | null, status: number): string {
  switch (body?.error_code ?? body?.code) {
    case "unauthorized-wallet":
      return "Le compte Wave n'a pas encore acces a l'API Checkout. Contactez Wave pour l'activer.";
    case "authorization-error":
    case "missing-auth-header":
      return "Cle API Wave absente ou incomplete (variable WAVE_API_KEY).";
    case "request-validation-error":
      return "Donnees de paiement invalides : verifiez le montant et le numero de telephone.";
    case "insufficient-funds":
      return "Le compte du client n'a pas assez de solde.";
    case "kyb-limits-exceeded":
      return "Votre compte Wave a depasse ses plafonds. Contactez Wave pour les augmenter.";
    case "service-unavailable":
      return "Wave est momentanement indisponible. Reessayez dans quelques minutes.";
    default:
      return (
        body?.error_message ??
        body?.message ??
        `Paiement Wave refuse (HTTP ${status}).`
      );
  }
}

function waveHeaders(): Record<string, string> {
  const key = process.env.WAVE_API_KEY;
  if (!key) {
    throw new WaveApiError(
      "Cle API Wave absente : renseignez WAVE_API_KEY pour activer le paiement.",
      500,
      "missing-config",
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function waveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${WAVE_API}${path}`, {
    ...init,
    headers: { ...waveHeaders(), ...init?.headers },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as WaveErrorBody | null;
    throw new WaveApiError(describeWaveError(body, res.status), res.status, body?.error_code);
  }

  return (await res.json()) as T;
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                 */
/* -------------------------------------------------------------------------- */

export interface CreateCheckoutInput {
  /** Montant en XOF. */
  amount: number;
  customer?: WaveCustomer;
  /** Ou renvoyer le client apres paiement. */
  successUrl: string;
  cancelUrl: string;
  /**
   * Pour le nom de service affiche sur la page Wave, et pour votre
   * rapprochement comptable.
   */
  description?: string;
  /** Donnees de votre choix, restituees dans le webhook. */
  customFields?: Record<string, string>;
  /**
   * N'accepte que CE numero de telephone pour le paiement. Utile pour eviter
   * qu'un tiers regle a la place du gérant, puis debite son compte.
   */
  restrictPayerMobile?: string;
}

/** Cree une session de paiement et renvoie l'URL ou le client doit payer. */
export function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<WaveCheckoutSession> {
  return waveFetch<WaveCheckoutSession>("/v1/checkout/sessions", {
    method: "POST",
    body: JSON.stringify({
      amount: formatWaveAmount(input.amount),
      currency: "XOF",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      ...(input.description ? { description: input.description } : {}),
      ...(input.customer ? { customer: input.customer } : {}),
      ...(input.customFields ? { custom_fields: input.customFields } : {}),
      ...(input.restrictPayerMobile
        ? { restrict_payer_mobile: input.restrictPayerMobile }
        : {}),
    }),
  });
}

/**
 * Relit une session aupres de Wave.
 *
 * C'est la SEULE source de verite sur un paiement. Le webhook et la
 * redirection navigateur ne sont que des signaux : un `custom_fields`
 * forge dans une requete POST ne doit pas pouvoir commander un abonnement.
 * On confirme donc toujours aupres de l'API avant d'activer quoi que ce soit.
 */
export function retrieveCheckoutSession(
  sessionId: string,
): Promise<WaveCheckoutSession> {
  return waveFetch<WaveCheckoutSession>(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
  );
}


/**
 * Verifie la signature d'un webhook.
 *
 * ⚠ SCHEMA A CONFIRMER EN CONDITION REELLE.
 *
 * La documentation officielle describe deux strategies (secret partage, ou
 * secret de signature via l'en-tete `Wave-Signature`), mais la section
 * detaillee n'a pas pu etre lue lors de l'ecriture de ce module. On implemente
 * le format `t=…,v1=…` avec un HMAC-SHA256 de « `<timestamp>.<corps brut>` ».
 *
 * Ce choix est CONCU POUR ECHOUER PROPREMENT : si le schema reel differe, la
 * signature ne correspondra pas et le webhook sera refuse — donc aucun
 * abonnement ne sera active a tort. C'est l'erreur sans consequence grave.
 * L'inverse, une verification qui accepte tout, distribuerait des plans
 * gratuits : c'est pourquoi aucun repli « si la verification echoue, on
 * accepte quand meme » n'existe ici.
 *
 * A confirmer des la premiere reception : Business Portal -> Developers ->
 * Webhooks -> evenement de test (`test.test_event`), en journalisant l'en-tete
 * recu. Si le format differe, seule `computeWaveSignature` est a corriger.
 *
 * @param toleranceMs tolerance sur l'horodatage (5 min par defaut)
 * @param now         horloge injectable, pour les tests
 */
export function verifyWaveSignature({
  header,
  rawBody,
  secret,
  now = Date.now(),
  toleranceMs = WAVE_SIGNATURE_TOLERANCE_MS,
}: {
  header: string | null | undefined;
  rawBody: string;
  secret: string | undefined;
  now?: number;
  toleranceMs?: number;
}): SignatureVerdict {
  // Pas de secret configure : on refuse. Accepter sans verification
  // reviendrait a offrir un abonnement a quiconque POST sur l'URL.
  if (!secret) {
    return { ok: false, reason: "WAVE_WEBHOOK_SECRET absent" };
  }

  const parsed = parseWaveSignature(header);
  if (!parsed) {
    return { ok: false, reason: "en-tete Wave-Signature absent ou mal forme" };
  }

  /*
   * ⚠ UNITE : le `t=` est en SECONDES, l'horloge de `now` en MILLISECONDES.
   *
   * Les comparer directement produisait un ecart de trois decades : tout etait
   * refuse. La fonction etait donc securitaire, mais inutilisable. Plutot que
   * de supposer une convention, on la detecte — sous 10^12, une valeur ne
   * peut pas etre une date en millisecondes (elle daterait de 2001), c'est
   * donc un timestamp en secondes.
   */
  const timestampMs =
    Math.abs(parsed.timestamp) < 1e12 ? parsed.timestamp * 1000 : parsed.timestamp;

  if (Math.abs(now - timestampMs) > toleranceMs) {
    return { ok: false, reason: "horodatage hors tolerance (jeu de rejeu)" };
  }

  const expected = Buffer.from(
    computeWaveSignature(rawBody, secret, parsed.timestamp),
    "utf8",
  );

  // Plusieurs `v1` : un seul correspond suffit (rotation de secret).
  for (const candidate of parsed.signatures) {
    const buf = Buffer.from(candidate, "utf8");
    if (buf.length === expected.length && timingSafeEqual(buf, expected)) {
      return { ok: true };
    }
  }

  return { ok: false, reason: "signature non conforme" };
}


/**
 * En-tete `Wave-Signature`, forme `t=<timestamp>,v1=<signature>[,v1=...]`.
 *
 * Plusieurs `v1` sont normaux : c'est le mecanisme de rotation de secret de
 * Wave, ou les deux secrets coexistent pendant la transition.
 */
export function parseWaveSignature(
  header: string | null | undefined,
): { timestamp: number; signatures: string[] } | null {
  if (typeof header !== "string" || header.trim() === "") return null;

  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rest.length === 0) continue;
    const value = rest.join("=");
    const key = rawKey?.trim();

    if (key === "t") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) return null;
      timestamp = parsed;
    } else if (key?.startsWith("v1")) {
      if (value) signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/** Tolerance sur l'horodatage : au-dela, la requete est rejouee. */
export const WAVE_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface SignatureVerdict {
  ok: boolean;
  /** Motif du refus — utile en journal, jamais montre au client. */
  reason?: string;
}

/** HMAC-SHA256 hexadecimal de `<timestamp>.<corps brut>`. */
export function computeWaveSignature(
  rawBody: string,
  secret: string,
  timestamp: number,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface WaveCustomer {
  name?: string;
  email?: string;
  /** Format E.164 : +2250708091011. */
  phone?: string;
}

export interface WaveCheckoutSession {
  id: string;
  /** Page de paiement : c'est là que le client règle. */
  url: string;
  amount: string;
  currency: string;
  /** `complete` une fois le paiement encaissé. */
  payment_status: string;
  checkout_status: string;
  when_created?: string;
  when_paid?: string | null;
  customer?: WaveCustomer | null;
  custom_fields?: Record<string, string> | null;
}

/**
 * Cette session de paiement a-t-elle RÉELLEMENT été réglée ?
 *
 * Wave tient deux compteurs distincts, et c'est précisément leur couple qui
 * décide :
 *
 * - `payment_status` : l'argent. `complete` = encaissé.
 * - `checkout_status` : le parcours. `complete` = session terminée.
 *
 * On exige les DEUX. Un seul `complete` ne suffit pas, et c'est là que se
 * trouve le risque :
 *
 * - `pending` / `complete` — l'empreinte est engagée mais l'argent n'est pas
 *   arrivé. Activer ici distribue un abonnement gratuit.
 * - `complete` / `open` — l'argent est là, la session n'est pas close. Cas
 *   anodin, mais on ne devine pas : sans close, un remboursement ou une
 *   annulation ultérieure n'aurait pas encore de trace.
 *
 * La fonction est volontairement SÉPARÉE de `POST /v1/checkout/sessions` :
 * c'est la seule porte qui décide d'un abonnement payant, elle mérite donc
 * d'être lue et testée sans passer par le réseau.
 *
 * Le repli est « non payé ». Un doute doit coûter un abonnement manquant,
 * jamais un abonnement offert.
 */
export function isSessionPaid(session: Pick<WaveCheckoutSession, "payment_status" | "checkout_status">): boolean {
  return session.payment_status === "complete" && session.checkout_status === "complete";
}

export interface WaveErrorBody {
  code?: string;
  message?: string;
  error_code?: string;
  error_message?: string;
}

/** Evenements traites. Les autres sont ignores sans bruit. */
export const WAVE_EVENTS = {
  completed: "checkout.session.completed",
  failed: "checkout.session.payment_failed",
} as const;

export interface WaveWebhookEvent {
  /** Unique par evenement : c'est notre cle d'idempotence. */
  id: string;
  type: string;
  data: Partial<WaveCheckoutSession> & {
    last_payment_error?: { code?: string; message?: string };
  };
}
