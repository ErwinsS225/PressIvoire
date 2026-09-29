import { describe, it, expect } from "vitest";

import { buildRevenueCsv, revenueFileBase } from "./chart-export";

/*
 * Ces tests verrouillent le format du fichier CSV téléchargé par le menu
 * « Exporter en CSV » de la carte Chiffre d'affaires. Le séparateur `;` et le
 * BOM sont voulus : ouvrir un CSV virgule dans Excel en français donne une
 * seule colonne, ce qui est un défaut bloquant pour l'utilisateur final.
 */
describe("buildRevenueCsv", () => {
    const rows = [
        { month: "oct.", revenue: 125000 },
        { month: "nov.", revenue: 0 },
        { month: "déc.", revenue: 999.6 },
    ];

    it("commence par un BOM UTF-8 et un en-tête en français", () => {
        const csv = buildRevenueCsv(rows);
        expect(csv.startsWith("\uFEFF")).toBe(true);
        expect(csv).toContain("Mois;Revenu (FCFA)");
    });

    it("sépare les champs par point-virgule et les lignes par CRLF", () => {
        const csv = buildRevenueCsv(rows);
        const lines = csv.replace("\uFEFF", "").split("\r\n");
        expect(lines[0]).toBe("Mois;Revenu (FCFA)");
        expect(lines[1]).toBe("oct.;125000");
        // Le montant est un chiffre brut, pas un libellé formaté « 0 FCFA » :
        // le CSV doit rester réimportable dans un tableur.
        expect(lines[2]).toBe("nov.;0");
        expect(lines[lines.length - 1]).toBe("");
    });

    it("arrondit les montants non entiers", () => {
        expect(buildRevenueCsv(rows)).toContain("déc.;1000");
    });

    it("échappe les champs contenant le séparateur ou des guillemets", () => {
        const csv = buildRevenueCsv([{ month: 'sept; "rentrée"', revenue: 10 }]);
        expect(csv).toContain('"sept; ""rentrée""";10');
    });

    it("produit un en-tête seul quand il n'y a aucune donnée", () => {
        const csv = buildRevenueCsv([]);
        expect(csv).toBe("\uFEFFMois;Revenu (FCFA)\r\n");
    });
});

describe("revenueFileBase", () => {
    it("formate la date locale en AAAA-MM-JJ", () => {
        expect(revenueFileBase(new Date(2026, 8, 27))).toBe("chiffre-affaires-2026-09-27");
    });

    it("complète le jour et le mois sur deux chiffres", () => {
        expect(revenueFileBase(new Date(2026, 0, 5))).toBe("chiffre-affaires-2026-01-05");
    });
});
