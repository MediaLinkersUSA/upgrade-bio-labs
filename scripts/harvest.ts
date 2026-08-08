/**
 * Downloads the full-resolution source photo for every SKU into /source-images.
 *
 * These are the only record of label truth (printed name, mg, branding), so the
 * regeneration pipeline is image-to-image from these files. Keep them committed:
 * when a label changes you re-run one SKU instead of rebuilding the pipeline.
 *
 * Run: npx tsx scripts/harvest.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { products } from "../src/data/products";

const OUT = path.join(__dirname, "..", "source-images");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

/** WooCommerce serves sized derivatives; strip the -WxH suffix for the original. */
const fullRes = (url: string) => url.replace(/-\d+x\d+(\.(?:jpe?g|png|webp))$/i, "$1");

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  let ok = 0;
  const failed: string[] = [];

  for (const p of products) {
    const ext = (p.sourceImage.match(/\.(jpe?g|png|webp)$/i)?.[1] ?? "jpg").toLowerCase();
    const dest = path.join(OUT, `${p.slug}.${ext}`);

    try {
      await fs.access(dest);
      ok++;
      continue; // already harvested
    } catch {
      /* not yet downloaded */
    }

    for (const candidate of [fullRes(p.sourceImage), p.sourceImage]) {
      try {
        const res = await fetch(candidate, { headers: { "User-Agent": UA } });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 2000) continue; // almost certainly an error page
        await fs.writeFile(dest, buf);
        console.log(`harvested ${p.slug} (${(buf.length / 1024).toFixed(0)}kb)`);
        ok++;
        break;
      } catch {
        /* try next candidate */
      }
    }

    try {
      await fs.access(dest);
    } catch {
      console.warn(`FAILED ${p.slug} -> ${p.sourceImage}`);
      failed.push(p.slug);
    }
  }

  console.log(`\nharvested ${ok}/${products.length}`);
  if (failed.length) console.log(`failed: ${failed.join(", ")}`);
}

main();
