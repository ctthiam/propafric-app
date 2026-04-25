/**
 * PropAfric — PWA Icon Generator
 * Usage:
 *   1. Place the logo at  src/assets/logo-512.png
 *   2. Run:  npm run generate-icons
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const INPUT  = path.join(__dirname, 'src', 'assets', 'logo-512.png');
const OUTPUT = path.join(__dirname, 'src', 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SAFE_RATIO = 0.72;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

if (!fs.existsSync(INPUT)) {
  console.error('❌  Logo introuvable : src/assets/logo-512.png');
  process.exit(1);
}
fs.mkdirSync(OUTPUT, { recursive: true });

// ── Auto-detect bounding box of actual logo content ──────────────────────────
async function findContentBox() {
  const { data, info } = await sharp(INPUT).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  let minX = W, maxX = 0, minY = H, maxY = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      // Non-background pixel = at least one channel clearly different from white
      if (data[i] < 220 || data[i+1] < 220 || data[i+2] < 220) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const pad = Math.round(Math.min(maxX - minX, maxY - minY) * 0.07);
  return {
    left:   Math.max(0, minX - pad),
    top:    Math.max(0, minY - pad),
    width:  Math.min(W - Math.max(0, minX - pad), maxX - minX + 2 * pad + 1),
    height: Math.min(H - Math.max(0, minY - pad), maxY - minY + 2 * pad + 1),
  };
}

// ── Build PNG-encoded ICO (superior quality vs BMP-ICO) ──────────────────────
function buildPngIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);       // type = ICO
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;

  for (let i = 0; i < count; i++) {
    const e = Buffer.alloc(16);
    const s = sizes[i];
    e.writeUInt8(s >= 256 ? 0 : s, 0);  // width  (0 means 256)
    e.writeUInt8(s >= 256 ? 0 : s, 1);  // height
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngBuffers[i].length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += pngBuffers[i].length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function makeIcon(box, size, outName, bg = WHITE) {
  await sharp(INPUT)
    .extract(box)
    .resize(size, size, { fit: 'contain', background: bg })
    .flatten({ background: bg })
    .png()
    .toFile(path.join(OUTPUT, outName));
  console.log(`  ✓  ${outName}`);
}

async function makeMaskable(box, size, outName) {
  const contentSize = Math.round(size * MASKABLE_SAFE_RATIO);
  const pad = Math.floor((size - contentSize) / 2);
  await sharp(INPUT)
    .extract(box)
    .resize(contentSize, contentSize, { fit: 'contain', background: WHITE })
    .flatten({ background: WHITE })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: WHITE })
    .resize(size, size)
    .png()
    .toFile(path.join(OUTPUT, outName));
  console.log(`  ✓  ${outName}`);
}

async function makePngBuffer(box, size, bg = WHITE) {
  return sharp(INPUT)
    .extract(box)
    .resize(size, size, { fit: 'contain', background: bg })
    .flatten({ background: bg })
    .png()
    .toBuffer();
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\nPropAfric — génération des icônes PWA\n');

  // 1. Auto-detect logo bounding box
  console.log('  Détection des marges du logo...');
  const box = await findContentBox();
  console.log(`  Contenu utile : ${box.width}×${box.height} à (${box.left},${box.top})\n`);

  // 2. Standard manifest icons
  for (const size of SIZES) {
    await makeIcon(box, size, `icon-${size}x${size}.png`);
  }

  // 3. Maskable icons (Android adaptive)
  await makeMaskable(box, 192, 'icon-192x192-maskable.png');
  await makeMaskable(box, 512, 'icon-512x512-maskable.png');

  // 4. Apple touch icon (180×180)
  await makeIcon(box, 180, 'apple-touch-icon.png');

  // 5. PNG favicons
  await makeIcon(box, 64, 'favicon-64x64.png');
  await makeIcon(box, 32, 'favicon-32x32.png');
  await makeIcon(box, 16, 'favicon-16x16.png');

  // 6. favicon.ico — PNG-encoded (16 + 32 + 48 + 64), meilleure qualité
  console.log('\n  Génération favicon.ico (PNG-encoded)...');
  const [b16, b32, b48, b64] = await Promise.all([
    makePngBuffer(box, 16),
    makePngBuffer(box, 32),
    makePngBuffer(box, 48),
    makePngBuffer(box, 64),
  ]);
  const icoBuffer = buildPngIco([b16, b32, b48, b64], [16, 32, 48, 64]);
  fs.writeFileSync(path.join(__dirname, 'src', 'favicon.ico'), icoBuffer);
  console.log(`  ✓  favicon.ico (PNG-encoded, 16+32+48+64px) → src/favicon.ico`);

  console.log('\n✅  Toutes les icônes générées.\n');
})();
