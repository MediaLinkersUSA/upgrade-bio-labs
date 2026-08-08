/**
 * Normalises the harvested product renders into a consistent studio set.
 *
 * The upstream renders are already uniform in lighting and shadow, but they
 * vary in apparent object scale, sit on an off-palette grey vignette, and are
 * 600x568. This pass fixes exactly those three things and nothing else, so
 * every printed label stays pixel-true. No generative model is involved, so no
 * label can drift from its source.
 *
 * Separating product from backdrop:
 *   The backdrop is a smooth radial vignette (254 -> 232) with zero saturation.
 *   A flood fill cannot follow it, because a white capsule cap differs from the
 *   white backdrop by only a few levels and the fill walks straight through.
 *   Instead we fit a quadratic surface to the border ring, which is always
 *   backdrop, and extrapolate it behind the product. Residual on the ring is
 *   ~0.6 levels, so a +2.5 level departure is already a confident signal.
 *
 *   Everything that departs from that surface is the silhouette: product plus
 *   its cast shadow. The two are not separable by colour, since the product's
 *   own shaded side is as dark as the shadow. We therefore frame on the union.
 *   Every render came off one template under one light, so the shadow scales
 *   with the product and union framing stays consistent across the set.
 *
 * Run: npx tsx scripts/normalize-images.ts [--debug] [slug ...]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { products } from "../src/data/products";

const SRC = path.join(__dirname, "..", "source-images");
const OUT = path.join(__dirname, "..", "public", "products");

const SIZE = 1200;
const SMALL = 600;

/** The product's own base lands here, leaving room below for its shadow. */
const BASELINE = 0.9;
const MAX_W = 0.78;

/** Share of canvas height the product should occupy, by format.
 *  Sprays carry a tall thin actuator, so they need a larger target to read
 *  the same visual size as a vial body. */
const TARGET_H: Record<string, number> = {
  vial: 0.78,
  spray: 0.86,
  capsule: 0.72,
  supply: 0.78,
};

const RING = 30; // border band used to fit the backdrop
const T_LIGHT = 2.5; // levels brighter than backdrop -> product
const T_DARK = 3; // levels darker than backdrop -> product or its shadow
const T_SAT = 22; // saturation that always means product

/** Least-squares quadratic surface fitted to the border ring, per channel. */
function fitBackdrop(data: Buffer, w: number, h: number, ch: number) {
  const N = 6;
  const basis = (x: number, y: number) => {
    const nx = x / w - 0.5, ny = y / h - 0.5;
    return [1, nx, ny, nx * nx, ny * ny, nx * ny];
  };
  const planes: Float32Array[] = [];

  for (let c = 0; c < 3; c++) {
    const A: Float64Array[] = Array.from({ length: N }, () => new Float64Array(N));
    const bv = new Float64Array(N);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!(x < RING || y < RING || x >= w - RING || y >= h - RING)) continue;
        const f = basis(x, y);
        const v = data[(y * w + x) * ch + c];
        for (let i = 0; i < N; i++) {
          bv[i] += f[i] * v;
          for (let j = 0; j < N; j++) A[i][j] += f[i] * f[j];
        }
      }
    }
    const M = A.map((r, i) => Float64Array.from([...r, bv[i]]));
    for (let i = 0; i < N; i++) {
      let p = i;
      for (let k = i + 1; k < N; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
      [M[i], M[p]] = [M[p], M[i]];
      for (let k = i + 1; k < N; k++) {
        const f = M[k][i] / M[i][i];
        for (let j = i; j <= N; j++) M[k][j] -= f * M[i][j];
      }
    }
    const coef = new Float64Array(N);
    for (let i = N - 1; i >= 0; i--) {
      let s = M[i][N];
      for (let j = i + 1; j < N; j++) s -= M[i][j] * coef[j];
      coef[i] = s / M[i][i];
    }
    const plane = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const f = basis(x, y);
        let s = 0;
        for (let i = 0; i < N; i++) s += f[i] * coef[i];
        plane[y * w + x] = s;
      }
    planes.push(plane);
  }
  return planes;
}

/** Largest connected component, interior holes filled. */
function solidify(mask: Uint8Array, w: number, h: number): Uint8Array {
  const comp = new Int32Array(w * h).fill(-1);
  const stack: number[] = [];
  let best = -1, bestSize = 0, id = 0;

  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || comp[s] !== -1) continue;
    let size = 0;
    comp[s] = id;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % w, y = (i / w) | 0;
      const step = (j: number) => { if (mask[j] && comp[j] === -1) { comp[j] = id; stack.push(j); } };
      if (x > 0) step(i - 1);
      if (x < w - 1) step(i + 1);
      if (y > 0) step(i - w);
      if (y < h - 1) step(i + w);
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }

  const keep = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (comp[i] === best) keep[i] = 1;

  const outside = new Uint8Array(w * h);
  const seed = (i: number) => { if (!keep[i] && !outside[i]) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (y > 0) seed(i - w);
    if (y < h - 1) seed(i + w);
  }
  for (let i = 0; i < w * h; i++) if (!outside[i]) keep[i] = 1;
  return keep;
}

