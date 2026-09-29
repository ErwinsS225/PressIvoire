/**
 * Exports de la carte « Chiffre d'affaires » (PNG + CSV).
 *
 * Deux niveaux :
 *  - fonctions PURES (`buildRevenueCsv`, `revenueFileBase`) : testables sous
 *    l'environnement « node » de vitest ;
 *  - fonctions DOM (`exportRevenueCsv`, `exportChartPng`) : uniquement appelées
 *    depuis un composant client, jamais importées en top-level par les tests
 *    (leur corps n'accède à `document`/`window` qu'à l'exécution).
 *
 * Choix du séparateur `;` + BOM UTF-8 : l'export vise les utilisateurs
 * francophones (Côte d'Ivoire) qui ouvrent les fichiers dans Excel, dont la
 * locale attend `;` — un CSV virgule s'ouvrirait en une seule colonne.
 */

export interface RevenueRow {
    month: string;
    revenue: number;
}

const UTF8_BOM = "\uFEFF";

/** Échappement RFC 4180 : guillemets doublés, champ entier entre guillemets si besoin. */
function escapeCsvField(value: string): string {
    if (/[;\n\r"]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Construit le contenu CSV des 12 mois : en-tête `Mois;Revenu (FCFA)`,
 * une ligne par mois, montants en chiffres bruts (réimportables).
 * Ligne terminée par CRLF, comme attendu par Excel.
 */
export function buildRevenueCsv(rows: RevenueRow[]): string {
    const lines = ["Mois;Revenu (FCFA)"];
    for (const row of rows) {
        lines.push(`${escapeCsvField(row.month)};${Math.round(row.revenue)}`);
    }
    return `${UTF8_BOM}${lines.join("\r\n")}\r\n`;
}

/** Base commune des noms de fichiers : `chiffre-affaires-2026-09-27`. */
export function revenueFileBase(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `chiffre-affaires-${year}-${month}-${day}`;
}

/** Déclenche le téléchargement d'un Blob via une ancre éphémère. */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Révocation différée : le navigateur a besoin de l'URL pendant le clic.
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}


/**
 * Repère la couleur de fond derrière le graphique (carte, page…) en remontant
 * les ancêtres jusqu'à la première fond opaque — le canvas PNG doit être peint,
 * sinon le fond sortirait transparent.
 */
function resolveBackground(el: Element): string {
    let node: Element | null = el;
    while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
            return bg;
        }
        node = node.parentElement;
    }
    // Repli : la variable `--background` du thème (HSL brut).
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
    return raw ? `hsl(${raw})` : "#ffffff";
}

/**
 * Le SVG cloné est rendu HORS du document (blob → <img>), il perd donc les
 * classes Tailwind et les variables CSS : `var(--color-revenue)` serait peint
 * en noir. On « cuit » chaque style calculé (couleur, police) en attribut
 * direct sur le clone, ce qui fige le rendu tel qu'il est à l'écran.
 */
function bakeComputedStyles(source: Element, clone: Element): void {
    const originals = [source, ...source.querySelectorAll("*")];
    const copies = [clone, ...clone.querySelectorAll("*")];

    originals.forEach((el, i) => {
        const copy = copies[i];
        if (!copy) return;
        const computed = getComputedStyle(el);
        copy.setAttribute("fill", computed.fill);
        copy.setAttribute("stroke", computed.stroke);

        const tag = el.tagName.toLowerCase();
        if (tag === "text" || tag === "tspan") {
            copy.setAttribute("font-family", computed.fontFamily);
            copy.setAttribute("font-size", computed.fontSize);
            copy.setAttribute("font-weight", computed.fontWeight);
        }
    });
}

/**
 * Exporte le graphique en PNG en sérialisant le SVG recharts puis en le
 * rasterisant sur un canvas (échelle ×2 pour la netteté sur écran Retina).
 *
 * Le PNG contient le graphique seul (pas le header ni les stats), sur le
 * fond de la carte.
 */
export async function exportChartPng(container: HTMLElement, filename: string): Promise<void> {
    const svg = container.querySelector("svg");
    if (!svg) {
        throw new Error("Aucun graphique à exporter.");
    }

    const rect = svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    bakeComputedStyles(svg, clone);

    const background = resolveBackground(container);
    const svgUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], {
            type: "image/svg+xml;charset=utf-8",
        }),
    );

    try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("SVG illisible."));
            image.src = svgUrl;
        });

        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Canvas indisponible.");
        }
        ctx.scale(scale, scale);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        const png = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
        );
        if (!png) {
            throw new Error("Encodage PNG impossible.");
        }
        downloadBlob(png, filename);
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
}

/** Construit puis télécharge le CSV des revenus mensuels. */
export function exportRevenueCsv(rows: RevenueRow[], filename: string): void {
    const csv = buildRevenueCsv(rows);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}
