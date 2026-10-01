import { describe, it, expect } from "vitest";

import {
  GUEST_ONLY_PATHS,
  isGuestOnlyPath,
  isPublicPath,
  matchesPrefix,
} from "./public-paths";

/*
 * Ces tests verrouillent la frontiere session / pas-session.
 *
 * Le bug qu'ils previennent : les prefixes etaient compares avec
 * `pathname.startsWith(prefix)`, donc `"/apercu".startsWith("/api")` valait
 * `true`. Une future page `/apercu`, une route `/api-clients`, un `/authenticated`
 * seraient servis SANS session — et rien ne l'aurait signale, puisque le
 * middleware ne se plaint jamais d'avoir laisse passer.
 */
describe("matchesPrefix", () => {
  it("accepte le prefixe lui-meme", () => {
    expect(matchesPrefix("/api", "/api")).toBe(true);
  });

  it("accepte les sous-chemins reels", () => {
    expect(matchesPrefix("/api/webhooks/wave", "/api")).toBe(true);
    expect(matchesPrefix("/_next/static/chunk", "/_next")).toBe(true);
    expect(matchesPrefix("/auth/confirm", "/auth")).toBe(true);
  });

  /*
   * Le coeur du correctif. Ces trois cas passaient AVANT, et tous les trois
   * ouvraient une route privee a un visiteur sans session.
   */
  it("refuse un mot qui COMMENCE par le prefixe", () => {
    expect(matchesPrefix("/apercu", "/api")).toBe(false);
    expect(matchesPrefix("/api-clients", "/api")).toBe(false);
    expect(matchesPrefix("/authenticated", "/auth")).toBe(false);
    expect(matchesPrefix("/nextdoor", "/_next")).toBe(false);
  });
});

describe("isPublicPath", () => {
  it("laisse passer les ecrans d'authentification", () => {
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });

  it("laisse passer le webhook et les routes techniques", () => {
    expect(isPublicPath("/api/webhooks/wave")).toBe(true);
    expect(isPublicPath("/api/signout")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/auth/reset-password")).toBe(true);
  });

  /*
   * La regression qui compte : ces chemins doivent exiger une session.
   * Aucun n'existe encore dans `app/`, et c'est precisement cela qui rend
   * le test utile — il interdit d'en introduire un par megarde.
   */
  it("exige une session sur tout le reste", () => {
    for (const path of [
      "/dashboard",
      "/orders",
      "/caisse",
      "/settings",
      "/onboarding/pressing",
    ]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("ne laisse pas une route quasi-publique passer sans session", () => {
    // Le piege exact, sur des chemins qu'un developpeur peut ecrire par erreur.
    expect(isPublicPath("/apercu")).toBe(false);
    expect(isPublicPath("/api-public")).toBe(false);
    expect(isPublicPath("/authentication")).toBe(false);
    expect(isPublicPath("/logins")).toBe(false);
    expect(isPublicPath("/register-help")).toBe(false);
  });
});

describe("isGuestOnlyPath", () => {
  it("reconnait les trois ecrans reserves aux visiteurs", () => {
    for (const path of GUEST_ONLY_PATHS) {
      expect(isGuestOnlyPath(path)).toBe(true);
    }
  });

  /*
   * `/reset-password` est exclu VOLONTAIREMENT : l'utilisateur y arrive
   * CONNECTE (session « recovery » ouverte par le lien de l'email). Le
   * renvoyer vers le dashboard le redirigerait away de l'ecran qui lui
   * permet justement de changer son mot de passe.
   */
  it("laisse `/reset-password` hors de la liste", () => {
    expect(isGuestOnlyPath("/reset-password")).toBe(false);
  });

  it("ne confond pas un ecran avec son voisin", () => {
    expect(isGuestOnlyPath("/login/extra")).toBe(false);
    expect(isGuestOnlyPath("/dashboard")).toBe(false);
  });
});