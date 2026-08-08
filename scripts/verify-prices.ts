/**
 * Diffs every price and quantity tier in src/data/products.ts against a fresh
 * scrape of upgradebiolabs.com. Exits non-zero on any mismatch.
 *
 * Run: npx tsx scripts/verify-prices.ts [dir-with-shop-html]
 */
import fs from "node:fs";
import path from "node:path";
import { products } from "../src/data/products";

const dir = process.argv[2] ?? path.join(__dirname, "..", "..", "scrape");

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

type Live = {
  slug: string;
  name: string;
  base: number | null;
  tiers: Record<string, number>;
};

function scrape(): Map<string, Live> {
  const out = new Map<string, Live>();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(dir, f), "utf8");
    const re =
      /<div class="col-xl-3 col-lg-4 col-md-6 default-portfolio-item masonry-item/g;
    const idx: number[] = [];
    let m;
    while ((m = re.exec(html))) idx.push(m.index);

    idx.forEach((start, n) => {
      const c = html.slice(start, idx[n + 1] ?? start + 20000);
      const url = c.match(/href="(https:\/\/upgradebiolabs\.com\/product\/[^"]+)"/)?.[1];
      if (!url) return;
      const slug = url.replace(/.*\/product\/([^/]+)\/?$/, "$1");
      const name = decode(c.match(/data-product-name="([^"]*)"/)?.[1] ?? "");
      const base = parseFloat(c.match(/data-product-price="([^"]*)"/)?.[1] ?? "") || null;

      const tiers: Record<string, number> = {};
      const raw = c.match(/data-product-variations='([\s\S]*?)'\s*\n/)?.[1];
      if (raw) {
        try {
          for (const v of JSON.parse(decode(raw))) {
            const q = v.qty_label || "1-2";
            const p = parseFloat(v.final_price || v.regular_price || "0");
            if (!p) continue;
            if (!tiers[q] || p < tiers[q]) tiers[q] = p;
          }
        } catch {
          /* skip malformed */
        }
      }
      out.set(slug, { slug, name, base, tiers });
    });
  }
  return out;
}

const live = scrape();
const TIER_MIN: Record<string, number> = { "1-2": 1, "3-5": 3, "5+": 5 };

const problems: string[] = [];
let checked = 0;

for (const p of products) {
  const l = live.get(p.slug);
  if (!l) {
    problems.push(`${p.slug}: not found on live site`);
    continue;
  }
  checked++;

  // Our basePrice is the single-unit price, i.e. the 1-2 band.
  const liveBase = l.tiers["1-2"] ?? l.base;
  if (liveBase != null && Math.abs(liveBase - p.basePrice) > 0.001) {
    problems.push(
      `${p.slug}: basePrice ours ${p.basePrice} vs live ${liveBase}`
    );
  }

  for (const [band, livePrice] of Object.entries(l.tiers)) {
    const minQty = TIER_MIN[band];
    const ours = p.tiers.find((t) => t.minQty === minQty);
    if (!ours) {
      problems.push(`${p.slug}: missing tier ${band} (live ${livePrice})`);
      continue;
    }
    if (Math.abs(ours.unitPrice - livePrice) > 0.001) {
      problems.push(
        `${p.slug}: tier ${band} ours ${ours.unitPrice} vs live ${livePrice}`
      );
    }
  }

  for (const t of p.tiers) {
    const band = Object.keys(TIER_MIN).find((b) => TIER_MIN[b] === t.minQty);
    if (band && l.tiers[band] == null) {
      problems.push(`${p.slug}: we have tier ${band} that live does not`);
    }
  }
}

const extra = [...live.keys()].filter((s) => !products.some((p) => p.slug === s));

console.log(`live SKUs scraped : ${live.size}`);
console.log(`local SKUs        : ${products.length}`);
console.log(`compared          : ${checked}`);
if (extra.length) console.log(`on live, not local: ${extra.join(", ")}`);

if (problems.length) {
  console.error(`\n${problems.length} MISMATCH(ES):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("\nAll prices and quantity tiers match the live site exactly.");