async function processOne(slug: string, format: string, debug: boolean) {
  const file = fs.readdirSync(SRC).find((f) => f.replace(/\.[^.]+$/, "") === slug);
  if (!file) return { slug, ok: false as const, reason: "no source" };

  const { data, info } = await sharp(path.join(SRC, file))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  const P = fitBackdrop(data, w, h, ch);

  // Silhouette, used only to frame the shot. Product plus its cast shadow.
  const sil = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const lum = (r + g + b) / 3;
    const plum = (P[0][i] + P[1][i] + P[2][i]) / 3;
    const d = lum - plum;
    if (d > T_LIGHT || sat > T_SAT || d < -T_DARK) sil[i] = 1;
  }

  const solid = solidify(sil, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < w * h; i++) {
    if (!solid[i]) continue;
    const x = i % w, y = (i / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0) return { slug, ok: false as const, reason: "no silhouette" };

  // Frame on the whole silhouette, product plus its cast shadow. Product and
  // shadow are not separable by colour here (the product's own shaded side is
  // as dark as the shadow), but every render came off one template with one
  // light, so the shadow scales with the product and framing on the union is
  // consistent across the set. Centring uses the product's own columns, taken
  // from the upper half, so the shadow's rightward offset does not skew it.
  let pMinX = w, pMaxX = -1;
  const upperEnd = minY + Math.round((maxY - minY) * 0.5);
  for (let y = minY; y <= upperEnd; y++)
    for (let x = 0; x < w; x++)
      if (solid[y * w + x]) { if (x < pMinX) pMinX = x; if (x > pMaxX) pMaxX = x; }
  if (pMaxX < 0) { pMinX = minX; pMaxX = maxX; }

  const box = {
    x: pMinX,
    y: minY,
    w: pMaxX - pMinX + 1,
    h: maxY - minY + 1,
    fullW: maxX - minX + 1,
  };

  // Cut out onto transparency, so a card can sit the product on white, paper,
  // or a tinted wash with no visible rectangle behind it.
  //
  // The original cast shadow is kept as black at alpha (1 - shade). Composited
  // over any background B that yields B * shade, which is exactly the multiply
  // the source render baked in, so the shadow stays correct on every surface.
  // Divide every pixel by the fitted backdrop. The vignette flattens to pure
  // white, the product keeps its exact tone, and the original cast shadow
  // survives as a natural soft grey. Nothing is masked, so no cap gets clipped
  // and no cutout edge can halo. Product cards render on white, which is
  // exactly the surface this is balanced for.
  const flat = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const o = i * ch, q = i * 3;
    for (let c = 0; c < 3; c++) {
      const plate = Math.max(1, P[c][i]);
      flat[q + c] = Math.round(Math.max(0, Math.min(1, data[o + c] / plate)) * 255);
    }
  }

  let scale = (SIZE * (TARGET_H[format] ?? 0.78)) / box.h;
  if (box.fullW * scale > SIZE * MAX_W) scale = (SIZE * MAX_W) / box.fullW;

  const winW = SIZE / scale, winH = SIZE / scale;
  const winLeft = Math.round(box.x + box.w / 2 - winW / 2);
  const winTop = Math.round(box.y + box.h - (BASELINE * SIZE) / scale);

  const M = Math.max(w, h) * 2;
  const padded = await sharp(flat, { raw: { width: w, height: h, channels: 3 } })
    .extend({ top: M, bottom: M, left: M, right: M, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png().toBuffer();

  const base = await sharp(padded)
    .extract({ left: winLeft + M, top: winTop + M, width: Math.round(winW), height: Math.round(winH) })
    .resize(SIZE, SIZE, { kernel: "lanczos3" })
    .png().toBuffer();

  fs.mkdirSync(OUT, { recursive: true });
  await sharp(base).webp({ quality: 86 }).toFile(path.join(OUT, `${slug}.webp`));
  await sharp(base)
    .resize(SMALL, SMALL)
    .webp({ quality: 86 })
    .toFile(path.join(OUT, `${slug}@600.webp`));

  if (debug) {
    const dbg = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      const x = i % w, y = (i / w) | 0;
      const onBox =
        (y === box.y || y === box.y + box.h - 1) && x >= box.x && x <= box.x + box.w ||
        (x === box.x || x === box.x + box.w - 1) && y >= box.y && y <= box.y + box.h;
      const c = onBox ? [255, 0, 0] : solid[i] ? [13, 148, 136] : [240, 240, 240];
      dbg[i * 3] = c[0]; dbg[i * 3 + 1] = c[1]; dbg[i * 3 + 2] = c[2];
    }
    fs.mkdirSync(path.join(__dirname, "debug"), { recursive: true });
    await sharp(dbg, { raw: { width: w, height: h, channels: 3 } })
      .png().toFile(path.join(__dirname, "debug", `${slug}.png`));
  }

  return { slug, ok: true as const, boxH: box.h, boxW: box.w };
}

async function main() {
  const argv = process.argv.slice(2);
  const debug = argv.includes("--debug");
  const only = argv.filter((a) => a !== "--debug");
  const list = only.length ? products.filter((p) => only.includes(p.slug)) : products;

  const results = [];
  for (const p of list) {
    try {
      results.push(await processOne(p.slug, p.format, debug));
    } catch (e) {
      results.push({ slug: p.slug, ok: false as const, reason: String(e) });
    }
  }
  const bad = results.filter((r) => !r.ok);
  const good = results.filter((r) => r.ok) as { slug: string; boxH: number; boxW: number }[];
  console.log(`normalised ${good.length}/${list.length}`);
  if (bad.length) console.log("FAILED:\n  " + bad.map((b: any) => `${b.slug}: ${b.reason}`).join("\n  "));
  const hs = good.map((g) => g.boxH).sort((a, b) => a - b);
  if (hs.length) console.log(`detected product heights (px, pre-scale): ${hs[0]} .. ${hs[hs.length - 1]}`);
}

main();
