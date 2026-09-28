import { describe, it, expect } from "vitest";

import {
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
    // L'ecran desktop `/auth/reset-password` ne demande pas l'ancien mot de
    // passe : l'exiger dans le schema le rendrait inutilisable.
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
