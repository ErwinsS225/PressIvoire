import { describe, it, expect } from "vitest";

import {
  computeWaveSignature,
  formatWaveAmount,
  isSessionPaid,
  parseWaveEvent,
  parseWaveSignature,
  verifyWaveSignature,
  WAVE_SIGNATURE_TOLERANCE_MS,
} from "./wave";

/*
 * Ces tests prouvent que la verification est CORRECTE SELON SON PROPRE
 * SPECIFICATION — pas que la specification est celle de Wave. Ce point est
 * ouvert : la documentation officielle n'a pas pu etre lue dans son detail
 * (cf. `verifyWaveSignature`). Le jour ou un evenement de test confirme le
 * format reel, c'est `computeWaveSignature` qu'il faut ajuster ; ces tests
 * indiqueront immediatement si l'ajustement casse autre chose.
 *
 * Ce qui compte deja, et qui est verifie ici : la fonction REFUSE par
 * defaut. Une signature absente, un corps modifie, un secret absent, un
 * horodatage vieux de dix minutes : tout est rejete. Une implementation
 * qui « laisse passer » n'active aucun abonnement — c'est le seul sens de la
 * porte.
 */

const SECRET = "wave_sn_test_secret";
const BODY = JSON.stringify({ id: "ev_1", type: "checkout.session.completed", data: { id: "cos_1" } });

