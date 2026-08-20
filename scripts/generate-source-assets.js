import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Full Emblem SVG Elements (without root <svg>)
const emblemInner = `
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272A"/>
      <stop offset="100%" stop-color="#09090B"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF3C7"/>
      <stop offset="40%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>

  <!-- Sovereign Outer Hexagonal Shield Crest -->
  <path d="M 256 50 L 440 135 L 440 330 L 256 462 L 72 330 L 72 135 Z" fill="#18181B" stroke="url(#shieldGrad)" stroke-width="14" stroke-linejoin="round"/>

  <!-- Left Sovereign Wing -->
  <path d="M 256 180 L 120 120 L 70 200 L 160 240 L 90 290 L 175 320 L 125 380 L 256 420 Z" fill="url(#goldGrad)"/>

  <!-- Right Sovereign Wing -->
  <path d="M 256 180 L 392 120 L 442 200 L 352 240 L 422 290 L 337 320 L 387 380 L 256 420 Z" fill="url(#shieldGrad)"/>

  <!-- Sovereign Apex Eagle Head -->
  <polygon points="256,90 295,155 256,200 217,155" fill="#FFFFFF"/>
  <polygon points="256,200 282,240 256,260 230,240" fill="#F59E0B"/>

  <!-- Core Flame Crystal -->
  <polygon points="256,265 305,325 256,400 207,325" fill="#18181B" stroke="#FEF3C7" stroke-width="6"/>
  <circle cx="256" cy="335" r="16" fill="#F59E0B"/>
`;

// Full logo with background
const fullLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#18181B"/>
  <g transform="translate(102.4, 102.4) scale(1.6)">
    ${emblemInner}
  </g>
</svg>
`;

// Adaptive Icon Foreground (Transparent background, fits inside 66% safe circle)
// Scale 512x512 down to ~614x614 and center at (512, 512) -> offset = (1024 - 512*1.2)/2 = 204.8
const adaptiveForegroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(204.8, 204.8) scale(1.2)">
    ${emblemInner}
  </g>
</svg>
`;

// Adaptive Icon Background
const adaptiveBackgroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#18181B"/>
</svg>
`;

// Splash Screen (2732x2732) - Center Emblem + Dark Canvas
// Emblem size: 512 * 1.5 = 768px. Offset: (2732 - 768)/2 = 982
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732">
  <rect width="2732" height="2732" fill="#18181B"/>
  <g transform="translate(982, 982) scale(1.5)">
    ${emblemInner}
  </g>
</svg>
`;

async function generate() {
  console.log('Generating high-resolution source assets...');

  // 1. logo.png (1024x1024)
  await sharp(Buffer.from(fullLogoSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'logo.png'));
  console.log('✔ Generated assets/logo.png');

  // 2. logo-dark.png (1024x1024)
  await sharp(Buffer.from(fullLogoSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'logo-dark.png'));
  console.log('✔ Generated assets/logo-dark.png');

  // 3. icon-only.png (1024x1024)
  await sharp(Buffer.from(fullLogoSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-only.png'));
  console.log('✔ Generated assets/icon-only.png');

  // 4. icon-foreground.png (1024x1024)
  await sharp(Buffer.from(adaptiveForegroundSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));
  console.log('✔ Generated assets/icon-foreground.png');

  // 5. icon-background.png (1024x1024)
  await sharp(Buffer.from(adaptiveBackgroundSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-background.png'));
  console.log('✔ Generated assets/icon-background.png');

  // 6. splash.png (2732x2732)
  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('✔ Generated assets/splash.png');

  // 7. splash-dark.png (2732x2732)
  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .png()
    .toFile(path.join(assetsDir, 'splash-dark.png'));
  console.log('✔ Generated assets/splash-dark.png');

  console.log('All source assets created successfully in assets/ directory!');
}

generate().catch(err => {
  console.error('Failed to generate source assets:', err);
  process.exit(1);
});
