/**
 * One-shot icon generator for the ColoredAFFiNE rebrand on mobile.
 *
 * Reads packages/frontend/apps/electron/resources/icons/icon.png (the
 * 512x512 master logo committed by the desktop rebrand) and writes the
 * Android mipmap PNGs + adaptive-icon foreground + iOS AppIcon set.
 *
 * Why a custom script: sharp / canvas / ImageMagick are not available
 * in this checkout, but pngjs is hoisted as a transitive dep. We do a
 * straightforward bilinear downscale — quality is fine for app icons
 * (we never upscale, the source is 512x512 and the largest target is
 * 1024 which we letterbox-pad with the source upscaled, but iOS only
 * needs ≤1024 anyway so we just emit the source for that one).
 *
 * Run with: node scripts/generate-mobile-icons.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const SOURCE = join(
  repoRoot,
  'packages/frontend/apps/electron/resources/icons/icon.png'
);

function readPng(path) {
  const buf = readFileSync(path);
  return PNG.sync.read(buf);
}

function writePng(path, png) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}

/**
 * Bilinear resize. PNG is RGBA8 with `data` as a flat Uint8Array.
 */
function resize(src, targetW, targetH) {
  const out = new PNG({ width: targetW, height: targetH });
  const sx = src.width / targetW;
  const sy = src.height / targetH;
  for (let y = 0; y < targetH; y++) {
    const fy = (y + 0.5) * sy - 0.5;
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(src.height - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < targetW; x++) {
      const fx = (x + 0.5) * sx - 0.5;
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(src.width - 1, x0 + 1);
      const wx = fx - x0;
      const i00 = (y0 * src.width + x0) * 4;
      const i01 = (y0 * src.width + x1) * 4;
      const i10 = (y1 * src.width + x0) * 4;
      const i11 = (y1 * src.width + x1) * 4;
      const oi = (y * targetW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = src.data[i00 + c] * (1 - wx) + src.data[i01 + c] * wx;
        const b = src.data[i10 + c] * (1 - wx) + src.data[i11 + c] * wx;
        out.data[oi + c] = Math.round(a * (1 - wy) + b * wy);
      }
    }
  }
  return out;
}

/**
 * Place a square source image inside a larger transparent canvas,
 * scaled to occupy `inner` pixels and centered. Used for the Android
 * adaptive-icon foreground, which needs ~108dp canvas with the actual
 * artwork inside the centered ~72dp safe zone.
 */
function padCentered(src, canvas, inner) {
  const scaled = resize(src, inner, inner);
  const out = new PNG({ width: canvas, height: canvas });
  // PNG initialised to all zeros = fully transparent.
  const offset = Math.floor((canvas - inner) / 2);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const si = (y * inner + x) * 4;
      const di = ((y + offset) * canvas + (x + offset)) * 4;
      out.data[di] = scaled.data[si];
      out.data[di + 1] = scaled.data[si + 1];
      out.data[di + 2] = scaled.data[si + 2];
      out.data[di + 3] = scaled.data[si + 3];
    }
  }
  return out;
}

const src = readPng(SOURCE);
console.log(`source: ${src.width}x${src.height}`);

// ─── Android ──────────────────────────────────────────────────────
const androidRes = join(
  repoRoot,
  'packages/frontend/apps/android/App/app/src/main/res'
);
const ANDROID_DENSITIES = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];
for (const [folder, size] of ANDROID_DENSITIES) {
  const scaled = resize(src, size, size);
  const dir = join(androidRes, folder);
  // Wipe any pre-existing legacy launcher files (webp from upstream)
  // so Gradle doesn't see two resources with the same base name.
  for (const ext of ['webp', 'png']) {
    for (const base of ['ic_launcher', 'ic_launcher_round']) {
      const p = join(dir, `${base}.${ext}`);
      if (existsSync(p)) rmSync(p);
    }
  }
  writePng(join(dir, 'ic_launcher.png'), scaled);
  writePng(join(dir, 'ic_launcher_round.png'), scaled);
  console.log(`wrote ${folder}/ic_launcher.png (${size}px)`);
}

// Adaptive-icon foreground bitmap. Standard adaptive icons use a
// 108dp canvas with the artwork inside the centered 72dp safe zone:
// 72/108 = 2/3. We rasterise that at xxxhdpi density (1dp = 4px →
// 432x432 canvas, 288x288 inner) so the icon stays crisp on high-DPI
// devices.
//
// We deliberately put the bitmap under a *different* base name from
// the XML wrapper (`ic_launcher_image` vs `ic_launcher_foreground`)
// because Android refuses to have two resources with the same name in
// the same configuration — even when one is a drawable wrapping the
// other.
const fg = padCentered(src, 432, 288);
// Clear any leftover PNG from a previous run that used the old name.
const legacyFgPng = join(androidRes, 'drawable/ic_launcher_foreground.png');
if (existsSync(legacyFgPng)) rmSync(legacyFgPng);
writePng(join(androidRes, 'drawable/ic_launcher_image.png'), fg);
console.log('wrote drawable/ic_launcher_image.png (432px, 288 inner)');

// Replace the vector foreground/background XMLs with a bitmap
// foreground + a solid background colour. The adaptive-icon XML
// itself stays the same (it just references @drawable/ic_launcher_*).
writeFileSync(
  join(androidRes, 'drawable/ic_launcher_foreground.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@drawable/ic_launcher_image" />
`
);
writeFileSync(
  join(androidRes, 'drawable/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
</shape>
`
);
console.log('rewrote drawable/ic_launcher_{foreground,background}.xml');

// ─── iOS ──────────────────────────────────────────────────────────
const iosIconset = join(
  repoRoot,
  'packages/frontend/apps/ios/App/App/Assets.xcassets/AppIcon.appiconset'
);
// Modern Xcode AppIcon set: a single 1024x1024 master per appearance.
// We don't have separate dark/tinted artwork, so we ship the same icon
// for all three appearance slots.
const ios1024 = resize(src, 1024, 1024);
writePng(join(iosIconset, 'light.png'), ios1024);
writePng(join(iosIconset, 'dark@1024.png'), ios1024);
writePng(join(iosIconset, 'dark@trans.png'), ios1024);
console.log('wrote ios light/dark/tinted 1024px');

console.log('done');