describe("formatWaveAmount", () => {
  it("renvoie une chaine entiere, sans decimale", () => {
    // Le franc CFA n'a pas de sous-unite : « 5000.00 » serait refuse par Wave.
    expect(formatWaveAmount(5000)).toBe("5000");
    expect(typeof formatWaveAmount(5000)).toBe("string");
  });

  it("arrondit un montant non entier", () => {
    expect(formatWaveAmount(5000.4)).toBe("5000");
    expect(formatWaveAmount(5000.6)).toBe("5001");
  });

  it("accepte le plan gratuit a 0", () => {
    expect(formatWaveAmount(0)).toBe("0");
  });

  it("refuse un montant negatif ou indefini", () => {
    expect(() => formatWaveAmount(-1)).toThrow();
    expect(() => formatWaveAmount(Number.NaN)).toThrow();
    expect(() => formatWaveAmount(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("parseWaveSignature", () => {
  it("lit un en-tete t=...,v1=...", () => {
    const parsed = parseWaveSignature("t=1700000000,v1=abc123");
    expect(parsed).toEqual({ timestamp: 1700000000, signatures: ["abc123"] });
  });

  it("accepte plusieurs v1 (rotation de secret)", () => {
    const parsed = parseWaveSignature("t=1700000000,v1=ancien,v1=recent");
    expect(parsed?.signatures).toEqual(["ancien", "recent"]);
  });

  it("tolere les espaces autour des separateurs", () => {
    expect(parseWaveSignature(" t=1700000000 , v1=abc ")?.timestamp).toBe(1700000000);
  });

  it("rejette un en-tete absent, vide ou sans signature", () => {
    expect(parseWaveSignature(null)).toBeNull();
    expect(parseWaveSignature(undefined)).toBeNull();
    expect(parseWaveSignature("")).toBeNull();
    expect(parseWaveSignature("t=1700000000")).toBeNull();
    expect(parseWaveSignature("v1=abc")).toBeNull();
  });

  it("rejette un horodatage non numerique", () => {
    expect(parseWaveSignature("t=abc,v1=abc")).toBeNull();
  });
});

describe("computeWaveSignature", () => {
  it("produit un HMAC-SHA256 hexadecimal stable", () => {
    const a = computeWaveSignature(BODY, SECRET, 1700000000);
    const b = computeWaveSignature(BODY, SECRET, 1700000000);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("change si le corps change", () => {
    expect(computeWaveSignature(BODY, SECRET, 1)).not.toBe(
      computeWaveSignature(`${BODY} `, SECRET, 1),
    );
  });

  it("change si l'horodatage change", () => {
    expect(computeWaveSignature(BODY, SECRET, 1)).not.toBe(
      computeWaveSignature(BODY, SECRET, 2),
    );
  });
});

describe("verifyWaveSignature", () => {
  const NOW = 1_700_000_000_000;

  /** En-tete correctement signe pour un corps et un horodatage donnes. */
  const sign = (body: string, secret = SECRET, timestamp = NOW / 1000) =>
    `t=${timestamp},v1=${computeWaveSignature(body, secret, timestamp)}`;

  it("accepte une signature valide", () => {
    expect(
      verifyWaveSignature({ header: sign(BODY), rawBody: BODY, secret: SECRET, now: NOW }),
    ).toEqual({ ok: true });
  });

  /*
   * Le cas d attaque central : un tiers POSTe le webhook en annonçant un
   * paiement, en signant lui-meme (il ne connait pas le secret). Il doit
   * etre refuse.
   */
  it("refuse une signature fabriquee avec un autre secret", () => {
    const forged = `t=${NOW / 1000},v1=${computeWaveSignature(BODY, "secret-du-pirate", NOW / 1000)}`;
    const verdict = verifyWaveSignature({
      header: forged,
      rawBody: BODY,
      secret: SECRET,
      now: NOW,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe("signature non conforme");
  });

  it("refuse si le corps a ete modifie apres signature", () => {
    // Signature valide, mais le corps annonce un autre pressing.
    const header = sign(BODY);
    const tampered = BODY.replace("cos_1", "cos_fraude");
    const verdict = verifyWaveSignature({
      header,
      rawBody: tampered,
      secret: SECRET,
      now: NOW,
    });
    expect(verdict.ok).toBe(false);
  });

  it("refuse en l'absence de secret configure", () => {
    // Sans secret, on ne peut rien verifier : refuser est la seule option
    // qui ne distribue pas d'abonnement gratuit.
    const verdict = verifyWaveSignature({ header: sign(BODY), rawBody: BODY, secret: undefined, now: NOW });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/WAVE_WEBHOOK_SECRET/);
  });

  it("refuse un en-tete absent", () => {
    const verdict = verifyWaveSignature({ header: null, rawBody: BODY, secret: SECRET, now: NOW });
    expect(verdict.ok).toBe(false);
  });

  it("refuse un rejeu hors tolerance", () => {
    const old = NOW - WAVE_SIGNATURE_TOLERANCE_MS - 60_000;
    const verdict = verifyWaveSignature({
      header: sign(BODY, SECRET, old / 1000),
      rawBody: BODY,
      secret: SECRET,
      now: NOW,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/horodatage/);
  });

  it("accepte un evenement dans la tolerance", () => {
    const recent = NOW - (WAVE_SIGNATURE_TOLERANCE_MS - 60_000);
    const verdict = verifyWaveSignature({
      header: sign(BODY, SECRET, recent / 1000),
      rawBody: BODY,
      secret: SECRET,
      now: NOW,
    });
    expect(verdict.ok).toBe(true);
  });

  it("refuse un horodatage dans le futur", () => {
    const future = NOW + (WAVE_SIGNATURE_TOLERANCE_MS + 60_000);
    const verdict = verifyWaveSignature({
      header: sign(BODY, SECRET, future / 1000),
      rawBody: BODY,
      secret: SECRET,
      now: NOW,
    });
    expect(verdict.ok).toBe(false);
  });

  it("accepte si l'un des v1 correspond (rotation de secret)", () => {
    const valid = computeWaveSignature(BODY, SECRET, NOW / 1000);
    const header = `t=${NOW / 1000},v1=ancien-secret-obsolete,v1=${valid}`;
    const verdict = verifyWaveSignature({ header, rawBody: BODY, secret: SECRET, now: NOW });
    expect(verdict.ok).toBe(true);
  });
});

/*
 * LA PORTE FINANCIERE.
 *
 * Ces tests verrouillent la seule decision qui distribue un abonnement payant.
 *
 * Le bug qu'ils previennent : le handler rejetait avec un `&&`
 * (`statut !== "complete" && statut !== "complete"`). Cette condition ne
 * rejette que si les DEUX statuts sont non complets — donc le cas
 * `payment_status: "pending"` / `checkout_status: "complete"` PASSAIT, et
 * l'abonnement Pro etait active alors que l'argent n'etait jamais arrive.
 *
 * Chaque cas ci-dessous doit renvoyer `false` sauf le tout-premier. C'est
 * l'inverse exact du comportement d'avant.
 */
describe("isSessionPaid", () => {
  it("accepte une session entierement reglee", () => {
    expect(isSessionPaid({ payment_status: "complete", checkout_status: "complete" })).toBe(true);
  });

  /*
   * LA REGRESSION. `pending` = l'empreinte est engagee mais l'argent n'est pas
   * arrive. Avant le correctif, cette session activait un abonnement Pro
   * gratuit : c'etait de la perte d'argent directe.
   */
  it("refuse un paiement en attente meme si le parcours est termine", () => {
    expect(isSessionPaid({ payment_status: "pending", checkout_status: "complete" })).toBe(false);
  });

  it("refuse un parcours termine alors que l'argent manque", () => {
    expect(isSessionPaid({ payment_status: "complete", checkout_status: "open" })).toBe(false);
  });

  it("refuse les sessions non reglees", () => {
    for (const session of [
      { payment_status: "pending", checkout_status: "open" },
      { payment_status: "failed", checkout_status: "complete" },
      { payment_status: "failed", checkout_status: "open" },
      { payment_status: "expired", checkout_status: "complete" },
      { payment_status: "", checkout_status: "" },
    ]) {
      expect(isSessionPaid(session)).toBe(false);
    }
  });

  /*
   * Un statut inconnu ne vaut PAS « payé ». Wave peut ajouter une valeur sans
   * que nous le prevoyions : le repli doit rester fermé, sinon un
   * `partially_paid` d'un futur fournisseur ouvrirait la porte par defaut.
   */
  it("refuse tout statut inconnu", () => {
    expect(isSessionPaid({ payment_status: "COMPLETE", checkout_status: "complete" })).toBe(false);
    expect(isSessionPaid({ payment_status: "partially_paid", checkout_status: "complete" })).toBe(false);
  });
});

describe("parseWaveEvent", () => {
  it("lit un evenement bien forme", () => {
    const event = parseWaveEvent(BODY);
    expect(event?.id).toBe("ev_1");
    expect(event?.type).toBe("checkout.session.completed");
    expect(event?.data.id).toBe("cos_1");
  });

  /*
   * Le handler doit TOUJOURS repondre 2xx, meme sur une charge qu'il ne
   * comprend pas : sinon Wave reessaiera indefiniment. `parseWaveEvent` renvoie
   * donc `null` au lieu de lever, et c'est le handler qui repond 200.
   */
  it("renvoie null sur un JSON invalide", () => {
    expect(parseWaveEvent("pas du json")).toBeNull();
    expect(parseWaveEvent("[]")).toBeNull();
    expect(parseWaveEvent("null")).toBeNull();
  });

  it("renvoie null si un champ obligatoire manque", () => {
    expect(parseWaveEvent(JSON.stringify({ type: "x", data: {} }))).toBeNull();
    expect(parseWaveEvent(JSON.stringify({ id: "x", data: {} }))).toBeNull();
    expect(parseWaveEvent(JSON.stringify({ id: "x", type: "y" }))).toBeNull();
  });
});