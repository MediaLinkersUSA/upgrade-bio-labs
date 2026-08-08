/**
 * Recrops the catalogue shots so the product fills the frame.
 *
 * As scraped, each 1200x1200 shot carried a huge white margin - the product
 * occupied only 32-41% of the area, and a vial was just 532px wide inside a
 * 1200px file. On a 300px card that renders the vial at roughly 130px, which
 * is why they looked both small and soft: most of the pixel budget was being
 * spent on empty paper.
 *
 * Cropping to content and re-padding to a square roughly doubles the product's
 * effective resolution at the same display size, with no upscaling and no
 * change to the photography itself.
 *
 * Run: npx tsx scripts/tighten-product-shots.ts [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "products");
const BACKUP = path.join(process.cwd(), "public", "products-original");
const DRY = process.argv.includes("--dry");

/** Output edge, matching the previous files. */
const SIZE = 1200;
/** Breathing room around the product, as a fraction of the crop's long edge. */
const MARGIN = 0.06;
/** Below this a pixel is product or shadow rather than backdrop. */
const CONTENT = 250;
/** Fraction of the frame height over which the bottom shadow is faded out. */
const FADE = 0.05;
/** Pixels darker than this are product and are never faded. */
const SHADOW_FLOOR = 200;
/**
 * Below this a pixel is structural product - label bands, cap, outlines -
 * never cast shadow.
 *
 * Centring on the CONTENT box put the vial visibly left of centre, because
 * that box includes the shadow falling to the right. The frame is centred on
 * this darker core instead, so the product sits in the middle and the soft
 * shadow is simply allowed to run off the edge.
 */
const CORE = 150;

async function tighten(file: string) {
  const src = path.join(DIR, file);
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;

  const lum = (x: number, y: number) => {
    const o = (y * w + x) * c;
    return Math.min(data[o], data[o + 1], data[o + 2]);
  };

  const bbox = (cut: number) => {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (lum(x, y) < cut) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, found: x1 >= 0 };
  };

  const core = bbox(CORE);
  if (!core.found) {
    console.warn(`  skip ${file} (no product found)`);
    return;
  }

  /**
   * The product's own extent, with the cast shadow excluded.
   *
   * Two separate jobs, and conflating them is what went wrong twice:
   *
   *   SIZING must include the white cap and base, which read brighter than the
   *   CORE threshold. Sizing off the dark core alone clipped the capsule cap
   *   and the spray nozzle.
   *
   *   CENTRING must exclude the shadow. The shadow falls below and to one
   *   side, so centring on product-plus-shadow lifts the product visibly
   *   towards the top of the frame - which is what it did.
   *
   * So the top comes from raw content (nothing casts a shadow upward), the
   * bottom from the dark core plus a small allowance for the base, and the
   * frame is centred on that box rather than on everything that is not white.
   */
  const BASE_ALLOWANCE = 0.03;
  let productTop = h;
  for (let y = 0; y < h && productTop === h; y++) {
    for (let x = 0; x < w; x++) {
      if (lum(x, y) < CONTENT) {
        productTop = y;
        break;
      }
    }
  }
  const productBottom = Math.min(
    h - 1,
    core.y1 + Math.round(core.h * BASE_ALLOWANCE)
  );

  // Horizontal extent measured only across the product's own rows, so the
  // shadow pooling below it cannot widen the box.
  let productLeft = w;
  let productRight = -1;
  for (let y = productTop; y <= productBottom; y++) {
    for (let x = 0; x < w; x++) {
      if (lum(x, y) < CONTENT) {
        if (x < productLeft) productLeft = x;
        if (x > productRight) productRight = x;
      }
    }
  }

  const cx = (productLeft + productRight) / 2;
  const cy = (productTop + productBottom) / 2;

  // Square box big enough to hold the product on every side of that centre.
  const half = Math.max(
    cx - productLeft,
    productRight - cx,
    cy - productTop,
    productBottom - cy
  );
  const box = Math.min(w, h, Math.round(half * 2 * (1 + MARGIN * 2)));

  const left = Math.max(0, Math.min(w - box, Math.round(cx - box / 2)));
  const top = Math.max(0, Math.min(h - box, Math.round(cy - box / 2)));

  const before = fs.statSync(src).size;
  if (DRY) {
    console.log(`  ${file.padEnd(40)} product ${productRight - productLeft + 1}x${productBottom - productTop + 1} -> frame ${box}`);
    return;
  }

  const cropped = await sharp(src)
    .extract({ left, top, width: box, height: box })
    .resize(SIZE, SIZE, { fit: "contain", background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  /**
   * Fade the cast shadow out before the frame edge.
   *
   * Tightening the crop leaves the tail of the shadow running into the bottom
   * of the frame, which reads as a faint grey seam against a white card. Only
   * pale pixels are touched and only in the last few rows, so a product that
   * genuinely reaches the edge is left alone.
   */
  const fadeRows = Math.round(SIZE * FADE);
  const buf = cropped.data;
  const ch = cropped.info.channels;
  for (let r = 0; r < fadeRows; r++) {
    const y = SIZE - 1 - r;
    const mix = 1 - r / fadeRows; // 1 at the very edge, 0 where the fade ends
    for (let x = 0; x < SIZE; x++) {
      const o = (y * SIZE + x) * ch;
      if (Math.min(buf[o], buf[o + 1], buf[o + 2]) < SHADOW_FLOOR) continue;
      for (let k = 0; k < 3; k++) {
        buf[o + k] = Math.round(buf[o + k] + (255 - buf[o + k]) * mix);
      }
    }
  }

  const out = await sharp(buf, {
    raw: { width: SIZE, height: SIZE, channels: ch as 3 | 4 },
  })
    // Quality up from the scrape's aggressive setting: these are flat studio
    // renders where banding on the glass gradient is the first thing to show.
    .webp({ quality: 92, effort: 6 })
    .toBuffer();

  fs.writeFileSync(src, out);
  console.log(
    `  ${file.padEnd(40)} product ${(((productBottom - productTop + 1) / box) * 100).toFixed(0)}% of frame  ${(before / 1024) | 0}KB -> ${(out.length / 1024) | 0}KB`
  );
}

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".webp"));

  if (!DRY) {
    // Keep the originals: the crop is lossy and there is no way back otherwise.
    if (!fs.existsSync(BACKUP)) {
      fs.mkdirSync(BACKUP, { recursive: true });
      for (const f of files) fs.copyFileSync(path.join(DIR, f), path.join(BACKUP, f));
      console.log(`Backed up ${files.length} originals to public/products-original\n`);
    } else {
      // Re-run from the pristine copies so cropping never compounds.
      for (const f of files) {
        const b = path.join(BACKUP, f);
        if (fs.existsSync(b)) fs.copyFileSync(b, path.join(DIR, f));
      }
      console.log("Restored from backup before recropping\n");
    }
  }

  console.log(`Tightening ${files.length} shots...`);
  for (const f of files) await tighten(f);
  console.log("Done.");
}

main();
