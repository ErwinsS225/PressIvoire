import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  deliverNotification,
  resetProviderCaches,
  type NotificationEnv,
} from "./notifications-server";

/*
 * Aucun appel reseau dans ce fichier : `fetch` est remplace par un espion, et
 * l'environnement est passe explicitement. Ce qu'on verifie ici n'est pas
 * « Est-ce que ca marche ? » (cela depend d'Orange et de Meta) mais
 * « Est-ce que la requete part avec exactement la forme attendue, et est-ce
 * qu'un echec est classe correctement ? » — les deux seules choses qu'on peut
 * maitriser depuis le code.
 */

const SMS_ENV: NotificationEnv = {
  ORANGE_SMS_CLIENT_ID: "client-id",
  ORANGE_SMS_CLIENT_SECRET: "client-secret",
  ORANGE_SMS_SENDER: "PRESSINGPRO",
};

const WHATSAPP_ENV: NotificationEnv = {
  WHATSAPP_PHONE_NUMBER_ID: "123456",
  WHATSAPP_ACCESS_TOKEN: "jeton-meta",
  WHATSAPP_TEMPLATE_NAME: "pressingpro_order_update",
};

/** Faux `Response` : seuls `ok`, `status` et `json()` sont lus par le module. */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

/** Reponse de jeton Orange, puis reponse d'envoi. */
function queueOrangeSuccess(
  providerId = "https://api.orange.com/smsmessaging/v1/x",
) {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ access_token: "jeton", expires_in: 3600 }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ outboundSMSMessageRequest: { resourceURL: providerId } }, 201),
    );
}

function queueWhatsAppSuccess(providerId = "wamid.ABC") {
  fetchMock.mockResolvedValueOnce(jsonResponse({ messages: [{ id: providerId }] }));
}

beforeEach(() => {
  resetProviderCaches();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/* -------------------------------------------------------------------------- */
/* Sans passerelle configuree                                                   */
/* -------------------------------------------------------------------------- */

describe("deliverNotification — configuration", () => {
  it("refuse d'envoyer sans passerelle, et n'appelle meme pas le reseau", async () => {
    const result = await deliverNotification({
      channel: "sms",
      phone: "+2250708091011",
      message: "Pressing Ivoire : votre commande est prête.",
      env: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("l'envoi aurait dû être refusé");
    expect(result.channel).toBeNull();
    expect(result.failure.retryable).toBe(false);
    expect(result.failure.message).toContain("Aucune passerelle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un numero inutilisable avant de composer quoi que ce soit", async () => {
    const result = await deliverNotification({
      channel: "sms",
      phone: "1234",
      message: "Pressing Ivoire : votre commande est prête.",
      env: SMS_ENV,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("l'envoi aurait dû être refusé");
    expect(result.failure.retryable).toBe(false);
    expect(result.failure.message).toContain("Numéro de téléphone inutilisable");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
