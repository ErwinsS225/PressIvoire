import { describe, it, expect } from "vitest";

import {
  CHANNEL_ENV_VARS,
  MAX_SEND_ATTEMPTS,
  MAX_SMS_SEGMENTS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_STATUS,
  STALLED_SENDING_MS,
  attemptRefusalReason,
  buildNotificationMessage,
  buildWhatsAppTemplateParams,
  canAttempt,
  canTransition,
  classifySendFailure,
  composeSms,
  configuredChannels,
  describeChannelConfig,
  measureSms,
  nextAttemptAt,
  nextAttemptDelayMs,
  notificationChannelLabel,
  notificationEventForStatus,
  notificationEventLabel,
  notificationStatusLabel,
  notificationStatusVariant,
  pickChannel,
  smsSegments,
  toGatewayRecipient,
} from "./notifications";

/**
 * Les libelles de montant passent par `Intl.NumberFormat("fr-FR")`, qui separe
 * les milliers par une espace insecable (U+202F ou U+00A0 selon la version
 * d'ICU). Comparer directement a "2 000" rendrait le test dependant de Node :
 * on compare donc sur une version normalisee.
 */
function flat(value: string): string {
  return value.replace(/\s/g, " ");
}

const base = { pressingName: "Pressing Ivoire", orderNumber: "PR-2026-0001" };

/* -------------------------------------------------------------------------- */
/* Evenement declencheur                                                        */
/* -------------------------------------------------------------------------- */

