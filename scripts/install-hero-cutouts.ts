/**
 * Normalises matted product cutouts into public/hero.
 *
 * Input : a directory of transparent PNGs (default /tmp/matte)
 * Output: public/hero/<slug>.png, trimmed to content and height-normalised
 *
 * Run:    npx tsx scripts/install-hero-cutouts.ts [srcDir]
 *
 * PROVENANCE. The alpha channel is produced by a trained matting model, not by
 * this repo. The real catalogue photographs are imported from their public
 * URLs on upgradebiolabs.com and run through Higgsfield's
 * `image_background_remover`; the result is downloaded and normalised here.
 * The pixels are the client's own product photography throughout - nothing is
 * regenerated, so the labels stay exactly as shot.
 *
 * WHY NOT THRESHOLD IT LOCALLY. A hand-rolled flood fill was tried first and
 * cannot work on this source. The products are white glass and white plastic
 * on a white backdrop: the capsule bottle's body measures 249-251 against a
 * 254-255 ground, and its silhouette changes by 1 unit per pixel, which is
 * *softer* than the cast shadow's 4. Every threshold either left the shadow
 * behind as a grey halo or hollowed the bottles out, and no edge- or
 * colour-based rule separates them because the ranges genuinely overlap.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2] ?? "/tmp/matte";
const OUT = path.join(process.cwd(), "public", "hero");

/** Normalised render height. Widths follow each product's aspect ratio. */
const HEIGHT = 620;

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`No such directory: ${SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".png"));
  if (!files.length) {
    console.error(`No PNGs in ${SRC}`);
    process.exit(1);
  }

  for (const file of files) {
    const src = path.join(SRC, file);
    const meta = await sharp(src).metadata();
    if (!meta.hasAlpha) {
      console.warn(`  skip ${file} (no alpha channel - not a matte)`);
      continue;
    }

    await sharp(src)
      // Trim on alpha so the product sits flush in its box and the CSS
      // positioning is predictable across products.
      .trim({ threshold: 1 })
      // The matting service returns ~600px, which trims to ~385px of product.
      // The foreground vials render near 300 CSS px, so that is soft on a 2x
      // display. These are flat studio renders with no fine texture, so a
      // modest lanczos upscale holds up where it would not on a photograph.
      .resize({ height: HEIGHT, kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, file));

    const out = await sharp(path.join(OUT, file)).metadata();
    console.log(`  ${file.replace(/\.png$/, "").padEnd(38)} ${out.width}x${out.height}`);
  }
  console.log("Done.");
}

main();
