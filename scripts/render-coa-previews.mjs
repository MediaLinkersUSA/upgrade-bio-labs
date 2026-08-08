/**
 * Renders page 1 of every product COA to an image.
 *
 * The product gallery previously showed a hand-built table of representative
 * values with a note admitting it was "illustrative". That is exactly backwards
 * for a store whose whole pitch is "the receipts are published": the proof
 * panel was the one thing on the page that was not real. These are renders of
 * the actual signed PDFs.
 *
 * Input : product.coaUrl (or our own /api/coa proxy)
 * Output: public/coa/<slug>.webp
 *
 * Run: node scripts/render-coa-previews.mjs [--only=slug]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { pdf } from "pdf-to-img";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "coa");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];

/** Render scale. 2 gives a legible page at the ~560px the gallery shows. */
const SCALE = 2;
/** Output width. The page is portrait, so height follows. */
const WIDTH = 900;

function readProducts() {
  const src = fs.readFileSync(path.join(ROOT, "src", "data", "products.ts"), "utf8");
  const m = src.match(/export const products[^=]*=\s*(\[[\s\S]*\])\s*;/);
  if (!m) throw new Error("could not locate the products array");
  return JSON.parse(m[1]);
}

async function renderOne(slug, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // pdf-to-img wraps pdfjs with its own canvas backend, which avoids the
  // node-canvas binding mismatch that made pdfjs reject its own context.
  const doc = await pdf(buf, { scale: SCALE });
  const first = await doc.getPage(1);

  await sharp(first)
    .flatten({ background: "#ffffff" })
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(OUT, `${slug}.webp`));

  return fs.statSync(path.join(OUT, `${slug}.webp`)).size;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const products = readProducts().filter((p) => p.coaUrl && (!ONLY || p.slug === ONLY));
  console.log(`Rendering ${products.length} COA previews...\n`);

  let ok = 0;
  const failed = [];
  for (const p of products) {
    try {
      const size = await renderOne(p.slug, p.coaUrl);
      ok++;
      console.log(`  ${p.slug.padEnd(40)} ${(size / 1024) | 0}KB`);
    } catch (e) {
      failed.push(`${p.slug}: ${e.message}`);
      console.warn(`  ${p.slug.padEnd(40)} FAILED (${e.message})`);
    }
  }

  console.log(`\n${ok} rendered, ${failed.length} failed`);
  if (failed.length) failed.forEach((f) => console.log(`  ${f}`));
}

main();
