/**
 * Bakes the browser-tab icon from the app mark.
 *
 * The tab icon was the app mark itself — a hard square, while the same mark in the sidebar is
 * drawn with rounded corners (40px wide, radius 10). This rounds the corners into the file at
 * the same 25% ratio, so the tab matches the app.
 *
 * It writes a separate file on purpose: `expo.icon` (the native app icon) must stay a full
 * square — iOS masks it itself and renders transparency as black.
 *
 *   node scripts/make-favicon.mjs
 *
 * Input : assets/images/icon.png      (1024×1024 RGBA)
 * Output: assets/images/favicon.png   (256×256 RGBA, rounded)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const SRC = 'assets/images/icon.png';
const OUT = 'assets/images/favicon.png';
const SIZE = 256;
/** Same ratio as the sidebar mark: radius 10 on a 40px square. */
const RADIUS_RATIO = 10 / 40;
/** Sub-samples per axis when deciding how much of a pixel the rounded shape covers. */
const AA = 4;

const src = PNG.sync.read(readFileSync(SRC));
if (src.width !== src.height) throw new Error(`${SRC} is ${src.width}×${src.height}, not square`);
if (src.width % SIZE !== 0) throw new Error(`${src.width} does not divide into ${SIZE}`);

const factor = src.width / SIZE;
const out = new PNG({ width: SIZE, height: SIZE });
const radius = SIZE * RADIUS_RATIO;

/** How much of this pixel is inside the rounded square, 0..1. */
function coverage(px, py) {
  let inside = 0;
  for (let sy = 0; sy < AA; sy++) {
    for (let sx = 0; sx < AA; sx++) {
      const x = px + (sx + 0.5) / AA;
      const y = py + (sy + 0.5) / AA;
      // Distance into the nearest corner's quarter-circle; outside the corner boxes it is inside.
      const dx = x < radius ? radius - x : x > SIZE - radius ? x - (SIZE - radius) : 0;
      const dy = y < radius ? radius - y : y > SIZE - radius ? y - (SIZE - radius) : 0;
      if (dx * dx + dy * dy <= radius * radius) inside++;
    }
  }
  return inside / (AA * AA);
}

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    // Box filter: 1024 → 256 is an exact 4×4 average, so no resampling artefacts.
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < factor; sy++) {
      for (let sx = 0; sx < factor; sx++) {
        const i = ((y * factor + sy) * src.width + (x * factor + sx)) << 2;
        r += src.data[i];
        g += src.data[i + 1];
        b += src.data[i + 2];
        a += src.data[i + 3];
      }
    }
    const n = factor * factor;
    const o = (y * SIZE + x) << 2;
    out.data[o] = Math.round(r / n);
    out.data[o + 1] = Math.round(g / n);
    out.data[o + 2] = Math.round(b / n);
    out.data[o + 3] = Math.round((a / n) * coverage(x, y));
  }
}

writeFileSync(OUT, PNG.sync.write(out));

const corner = out.data[3];
const centre = out.data[(((SIZE / 2) * SIZE + SIZE / 2) << 2) + 3];
console.log(`${OUT}: ${SIZE}×${SIZE}, radius ${radius}px`);
console.log(`  corner alpha ${corner} (expected 0), centre alpha ${centre} (expected 255)`);
