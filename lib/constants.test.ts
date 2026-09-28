import { describe, it, expect } from "vitest";

import {
  isOrderStatus,
  toOrderStatus,
  ORDER_STATUS,
  paymentMethodLabel,
  paymentMethodStyle,
  isStaffRole,
  isAdminRole,
  roleLabel,
  ORDER_STATUS_LABELS,
} from "./constants";

/*
 * `orders.status` est un `text` en base, donc Supabase le type comme
 * `string`. Ces gardes evitent un `cast` aveugle : une valeur inconnue doit
 * produire un repli lisible, pas un ecran casse.
 */
describe("isOrderStatus", () => {
  it("reconnait tous les statuts declares", () => {
    for (const status of Object.values(ORDER_STATUS)) {
      expect(isOrderStatus(status)).toBe(true);
    }
  });

  it("refuse une valeur inconnue", () => {
    expect(isOrderStatus("teleporte")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
    expect(isOrderStatus("PENDING")).toBe(false); // casse differente
  });

  it("ne confond pas un statut avec un prototype d'objet", () => {
    // `in` sur un objetLitéral accepterait "constructor" ou "toString" :
    // hasOwnProperty est donc obligatoire.
    expect(isOrderStatus("constructor")).toBe(false);
    expect(isOrderStatus("toString")).toBe(false);
  });
});

describe("toOrderStatus", () => {
  it("laisse passer un statut valide", () => {
    expect(toOrderStatus("ready")).toBe(ORDER_STATUS.READY);
  });

  it("retombe sur 'pending' pour une valeur inconnue", () => {
    // Plutot que de retourner la valeur brute, qui n'aurait pas de libelle
    // dans ORDER_STATUS_LABELS et afficherait "undefined" a l'ecran.
    expect(toOrderStatus("bidon")).toBe(ORDER_STATUS.PENDING);
  });
});

describe("libelles des statuts", () => {
  it("associe un libelle a chaque statut du workflow", () => {
    for (const status of Object.values(ORDER_STATUS)) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

/*
 * Moyens de paiement : c'est la numerotation du marche ivoirien
 * (Wave, Orange, MTN, Moov). Un moyen mal etiquette fausserait le journal
 * de caisse, qui ventile le chiffre d'affaires par moyen.
 */
describe("paymentMethodLabel", () => {
  it("etiquette les moyens du marche ivoirien", () => {
    expect(paymentMethodLabel("wave")).toBe("Wave");
    expect(paymentMethodLabel("orange")).toBe("Orange Money");
    expect(paymentMethodLabel("mtn")).toBe("MTN MoMo");
    expect(paymentMethodLabel("moov")).toBe("Moov Money");
    expect(paymentMethodLabel("cash")).toBe("Espèces");
  });

  it("gere les moyens hors liste (carte, virement)", () => {
    expect(paymentMethodLabel("card")).toBe("Carte bancaire");
    expect(paymentMethodLabel("transfer")).toBe("Virement");
  });

  it("renvoie 'Non renseigné' plutot qu'un undefined", () => {
    expect(paymentMethodLabel(null)).toBe("Non renseigné");
    expect(paymentMethodLabel(undefined)).toBe("Non renseigné");
  });

  it("retombe sur la valeur brute si le moyen est inconnu", () => {
    // Une passerelle ajoutee en base ne doit pas afficher "undefined".
    expect(paymentMethodLabel("especes_v2")).toBe("especes_v2");
  });
});

describe("paymentMethodStyle", () => {
  it("renvoie une icone et une couleur pour chaque moyen connu", () => {
    for (const method of ["cash", "wave", "orange", "mtn", "moov"]) {
      const style = paymentMethodStyle(method);
      expect(style.icon).toBeTruthy();
      // La cle du contrat est `color` (cf. lib/constants.ts).
      expect(style.color).toBeTruthy();
    }
  });

  it("retombe sur une icone et une couleur par defaut", () => {
    // Inconnu ou null : on ne renvoie ni undefined ni chaine vide, sinon la
    // pastille disparaitrait a l'ecran.
    for (const method of ["moyen_inconnu", null]) {
      const style = paymentMethodStyle(method);
      expect(style.icon).toBeTruthy();
      expect(style.color).toBeTruthy();
    }
  });

  it("distingue les moyens connus par leur couleur", () => {
    // Deux moyens differents doivent avoir des pastilles differentes.
    expect(paymentMethodStyle("wave").color).not.toBe(
      paymentMethodStyle("cash").color,
    );
  });
});

/*
 * Ces deux gardes dupliquent volontairement des policies RLS
 * (`app_is_staff`, `app_is_pressing_admin`). Elles rendent l'interface
 * honnete : un caissier ne doit pas voir un bouton "Modifier" qui echouerait
 * avec un message RLS incomprehensible. La base reste l'autorite.
 */
describe("roles", () => {
  it("considere owner/manager/cashier/driver comme du personnel", () => {
    for (const role of ["owner", "manager", "cashier", "driver"]) {
      expect(isStaffRole(role)).toBe(true);
    }
  });

  it("exclut le client du personnel", () => {
    expect(isStaffRole("client")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  it("reserve l'administration au owner et au manager", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("manager")).toBe(true);
    // Un caissier encaisse mais ne gere pas le catalogue.
    expect(isAdminRole("cashier")).toBe(false);
    expect(isAdminRole("driver")).toBe(false);
  });

  it("traduit les roles en libelles comprehensibles", () => {
    expect(roleLabel("owner")).toBe("Gérant");
    expect(roleLabel("cashier")).toBe("Caissier");
    expect(roleLabel(null)).toBe("—");
  });
});
