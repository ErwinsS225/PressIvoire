import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * `vi.hoisted` : Vitest hisse les appels `vi.mock` au-dessus des imports, donc
 * une simple `const` declaree ici ne serait pas encore initialisee au moment ou
 * la fabrique s'execute.
 */
const { getContextMock } = vi.hoisted(() => ({ getContextMock: vi.fn() }));

vi.mock("@/lib/supabase/queries", () => ({ getContext: getContextMock }));

import { requireAdmin, requireStaff } from "./guards";

/**
 * Contexte minimal : seuls `pressing` et `profile` sont lus par les gardes.
 * `db` n'est qu'un passe-plat — aucune requete n'est emise dans ces tests.
 */
function contextFor(
  role: string | null,
  { pressing = true }: { pressing?: boolean } = {},
) {
  return {
    db: { from: vi.fn(), rpc: vi.fn(), auth: {} },
    pressing: pressing ? { id: "pressing-1" } : null,
    profile: role === null ? null : { full_name: "Aya Koné", role },
    userId: "user-1",
  };
}

beforeEach(() => {
  getContextMock.mockReset();
});

/*
 * Ces gardes doublent des policies RLS (`app_is_staff`,
 * `app_is_pressing_admin`) : ils rendent le refus LISIBLE avant que la base ne
 * reponde en anglais. Ce qu'il faut verifier, c'est donc surtout QUI passe et
 * QUEL message recoit celui qui ne passe pas.
 */
describe("requireStaff", () => {
  it("autorise tout le personnel, livreur compris", async () => {
    for (const role of ["owner", "manager", "cashier", "driver"]) {
      getContextMock.mockResolvedValue(contextFor(role));

      const result = await requireStaff();

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(`refus inattendu pour ${role}`);
      expect(result.context.pressing.id).toBe("pressing-1");
      expect(result.context.userId).toBe("user-1");
    }
  });

  it("refuse un client avec le message par defaut", async () => {
    getContextMock.mockResolvedValue(contextFor("client"));

    const result = await requireStaff();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("le client aurait dû être refusé");
    expect(result.error).toBe("Votre rôle ne permet pas cette action.");
  });

  it("compose le message avec le complement fourni", async () => {
    getContextMock.mockResolvedValue(contextFor("client"));

    const result = await requireStaff("de créer un client");

    if (result.ok) throw new Error("le client aurait dû être refusé");
    expect(result.error).toBe("Votre rôle ne permet pas de créer un client.");
  });

  it("refuse une session sans profil", async () => {
    getContextMock.mockResolvedValue(contextFor(null));

    const result = await requireStaff();

    expect(result.ok).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("autorise le gerant et le responsable", async () => {
    for (const role of ["owner", "manager"]) {
      getContextMock.mockResolvedValue(contextFor(role));

      const result = await requireAdmin("modifier le catalogue");

      expect(result.ok).toBe(true);
    }
  });

  it("refuse un caissier en disant qui a le droit", async () => {
    getContextMock.mockResolvedValue(contextFor("cashier"));

    const result = await requireAdmin("modifier le catalogue");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("le caissier aurait dû être refusé");
    expect(result.error).toBe(
      "Seul un gérant ou un responsable peut modifier le catalogue.",
    );
  });

  it("refuse un livreur, meme s'il fait partie du personnel", async () => {
    getContextMock.mockResolvedValue(contextFor("driver"));

    const result = await requireAdmin();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("le livreur aurait dû être refusé");
    expect(result.error).toBe(
      "Seul un gérant ou un responsable peut effectuer cette action.",
    );
  });
});

describe("compte sans pressing", () => {
  /*
   * Onboarding inacheve : il n'y a rien a autoriser. Le message doit parler du
   * pressing, pas du role — sinon le gerant fraichement inscrit croirait a un
   * probleme de droits.
   */
  it("prime sur le controle de role, pour les deux niveaux", async () => {
    getContextMock.mockResolvedValue(contextFor("owner", { pressing: false }));
    const staff = await requireStaff();
    expect(staff.ok).toBe(false);
    if (!staff.ok) {
      expect(staff.error).toBe("Aucun pressing n'est rattaché à ce compte.");
    }

    const admin = await requireAdmin();
    expect(admin.ok).toBe(false);
    if (!admin.ok) {
      expect(admin.error).toBe("Aucun pressing n'est rattaché à ce compte.");
    }
  });
});