describe("notificationEventForStatus", () => {
  it("mappe les quatre etapes qui interessent le client", () => {
    expect(notificationEventForStatus("pickup_scheduled")).toBe(
      NOTIFICATION_EVENTS.PICKUP_SCHEDULED,
    );
    expect(notificationEventForStatus("ready")).toBe(
      NOTIFICATION_EVENTS.ORDER_READY,
    );
    expect(notificationEventForStatus("out_for_delivery")).toBe(
      NOTIFICATION_EVENTS.OUT_FOR_DELIVERY,
    );
    expect(notificationEventForStatus("delivered")).toBe(
      NOTIFICATION_EVENTS.ORDER_DELIVERED,
    );
  });

  /*
   * Envoyer un SMS a chaque changement de statut couterait cher et banaliserait
   * les messages : un client qui recoit quatre SMS par commande finit par ne
   * plus les lire. Ces etapes sont donc volontairement muettes.
   */
  it("reste muet sur les etapes internes et les litiges", () => {
    expect(notificationEventForStatus("pending")).toBeNull();
    expect(notificationEventForStatus("picked_up")).toBeNull();
    expect(notificationEventForStatus("in_processing")).toBeNull();
    expect(notificationEventForStatus("cancelled")).toBeNull();
    expect(notificationEventForStatus("disputed")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Redaction du message                                                         */
/* -------------------------------------------------------------------------- */

describe("buildNotificationMessage", () => {
  it("ouvre par le nom du pressing et cite le numero de commande", () => {
    for (const event of Object.values(NOTIFICATION_EVENTS)) {
      const message = buildNotificationMessage(event, {
        ...base,
        amountPaid: 2000,
        remaining: 3000,
        scheduledAt: new Date(2026, 2, 12, 9, 30),
      });

      expect(message.startsWith("Pressing Ivoire : ")).toBe(true);
      expect(message).toContain(base.orderNumber);
    }
  });

  it("replie sur « Votre pressing » quand le nom est vide", () => {
    const message = buildNotificationMessage(NOTIFICATION_EVENTS.ORDER_READY, {
      pressingName: "   ",
      orderNumber: "PR-2026-0002",
    });

    expect(message.startsWith("Votre pressing : ")).toBe(true);
  });

  it("annonce le reste a payer, ou la solde", () => {
    const partiel = buildNotificationMessage(
      NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
      { ...base, amountPaid: 2000, remaining: 3000 },
    );
    expect(flat(partiel)).toContain("paiement de 2 000 reçu");
    expect(flat(partiel)).toContain("Reste à payer : 3 000");

    const solde = buildNotificationMessage(NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
      ...base,
      amountPaid: 5000,
    });
    expect(solde).toContain("entièrement payée");
    expect(solde).not.toContain("Reste à payer");
  });

  it("date la collecte planifiee de facon deterministe", () => {
    const message = buildNotificationMessage(
      NOTIFICATION_EVENTS.PICKUP_SCHEDULED,
      { ...base, scheduledAt: new Date(2026, 2, 12, 9, 30) },
    );

    expect(message).toContain("planifiée le 12/03 a 09h30");
  });

  it("reste lisible quand la date de collecte manque", () => {
    const message = buildNotificationMessage(
      NOTIFICATION_EVENTS.PICKUP_SCHEDULED,
      { ...base, scheduledAt: null },
    );

    expect(message).toContain("une date a confirmer");
  });
});

/* -------------------------------------------------------------------------- */
/* Gabarit WhatsApp                                                             */
/* -------------------------------------------------------------------------- */

/*
 * WhatsApp refuse le texte libre pour un message ouvert par l'entreprise : il
 * faut un gabarit approuve, dont l'ordre des parametres est fige. Ces tests
 * verrouillent cet ordre — le changer casserait l'envoi en production.
 */
describe("buildWhatsAppTemplateParams", () => {
  const context = {
    ...base,
    amountPaid: 2000,
    remaining: 3000,
    scheduledAt: new Date(2026, 2, 12, 9, 30),
  };

  it("ne passe que le pressing et le numero pour les etapes simples", () => {
    for (const event of [
      NOTIFICATION_EVENTS.ORDER_READY,
      NOTIFICATION_EVENTS.OUT_FOR_DELIVERY,
      NOTIFICATION_EVENTS.ORDER_DELIVERED,
    ]) {
      expect(buildWhatsAppTemplateParams(event, context)).toEqual([
        "Pressing Ivoire",
        "PR-2026-0001",
      ]);
    }
  });

  it("ajoute la date pour la collecte, et l'etat pour l'enregistrement", () => {
    expect(
      buildWhatsAppTemplateParams(NOTIFICATION_EVENTS.PICKUP_SCHEDULED, context),
    ).toEqual(["Pressing Ivoire", "PR-2026-0001", "12/03 a 09h30"]);

    expect(
      buildWhatsAppTemplateParams(NOTIFICATION_EVENTS.ORDER_CREATED, context),
    ).toEqual(["Pressing Ivoire", "PR-2026-0001", "prête"]);
  });

  it("passe le reste a payer, et 0 quand la commande est soldee", () => {
    expect(
      flat(
        buildWhatsAppTemplateParams(NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
          ...base,
          amountPaid: 2000,
          remaining: 3000,
        }).join("|"),
      ),
    ).toBe("Pressing Ivoire|2 000|PR-2026-0001|3 000");

    expect(
      flat(
        buildWhatsAppTemplateParams(NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
          ...base,
          amountPaid: 5000,
        }).join("|"),
      ),
    ).toBe("Pressing Ivoire|5 000|PR-2026-0001|0");
  });
});

/* -------------------------------------------------------------------------- */
/* Encodage et segmentation SMS                                                 */
/* -------------------------------------------------------------------------- */

/*
 * Le point qui coute de l'argent : l'alphabet GSM 7 bits autorise 160
 * caracteres par SMS, mais l'operateur bascule TOUT le message en UCS-2
 * (70 caracteres) des qu'un seul caractere sort de cet alphabet. En francais un
 * simple « ê » suffit — « votre commande est prête » est donc facture au
 * double. Ces tests documentent le comportement reel, pas un ideal.
 */
describe("measureSms", () => {
  it("reconnait l'alphabet GSM 7 bits, accents francais inclus", () => {
    expect(measureSms("Votre commande est prete").encoding).toBe("gsm7");
    expect(measureSms("éàèù ÇÉ").encoding).toBe("gsm7");
  });

  /*
   * Les deux pieges du francais, verifies ici parce qu'ils decident du prix :
   *   - « é », « è », « à » sont dans GSM 03.38 — un message sans autre accent
   *     tient donc en un seul SMS ;
   *   - « ê » et « ç » n'y sont PAS (seuls « É » et « Ç » majuscules y figurent).
   *     Or « prête » contient ê et « reçu » contient ç : les deux messages les
   *     plus frequents du produit basculent en UCS-2, a 70 caracteres par SMS.
   */
  it("documente les caracteres francais qui coutent un second SMS", () => {
    expect(measureSms("livrée").encoding).toBe("gsm7");
    expect(measureSms("prete").encoding).toBe("gsm7");

    expect(measureSms("prête").encoding).toBe("ucs2");
    expect(measureSms("reçu").encoding).toBe("ucs2");
    expect(measureSms("commande reçue").encoding).toBe("ucs2");
  });

  it("bascule en UCS-2 des qu'un caractere sort de l'alphabet", () => {
    expect(measureSms("bientôt").encoding).toBe("ucs2");
    expect(measureSms("🎉").encoding).toBe("ucs2");
  });

  it("compte 2 unites pour les caracteres etendus", () => {
    expect(measureSms("€").encoding).toBe("gsm7");
    expect(measureSms("€").length).toBe(2);
    expect(measureSms("{").length).toBe(2);
    expect(measureSms("[]").length).toBe(4);
  });

  it("decoupe suivant les seuils reels de l'operateur", () => {
    expect(measureSms("a".repeat(160)).segments).toBe(1);
    expect(measureSms("a".repeat(161)).segments).toBe(2);
    expect(measureSms("a".repeat(306)).segments).toBe(2);
    expect(measureSms("a".repeat(307)).segments).toBe(3);

    expect(measureSms("ê".repeat(70)).segments).toBe(1);
    expect(measureSms("ê".repeat(71)).segments).toBe(2);
  });

  it("normalise les espaces et les sauts de ligne", () => {
    expect(measureSms("  a \n\n b ").text).toBe("a b");
    expect(measureSms("").segments).toBe(1);
  });

  it("expose le nombre de segments en raccourci", () => {
    expect(smsSegments("a".repeat(161))).toBe(2);
  });
});

describe("composeSms", () => {
  it("laisse passer un message court tel quel", () => {
    const result = composeSms("Pressing Ivoire : commande prete.");

    expect(result.truncated).toBe(false);
    expect(result.text).toBe("Pressing Ivoire : commande prete.");
  });

  it("coupe sur une frontiere de mot, jamais au milieu", () => {
    const result = composeSms(`Pressing Ivoire : ${"mot ".repeat(80)}`);

    expect(result.truncated).toBe(true);
    expect(result.text.endsWith(" mot...")).toBe(true);
    expect(result.segments).toBeLessThanOrEqual(MAX_SMS_SEGMENTS);
  });

  it("respecte un plafond d'un seul segment quand on le demande", () => {
    const result = composeSms(`Pressing Ivoire : ${"mot ".repeat(80)}`, 1);

    expect(result.segments).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it("coupe aussi les messages en UCS-2", () => {
    const result = composeSms(`Pressing Ivoire : ${"prête ".repeat(50)}`);

    expect(result.encoding).toBe("ucs2");
    expect(result.segments).toBeLessThanOrEqual(MAX_SMS_SEGMENTS);
    expect(result.truncated).toBe(true);
  });

  /*
   * `Intl.NumberFormat("fr-FR")` separe les milliers par une espace insecable
   * (U+202F), absente de GSM 03.38 : laissee telle quelle, elle basculerait a
   * elle seule tout le message en UCS-2. La normalisation de `measureSms` la
   * remplace par une espace simple.
   */
  it("remplace les espaces insecables de Intl par des espaces simples", () => {
    const measured = measureSms("Commande 1\u202f000 prete");

    expect(measured.encoding).toBe("gsm7");
    expect(measured.text).toBe("Commande 1 000 prete");
  });

  it("mesure le message d'encaissement tel qu'il partira", () => {
    const message = buildNotificationMessage(
      NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
      { ...base, amountPaid: 2000, remaining: 1000 },
    );
    const composed = composeSms(message);

    expect(composed.text).not.toMatch(/[\u00a0\u202f]/);
    expect(flat(composed.text)).toContain("Reste à payer : 1 000");
    /* Deux segments : le « ç » de « reçu » fait tomber le message en UCS-2. */
    expect(composed.encoding).toBe("ucs2");
    expect(composed.segments).toBe(2);
  });

  /*
   * Contrat de redaction : aucun message du produit ne doit depasser deux SMS
   * sans etre coupe — au-dela, un « SMS de confirmation » coute plus cher que
   * l'appel telephonique qu'il remplace.
   */
  it("tient tous les messages du produit en deux SMS au plus", () => {
    for (const event of Object.values(NOTIFICATION_EVENTS)) {
      const composed = composeSms(
        buildNotificationMessage(event, {
          ...base,
          amountPaid: 2000,
          remaining: 3000,
          scheduledAt: new Date(2026, 2, 12, 9, 30),
        }),
      );

      expect(composed.segments).toBeLessThanOrEqual(MAX_SMS_SEGMENTS);
      expect(composed.truncated).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Politique de relance                                                         */
/* -------------------------------------------------------------------------- */

describe("nextAttemptDelayMs", () => {
  it("part tout de suite a la premiere tentative", () => {
    expect(nextAttemptDelayMs(0)).toBe(0);
  });

  it("espace les tentatives suivantes, puis plafonne", () => {
    expect(nextAttemptDelayMs(1)).toBe(60_000);
    expect(nextAttemptDelayMs(2)).toBe(300_000);
    /* Au-dela du plafond de tentatives, plus d'attente a calculer. */
    expect(nextAttemptDelayMs(9)).toBe(300_000);
  });

  it("date la prochaine tentative a partir d'un instant donne", () => {
    const from = new Date(2026, 2, 12, 9, 30);

    expect(nextAttemptAt(0, from).getTime()).toBe(from.getTime());
    expect(nextAttemptAt(2, from).getTime()).toBe(from.getTime() + 300_000);
  });
});

describe("canAttempt", () => {
  const now = new Date(2026, 2, 12, 9, 30);

  it("laisse partir une ligne en attente", () => {
    expect(canAttempt({ status: NOTIFICATION_STATUS.QUEUED, retries: 0 }, now)).toBe(
      true,
    );
  });

  it("ne rejoue jamais un envoi abouti ni annule", () => {
    expect(canAttempt({ status: NOTIFICATION_STATUS.SENT, retries: 0 }, now)).toBe(
      false,
    );
    expect(
      canAttempt({ status: NOTIFICATION_STATUS.CANCELLED, retries: 0 }, now),
    ).toBe(false);
  });

  it("relance un echec tant que le plafond n'est pas atteint", () => {
    expect(
      canAttempt({ status: NOTIFICATION_STATUS.FAILED, retries: 1 }, now),
    ).toBe(true);
    expect(
      canAttempt(
        { status: NOTIFICATION_STATUS.FAILED, retries: MAX_SEND_ATTEMPTS },
        now,
      ),
    ).toBe(false);
  });

  /*
   * Sans cette regle, une ligne restee `sending` apres un redemarrage du serveur
   * serait bloquee pour toujours : la file n'a pas de balayeur automatique.
   */
  it("reprend un envoi bloque, mais pas un envoi en cours", () => {
    const recent = new Date(now.getTime() - STALLED_SENDING_MS / 2).toISOString();
    const old = new Date(now.getTime() - STALLED_SENDING_MS * 2).toISOString();

    expect(
      canAttempt({ status: NOTIFICATION_STATUS.SENDING, retries: 1, attempted_at: recent }, now),
    ).toBe(false);
    expect(
      canAttempt({ status: NOTIFICATION_STATUS.SENDING, retries: 1, attempted_at: old }, now),
    ).toBe(true);
    expect(
      canAttempt({ status: NOTIFICATION_STATUS.SENDING, retries: 1 }, now),
    ).toBe(false);
  });

  it("refuse un etat inconnu plutot que de tenter au hasard", () => {
    expect(canAttempt({ status: "bogus", retries: 0 }, now)).toBe(false);
  });
});

describe("attemptRefusalReason", () => {
  it("explique chaque refus en francais", () => {
    expect(
      attemptRefusalReason({ status: NOTIFICATION_STATUS.SENT, retries: 1 }),
    ).toBe("Ce message est déjà parti.");
    expect(
      attemptRefusalReason({ status: NOTIFICATION_STATUS.CANCELLED, retries: 0 }),
    ).toBe("Ce message a été annulé.");
    expect(
      attemptRefusalReason({ status: NOTIFICATION_STATUS.SENDING, retries: 0 }),
    ).toBe("Un envoi est déjà en cours pour ce message.");
    expect(
      attemptRefusalReason({
        status: NOTIFICATION_STATUS.FAILED,
        retries: MAX_SEND_ATTEMPTS,
      }),
    ).toContain("Échec définitif après 3 tentatives");
  });

  it("ne dit rien quand la relance est permise", () => {
    expect(
      attemptRefusalReason({ status: NOTIFICATION_STATUS.QUEUED, retries: 0 }),
    ).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Machine a etats                                                              */
/* -------------------------------------------------------------------------- */

describe("canTransition", () => {
  it("autorise le chemin nominal", () => {
    expect(canTransition("queued", "sending")).toBe(true);
    expect(canTransition("sending", "sent")).toBe(true);
    expect(canTransition("sending", "failed")).toBe(true);
  });

  it("autorise la reprise d'un echec", () => {
    expect(canTransition("failed", "queued")).toBe(true);
    expect(canTransition("failed", "cancelled")).toBe(true);
  });

  it("interdit de sauter l'etape d'envoi", () => {
    expect(canTransition("queued", "sent")).toBe(false);
  });

  it("traite « envoye » et « annule » comme des etats terminaux", () => {
    for (const status of Object.values(NOTIFICATION_STATUS)) {
      expect(canTransition("sent", status)).toBe(false);
      expect(canTransition("cancelled", status)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Classification des erreurs fournisseur                                       */
/* -------------------------------------------------------------------------- */

/*
 * C'est ici que se joue la difference entre « le client ne vient pas chercher
 * son linge » et « on a reessaye ». Un 5xx est donc TOUJOURS relancable, et un
 * probleme de configuration ne l'est JAMAIS : reessayer ne repare pas une cle
 * refusee, et insister consomme du credit.
 */
describe("classifySendFailure", () => {
  it("relance un delai d'attente et une panne reseau", () => {
    expect(classifySendFailure({ timedOut: true })).toEqual({
      retryable: true,
      message: "La passerelle n'a pas répondu à temps.",
    });
    expect(classifySendFailure({ httpStatus: 0 }).retryable).toBe(true);
    expect(classifySendFailure({}).retryable).toBe(true);
  });

  it("ne relance pas une configuration refusee", () => {
    const refused = classifySendFailure({ httpStatus: 401 });

    expect(refused.retryable).toBe(false);
    expect(refused.message).toContain("Identifiants refusés");
    expect(classifySendFailure({ httpStatus: 403 }).retryable).toBe(false);
  });

  it("relance une passerelle saturee ou en panne", () => {
    expect(classifySendFailure({ httpStatus: 429 }).retryable).toBe(true);
    expect(classifySendFailure({ httpStatus: 503 })).toEqual({
      retryable: true,
      message: "Panne de la passerelle (503) : nouvel essai plus tard.",
    });
  });

  it("ne relance pas un destinataire ou un gabarit refuse", () => {
    const refus = classifySendFailure({
      httpStatus: 400,
      detail: "numéro invalide",
    });

    expect(refus.retryable).toBe(false);
    expect(refus.message).toBe("Destinataire ou gabarit refusé : numéro invalide");
    expect(classifySendFailure({ httpStatus: 400 }).message).toBe(
      "Destinataire ou gabarit refusé par la passerelle.",
    );
  });

  it("traite les autres refus sans les relancer a l'aveugle", () => {
    expect(classifySendFailure({ httpStatus: 418 }).message).toBe(
      "Refus de la passerelle (418).",
    );
    expect(
      classifySendFailure({ httpStatus: 418, detail: "  theiere  " }).message,
    ).toBe("Refus de la passerelle (418) : theiere");
  });
});

/* -------------------------------------------------------------------------- */
/* Configuration des passerelles                                                */
/* -------------------------------------------------------------------------- */

describe("describeChannelConfig", () => {
  it("declared deux canaux et nomme les variables attendues", () => {
    expect(CHANNEL_ENV_VARS.sms).toContain("ORANGE_SMS_CLIENT_ID");
    expect(CHANNEL_ENV_VARS.whatsapp).toContain("WHATSAPP_PHONE_NUMBER_ID");
    expect(describeChannelConfig({})).toHaveLength(2);
  });

  it("reste « non configure » tant qu'il manque une variable", () => {
    const [sms] = describeChannelConfig({ ORANGE_SMS_CLIENT_ID: "id" });

    expect(sms.configured).toBe(false);
    expect(sms.missing).toEqual(["ORANGE_SMS_CLIENT_SECRET", "ORANGE_SMS_SENDER"]);
  });

  it("ne liste les canaux utilisables que si tout est fourni", () => {
    const env = {
      ORANGE_SMS_CLIENT_ID: "id",
      ORANGE_SMS_CLIENT_SECRET: "secret",
      ORANGE_SMS_SENDER: "PRESSINGPRO",
    };

    expect(configuredChannels(env)).toEqual(["sms"]);
    expect(configuredChannels({})).toEqual([]);
  });
});

describe("pickChannel", () => {
  const smsEnv = {
    ORANGE_SMS_CLIENT_ID: "id",
    ORANGE_SMS_CLIENT_SECRET: "secret",
    ORANGE_SMS_SENDER: "PRESSINGPRO",
  };

  it("honore le canal prefere quand il est configure", () => {
    expect(pickChannel("sms", smsEnv)).toBe("sms");
  });

  it("bascule sur le canal disponible plutot que de ne rien envoyer", () => {
    expect(pickChannel("whatsapp", smsEnv)).toBe("sms");
    expect(pickChannel("email", smsEnv)).toBe("sms");
  });

  it("renvoie null quand aucune passerelle n'est branchee", () => {
    expect(pickChannel("sms", {})).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Destinataire                                                                 */
/* -------------------------------------------------------------------------- */

describe("toGatewayRecipient", () => {
  it("normalise un numero saisi librement", () => {
    expect(toGatewayRecipient("sms", "07 08 09 10 11")).toBe("+2250708091011");
    expect(toGatewayRecipient("whatsapp", "07 08 09 10 11")).toBe("2250708091011");
  });

  it("retire le + pour la Cloud API de Meta, le garde pour Orange", () => {
    expect(toGatewayRecipient("whatsapp", "+2250708091011")).toBe("2250708091011");
    expect(toGatewayRecipient("sms", "+2250708091011")).toBe("+2250708091011");
  });

  it("refuse un destinataire inutilisable plutot que d'envoyer dans le vide", () => {
    expect(toGatewayRecipient("sms", "1234")).toBeNull();
    expect(toGatewayRecipient("sms", "")).toBeNull();
    expect(toGatewayRecipient("sms", null)).toBeNull();
    expect(toGatewayRecipient("sms", undefined)).toBeNull();
    expect(toGatewayRecipient("email", "+2250708091011")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Libelles                                                                     */
/* -------------------------------------------------------------------------- */

describe("libelles", () => {
  it("traduit les etats et les canaux connus", () => {
    expect(notificationStatusLabel("sent")).toBe("Envoyé");
    expect(notificationChannelLabel("whatsapp")).toBe("WhatsApp");
    expect(notificationEventLabel("order_ready")).toBe("Commande prête");
  });

  it("replie sur la valeur brute ou un libelle neutre", () => {
    expect(notificationStatusLabel("inconnu")).toBe("inconnu");
    expect(notificationChannelLabel("carrier_pigeon")).toBe("carrier_pigeon");
    expect(notificationEventLabel(null)).toBe("Notification");
    expect(notificationEventLabel("evenement_futur")).toBe("evenement_futur");
  });

  it("associe une variante de badge, avec repli sur « muted »", () => {
    expect(notificationStatusVariant("sent")).toBe("success");
    expect(notificationStatusVariant("failed")).toBe("destructive");
    expect(notificationStatusVariant("sending")).toBe("info");
    expect(notificationStatusVariant("queued")).toBe("muted");
    expect(notificationStatusVariant("etat_futur")).toBe("muted");
  });
});



