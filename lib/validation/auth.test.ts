import { describe, it, expect } from "vitest";

import {
  describeExistingAccount,
  isFreshAccount,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
} from "./auth";

/*
 * Ces schemas sont la premiere barriere de l'authentification : ils filtrent
 * ce que le navigateur envoie. Les Server Actions les reappliquent (elles ne
 * peuvent pas faire confiance au client), mais un laxisme ici se traduirait
 * par un message d'erreur obscur cote serveur au lieu d'un message clair
 * sous le champ.
 */

const VALID_PASSWORD = "Pressing2026";

describe("loginSchema", () => {
  it("accepte un email", () => {
    const result = loginSchema.safeParse({
      identifier: "gerant@pressing.ci",
      password: "peu importe",
    });
    expect(result.success).toBe(true);
  });

  it("accepte un numero ivoirien, meme brut", () => {
    // L'UI annonce « email ou téléphone » : refuser 0708091011 ferait
    // echouer la connexion avant meme d'atteindre Supabase.
    const result = loginSchema.safeParse({
      identifier: "0708091011",
      password: "peu importe",
    });
    expect(result.success).toBe(true);
  });

  it("accepte un numero avec espaces et indicatif", () => {
    const result = loginSchema.safeParse({
      identifier: "+225 07 08 09 10 11",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("refuse un identifiant vide", () => {
    expect(
      loginSchema.safeParse({ identifier: "", password: "x" }).success,
    ).toBe(false);
  });

  it("refuse un email mal forme", () => {
    const result = loginSchema.safeParse({
      identifier: "pas-un-email",
      password: "x",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un mot de passe vide", () => {
    expect(
      loginSchema.safeParse({ identifier: "a@b.ci", password: "" }).success,
    ).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    role: "owner",
    fullName: "Aya Kone",
    phone: "0708091011",
    email: "aya@pressing.ci",
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  };

  it("accepte une inscription valide", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("normalise le telephone au format attendu en base", () => {
    const result = registerSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      // Le CHECK de la colonne est ^\+225[0-9]{8,10}$.
      expect(result.data.phone).toBe("+2250708091011");
    }
  });

  it("normalise l'email en minuscules", () => {
    const result = registerSchema.safeParse({ ...base, email: "AYA@Pressing.CI" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("aya@pressing.ci");
  });

  it("refuse un role hors liste blanche", () => {
    // `driver` et `manager` ne sont pas des roles d'inscription : les
    // attribuer ici elevations un compte. La liste blanche est aussi
    // revalidee par le trigger SQL handle_new_user().
    for (const role of ["driver", "manager", "cashier", "admin", ""]) {
      expect(registerSchema.safeParse({ ...base, role }).success).toBe(false);
    }
  });

  it("refuse un mot de passe trop faible", () => {
    // 8 caracteres minimum, 1 chiffre, 1 minuscule, 1 majuscule.
    expect(registerSchema.safeParse({ ...base, password: "court", confirmPassword: "court" }).success).toBe(false);
    // Sans majuscule — les deux champs identiques, pour que l'echec porte
    // bien sur la politique de mot de passe et pas sur la confirmation.
    expect(registerSchema.safeParse({ ...base, password: "tousminuscules1", confirmPassword: "tousminuscules1" }).success).toBe(false);
    // Sans chiffre
    expect(registerSchema.safeParse({ ...base, password: "MotDePasse", confirmPassword: "MotDePasse" }).success).toBe(false);
  });

  it("accepte un mot de passe melee de majuscules, minuscules et chiffres", () => {
    // Contre-test : la regle est la presence des trois classes, pas leur
    // proportion. "Chiffres12345" est un mot de passe parfaitement valide.
    const strong = {
      ...base,
      password: "Chiffres12345",
      confirmPassword: "Chiffres12345",
    };
    expect(registerSchema.safeParse(strong).success).toBe(true);
  });

  it("refuse des confirmations divergentes", () => {
    const result = registerSchema.safeParse({
      ...base,
      confirmPassword: "AutreMotDePasse1",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un nom trop court", () => {
    expect(registerSchema.safeParse({ ...base, fullName: "A" }).success).toBe(
      false,
    );
  });

  it("refuse un numero trop court", () => {
    // Le CHECK est ^\+225[0-9]{8,10}$ : moins de 8 chiffres apres
    // l'indicatif est rejete.
    expect(registerSchema.safeParse({ ...base, phone: "1234" }).success).toBe(
      false,
    );
  });

  it("accepte les prefixes ivoiriens valides", () => {
    // Contre-test : 05 (Orange), 07 (MTN), 01 (Wave) sont tous des
    // prefixes reellement utilises en Cote d'Ivoire. "0612345678" fait
    // 10 chiffres : il est donc valide au regard du CHECK.
    for (const phone of ["0508091011", "0708091011", "0108091011", "0612345678"]) {
      expect(registerSchema.safeParse({ ...base, phone }).success).toBe(true);
    }
  });
});

describe("resetPasswordSchema", () => {
  it("accepte un nouveau mot de passe sans l'ancien", () => {
    // Le schema doit rester utilisable sans l'ancien mot de passe : l'action
    // ne le controle que lorsqu'il est fourni.
    const result = resetPasswordSchema.safeParse({
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });
    expect(result.success).toBe(true);
  });

  it("accepte le mot de passe actuel quand il est fourni", () => {
    // L'ecran mobile le demande, et l'action le verifie. Le schema doit donc
    // l'accepter sans l'exiger.
    const result = resetPasswordSchema.safeParse({
      currentPassword: "ancien",
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });
    expect(result.success).toBe(true);
  });

  it("refuse des confirmations divergentes", () => {
    const result = resetPasswordSchema.safeParse({
      password: VALID_PASSWORD,
      confirmPassword: "Different2026",
    });
    expect(result.success).toBe(false);
  });

  it("exige une politique de mot de passe stricte", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "faible",
        confirmPassword: "faible",
      }).success,
    ).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("refuse une adresse mal formee", () => {
    expect(forgotPasswordSchema.safeParse({ email: "pas-un-email" }).success).toBe(false);
  });

  it("accepte une adresse valide", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "gerant@pressing.ci" }).success,
    ).toBe(true);
  });
});

/*
 * Ces tests couvrent le cas qui a produit le piege rapporte : un gerant ayant
 * deja configure son pressing qui s'inscrit avec une autre adresse, et decouvre
 * a l'ecran d'onboarding qu'il tourne en rond. Le message doit donc designer la
 * sortie (se connecter) — c'est ce que verifie « propose de se connecter ».
 */
describe("describeExistingAccount", () => {
  it("laisse passer un email et un numero libres", () => {
    const result = describeExistingAccount({
      emailTaken: false,
      phoneTaken: false,
      hasPressing: false,
    });
    expect(result.error).toBeUndefined();
    expect(result.fieldErrors).toBeUndefined();
  });

  it("refuse un email deja pris et pointe le champ", () => {
    const result = describeExistingAccount({
      emailTaken: true,
      phoneTaken: false,
      hasPressing: false,
    });
    expect(result.error).toMatch(/existe déjà/i);
    expect(result.fieldErrors?.email).toBeTruthy();
    expect(result.fieldErrors?.phone).toBeUndefined();
  });

  it("refuse un numero deja pris et pointe le champ", () => {
    const result = describeExistingAccount({
      emailTaken: false,
      phoneTaken: true,
      hasPressing: false,
    });
    expect(result.error).toMatch(/existe déjà/i);
    expect(result.fieldErrors?.phone).toBeTruthy();
    expect(result.fieldErrors?.email).toBeUndefined();
  });

  it("pointe les deux champs quand les deux sont pris", () => {
    const result = describeExistingAccount({
      emailTaken: true,
      phoneTaken: true,
      hasPressing: false,
    });
    expect(result.fieldErrors?.email).toBeTruthy();
    expect(result.fieldErrors?.phone).toBeTruthy();
  });

  /*
   * Le cas central. Un pressing existe deja sur ce numero : l'utilisateur a
   * donc DEJA fait l'onboarding ailleurs. Insister sur « connectez-vous »
   * plutot que sur « numero invalide » est ce qui lui evite de recommencer un
   * parcours de trois etapes pour rien.
   */
  it("propose de se connecter quand un pressing est deja rattache", () => {
    const result = describeExistingAccount({
      emailTaken: true,
      phoneTaken: true,
      hasPressing: true,
    });
    expect(result.error).toMatch(/pressing/i);
    expect(result.error).toMatch(/connectez-vous/i);
  });

  it("l'emporte sur le doublon simple quand un pressing existe", () => {
    // Meme avec l'email libre, le pressing doit primer : c'est l'information
    // la plus utile, celle qui evite l'onboarding inutile.
    const result = describeExistingAccount({
      emailTaken: false,
      phoneTaken: true,
      hasPressing: true,
    });
    expect(result.error).toMatch(/pressing/i);
  });

  /*
   * Non-revelation : le message ne doit nommer NI le compte NI son pressing.
   * Sans cette garantie, la fonction deviendrait un oracle d'enumeration des
   * gerants inscrits, utilisable depuis le formulaire public.
   */
  it("ne nomme jamais le compte existant", () => {
    for (const probe of [
      { emailTaken: true, phoneTaken: false, hasPressing: false },
      { emailTaken: false, phoneTaken: true, hasPressing: true },
      { emailTaken: true, phoneTaken: true, hasPressing: true },
    ]) {
      const { error } = describeExistingAccount(probe);
      expect(error).not.toMatch(/@/);
      expect(error).not.toMatch(/\+225/);
    }
  });
});

/*
 * Le second piege : un compte qui revient sans pressing et sans comprendre
 * pourquoi. Ces tests fixent la.frontiere entre « inscription en cours » et
 * « blocage » — isFresh ne doit pas harceler, ni manquer un blocage.
 */
describe("isFreshAccount", () => {
  const NOW = Date.parse("2026-09-28T12:00:00Z");
  const minutesAgo = (n: number) =>
    new Date(NOW - n * 60_000).toISOString();

  it("considere comme fraiche une inscription de l'instant", () => {
    expect(isFreshAccount(minutesAgo(0), NOW)).toBe(true);
  });

  it("considere comme fraiche un compte de 30 minutes", () => {
    expect(isFreshAccount(minutesAgo(30), NOW)).toBe(true);
  });

  it("considere comme ancien un compte de 2 heures", () => {
    expect(isFreshAccount(minutesAgo(120), NOW)).toBe(false);
  });

  it("considere comme ancien un compte de plusieurs jours", () => {
    expect(isFreshAccount(minutesAgo(60 * 24 * 3), NOW)).toBe(false);
  });

  it("ne suppose pas le blocage sur une date illisible", () => {
    expect(isFreshAccount("pas-une-date", NOW)).toBe(true);
    expect(isFreshAccount("", NOW)).toBe(true);
  });

  it("ne suppose pas le blocage sur une date dans le futur", () => {
    // Un decalage d'horloge ne doit pas afficher un avertissement injustifie.
    const future = new Date(NOW + 60 * 60_000).toISOString();
    expect(isFreshAccount(future, NOW)).toBe(true);
  });
});
