/**
 * Re-checks every SKU's stock status against the live upgradebiolabs.com page.
 *
 * The original scrape carried an `outOfStock` boolean that disagreed with its
 * own `stockQty` on three SKUs (Wolverine Blend said out of stock with 7 in
 * hand). Stock is the one field that genuinely drifts, so it gets read from
 * the source of truth rather than trusted from a months-old capture.
 *
 * Run: npx tsx scripts/verify-stock.ts          (report only)
 *      npx tsx scripts/verify-stock.ts --write  (apply to products.ts)
 */
import fs from "node:fs";
import path from "node:path";

const PRODUCTS = path.join(process.cwd(), "src", "data", "products.ts");
const WRITE = process.argv.includes("--write");

type Product = { slug: string; name: string; inStock: boolean };

function load() {
  const src = fs.readFileSync(PRODUCTS, "utf8");
  const m = src.match(/(export const products[^=]*=\s*)(\[[\s\S]*\])(\s*;)/);
  if (!m) throw new Error("could not locate the products array");
  return { src, head: m[1], json: m[2], start: m.index! + m[1].length };
}

/**
 * WooCommerce renders the availability badge as <p class="stock ...">TEXT</p>.
 * The page also carries related-product cards with their own badges, so the
 * first *non-empty* match is taken: the main product summary precedes them.
 */
function readStock(html: string): boolean | null {
  const hits = [...html.matchAll(/class="stock[^"]*"[^>]*>([^<]{0,80})/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  if (!hits.length) return null;
  const first = hits[0].toLowerCase();
  if (first.includes("out of stock")) return false;
  if (first.includes("in stock")) return true;
  return null;
}

async function main() {
  const { src, json, start } = load();
  const products: Product[] = JSON.parse(json);

  const changes: { slug: string; name: string; from: boolean; to: boolean }[] = [];
  const unknown: string[] = [];

  for (const p of products) {
    const res = await fetch(`https://upgradebiolabs.com/product/${p.slug}/`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).catch(() => null);

    if (!res?.ok) {
      unknown.push(`${p.slug} (HTTP ${res?.status ?? "error"})`);
      continue;
    }

    const live = readStock(await res.text());
    if (live === null) {
      unknown.push(`${p.slug} (no badge)`);
      continue;
    }
    if (live !== p.inStock) {
      changes.push({ slug: p.slug, name: p.name, from: p.inStock, to: live });
    }

    await new Promise((r) => setTimeout(r, 180)); // be polite
  }

  console.log(`Checked ${products.length} SKUs against the live site.\n`);

  if (changes.length) {
    console.log("MISMATCHES:");
    for (const c of changes) {
      console.log(
        `  ${c.name.padEnd(30)} ours: ${c.from ? "in stock" : "OUT"}  ->  live: ${c.to ? "in stock" : "OUT"}`
      );
    }
  } else {
    console.log("Stock matches the live site on every SKU.");
  }

  if (unknown.length) console.log(`\nCould not read: ${unknown.join(", ")}`);

  if (WRITE && changes.length) {
    const bySlug = new Map(changes.map((c) => [c.slug, c.to]));
    for (const p of products) {
      if (bySlug.has(p.slug)) p.inStock = bySlug.get(p.slug)!;
    }
    fs.writeFileSync(
      PRODUCTS,
      src.slice(0, start) + JSON.stringify(products, null, 2) + src.slice(start + json.length)
    );
    console.log(`\nApplied ${changes.length} change(s) to products.ts`);
  } else if (changes.length) {
    console.log("\nRe-run with --write to apply.");
  }
}

main();
