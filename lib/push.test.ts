import { describe, expect, it } from "vitest";

import { isPushSupported, resolveInitialPushState, toSubscriptionRow } from "./push";

describe("isPushSupported", () => {
  it("exige les deux API", () => {
    // `PushManager` sans service worker ne sert a rien, et l'inverse non plus :
    // `subscribe()` vit sur le `PushManager` du registration.
    expect(isPushSupported({ serviceWorker: {}, PushManager: {} })).toBe(true);
    expect(isPushSupported({ PushManager: {} })).toBe(false);
    expect(isPushSupported({ serviceWorker: {} })).toBe(false);
    expect(isPushSupported({})).toBe(false);
  });
});

describe("resolveInitialPushState", () => {
  const capable = {
    isSecureContext: true,
    serviceWorker: {},
    PushManager: {},
    Notification: { permission: "default" },
  };

  it("part du desabonne quand tout est disponible", () => {
    expect(resolveInitialPushState(capable)).toBe("unsubscribed");
  });

  it("signale le refus du navigateur", () => {
    // Une fois refuse, la permission ne peut plus etre redemandee : l'ecran
    // doit l'expliquer plutot que de proposer un bouton qui echouera.
    expect(
      resolveInitialPushState({ ...capable, Notification: { permission: "denied" } }),
    ).toBe("denied");
  });

  it("signale l'absence de HTTPS avant tout le reste", () => {
    // Sur `http://` la Notification API n'existe pas du tout : parler d'un
    // refus de l'utilisateur serait faux et le renverrait dans ses reglages
    // sans raison.
    expect(resolveInitialPushState({ ...capable, isSecureContext: false })).toBe("insecure");
  });

  it("signale un navigateur sans la capacite", () => {
    expect(
      resolveInitialPushState({
        isSecureContext: true,
        Notification: { permission: "default" },
      }),
    ).toBe("unsupported");
  });
});

describe("toSubscriptionRow", () => {
  const keys = { p256dh: "BP4Xj", auth: "9Yq8k" };

  it("extrait endpoint et cles", () => {
    const row = toSubscriptionRow({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      getKeys: () => keys,
    });
    expect(row).toEqual({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      p256dh: "BP4Xj",
      auth: "9Yq8k",
    });
  });

  it("refuse un abonnement sans cle de chiffrement", () => {
    // Ecrire une ligne sans cle serait une inscription que l'envoi ne pourra
    // jamais satisfaire : mieux vaut refuser tout de suite.
    expect(
      toSubscriptionRow({ endpoint: "https://x", getKeys: () => ({ p256dh: "a" }) }),
    ).toBeNull();
    expect(toSubscriptionRow({ endpoint: "https://x", getKeys: () => ({}) })).toBeNull();
  });

  it("ignore expirationTime, qui ne correspond a aucune colonne", () => {
    // Le JSON du navigateur porte ce champ ; le garder produirait une colonne
    // obsolete et une expiration URL, qui n'a pas de sens dans notre table.
    const row = toSubscriptionRow({
      endpoint: "https://x",
      getKeys: () => keys,
    });
    expect(row).not.toHaveProperty("expirationTime");
  });
});