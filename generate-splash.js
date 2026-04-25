/**
 * PropAfric — iOS Splash Screen Generator
 * Usage:
 *   1. Place the logo at  src/assets/logo-512.png  (already done for icons)
 *   2. Run:  npm run generate-splash
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const LOGO_PATH   = path.join(__dirname, 'src', 'assets', 'logo-512.png');
const SPLASH_DIR  = path.join(__dirname, 'src', 'assets', 'splash');

// All iOS splash sizes [ width, height ]
const SPLASH_SIZES = [
  [640,  1136],  // iPhone SE
  [750,  1334],  // iPhone 8
  [1242, 2208],  // iPhone 8 Plus
  [1125, 2436],  // iPhone X/XS
  [828,  1792],  // iPhone XR/11
  [1242, 2688],  // iPhone 11 Pro Max
  [1170, 2532],  // iPhone 12/13/14
  [1284, 2778],  // iPhone 12/13/14 Plus
  [1179, 2556],  // iPhone 14 Pro
  [1290, 2796],  // iPhone 14 Pro Max
  [1536, 2048],  // iPad Mini/Air
  [1668, 2388],  // iPad Pro 11"
  [2048, 2732],  // iPad Pro 12.9"
];

// Brand colors
const BG_COLOR  = { r: 45,  g: 106, b: 79,  alpha: 1 }; // #2D6A4F vert
const LOGO_SIZE_RATIO = 0.30; // logo = 30% of the shortest dimension

if (!fs.existsSync(LOGO_PATH)) {
  console.error('❌  Logo introuvable : src/assets/logo-512.png');
  process.exit(1);
}

fs.mkdirSync(SPLASH_DIR, { recursive: true });

async function makeSplash(w, h) {
  const logoSize = Math.round(Math.min(w, h) * LOGO_SIZE_RATIO);

  // 1. Resize logo with transparent bg
  const logoBuffer = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 2. Create green background and composite logo centered
  const x = Math.round((w - logoSize) / 2);
  const y = Math.round((h - logoSize) / 2) - Math.round(h * 0.05); // légèrement au-dessus du centre

  const outPath = path.join(SPLASH_DIR, `splash-${w}x${h}.png`);

  await sharp({
    create: { width: w, height: h, channels: 4, background: BG_COLOR }
  })
    .composite([{ input: logoBuffer, left: x, top: y }])
    .png()
    .toFile(outPath);

  console.log(`  ✓  splash-${w}x${h}.png`);
}

(async () => {
  console.log('\nPropAfric — génération des splash screens iOS\n');
  for (const [w, h] of SPLASH_SIZES) {
    await makeSplash(w, h);
  }
  console.log('\n✅  Splash screens générés dans src/assets/splash/\n');
})();
