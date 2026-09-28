/**
 * Generation des icones PWA (192 et 512 px).
 *
 * Aucune dependance externe : on ecrit le PNG a la main (en-tete IHDR +
 * pixels RGBA compresses en zlib + CRC32). Un script de build serait
 * disproportionne pour deux images fixes, et ajouter sharp/canvas
 * alourdirait le projet pour rien.
 *
 *   node scripts/generate-icons.mjs
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

/** Vert de marque #0F766E. */
const BRAND = [15, 118, 110];

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

/**
 * Rond plein de la couleur de marque sur fond blanc, avec un trou central
 * evoquant le « P » du logo. Forme circulaire : elle reste lisible en
 * vignette (maskable) sans etre rosee par le systeme.
 */
function makePng(size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;
  const hole = size * 0.19;

  // Chaque ligne PNG commence par un octet de filtre (0 = aucun).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const inside = d <= radius && d >= hole;
      if (inside) {
        raw[o++] = BRAND[0];
        raw[o++] = BRAND[1];
        raw[o++] = BRAND[2];
      } else {
        raw[o++] = 255;
        raw[o++] = 255;
        raw[o++] = 255;
      }
      raw[o++] = 255; // alpha opaque
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur 8 bits
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, makePng(size));
  console.log(`ecrit ${file}`);
}
