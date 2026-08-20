import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const androidResDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

const sourceLogo = path.join(assetsDir, 'logo.png');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function generate() {
  if (!fs.existsSync(sourceLogo)) {
    console.error(`❌ Source logo not found at ${sourceLogo}`);
    console.error('Please save the new logo image to that path before running this script.');
    process.exit(1);
  }

  console.log('🚀 Generating master Sovereign Eagle assets from new PNG source...');

  // 1. logo.png (already exists as source, but let's ensure other master assets match)
  const masterBuffer = await fs.promises.readFile(sourceLogo);

  // 2. logo-dark.png
  await sharp(masterBuffer)
    .resize(1024, 1024)
    .toFile(path.join(assetsDir, 'logo-dark.png'));

  // 3. icon-only.png
  await sharp(masterBuffer)
    .resize(1024, 1024)
    .toFile(path.join(assetsDir, 'icon-only.png'));

  // 4. icon-foreground.png (Centered with safe margin for adaptive icons)
  // Adaptive icons need the "meat" of the icon in the center 66% to avoid being clipped.
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: await sharp(masterBuffer).resize(720, 720).toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));

  // 5. icon-background.png (Solid brand color extracted from logo background)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: '#18181B' // Sovereign Eagle zinc background
    }
  })
    .png()
    .toFile(path.join(assetsDir, 'icon-background.png'));

  // 6. splash.png & splash-dark.png (2732x2732 master)
  const splashMaster = await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: '#18181B'
    }
  })
    .composite([{
      input: await sharp(masterBuffer).resize(1200, 1200).toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toBuffer();

  await fs.promises.writeFile(path.join(assetsDir, 'splash.png'), splashMaster);
  await fs.promises.writeFile(path.join(assetsDir, 'splash-dark.png'), splashMaster);

  console.log('\n📱 Generating native Android multi-density drawables & mipmaps...');

  // Launcher Icons
  const mipmapDensities = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  for (const density of mipmapDensities) {
    const targetDir = path.join(androidResDir, density.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png (Legacy)
    await sharp(masterBuffer)
      .resize(density.size, density.size)
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    await sharp(masterBuffer)
      .resize(density.size, density.size)
      .composite([{
        input: Buffer.from(`<svg><circle cx="${density.size/2}" cy="${density.size/2}" r="${density.size/2}" /></svg>`),
        blend: 'dest-in'
      }])
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // Adaptive Foreground
    await sharp(await fs.promises.readFile(path.join(assetsDir, 'icon-foreground.png')))
      .resize(density.fgSize, density.fgSize)
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    // Adaptive Background
    await sharp(await fs.promises.readFile(path.join(assetsDir, 'icon-background.png')))
      .resize(density.fgSize, density.fgSize)
      .toFile(path.join(targetDir, 'ic_launcher_background.png'));
  }

  // Splash Screens (Portrait & Landscape, Light & Dark/Night)
  const splashDensities = [
    { dirBase: 'drawable-port', w: 320, h: 480, scale: 0.5 },
    { dirBase: 'drawable-port-hdpi', w: 480, h: 800, scale: 0.5 },
    { dirBase: 'drawable-port-mdpi', w: 320, h: 480, scale: 0.5 },
    { dirBase: 'drawable-port-xhdpi', w: 720, h: 1280, scale: 0.5 },
    { dirBase: 'drawable-port-xxhdpi', w: 960, h: 1600, scale: 0.5 },
    { dirBase: 'drawable-port-xxxhdpi', w: 1280, h: 1920, scale: 0.5 },
    { dirBase: 'drawable-port-night-hdpi', w: 480, h: 800, scale: 0.5 },
    { dirBase: 'drawable-port-night-mdpi', w: 320, h: 480, scale: 0.5 },
    { dirBase: 'drawable-port-night-xhdpi', w: 720, h: 1280, scale: 0.5 },
    { dirBase: 'drawable-port-night-xxhdpi', w: 960, h: 1600, scale: 0.5 },
    { dirBase: 'drawable-port-night-xxxhdpi', w: 1280, h: 1920, scale: 0.5 },
    { dirBase: 'drawable-land-hdpi', w: 800, h: 480, scale: 0.4 },
    { dirBase: 'drawable-land-mdpi', w: 480, h: 320, scale: 0.4 },
    { dirBase: 'drawable-land-xhdpi', w: 1280, h: 720, scale: 0.4 },
    { dirBase: 'drawable-land-xxhdpi', w: 1600, h: 960, scale: 0.4 },
    { dirBase: 'drawable-land-xxxhdpi', w: 1920, h: 1280, scale: 0.4 },
    { dirBase: 'drawable-land-night-hdpi', w: 800, h: 480, scale: 0.4 },
    { dirBase: 'drawable-land-night-mdpi', w: 480, h: 320, scale: 0.4 },
    { dirBase: 'drawable-land-night-xhdpi', w: 1280, h: 720, scale: 0.4 },
    { dirBase: 'drawable-land-night-xxhdpi', w: 1600, h: 960, scale: 0.4 },
    { dirBase: 'drawable-land-night-xxxhdpi', w: 1920, h: 1280, scale: 0.4 }
  ];

  for (const s of splashDensities) {
    const targetDir = path.join(androidResDir, s.dirBase);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const logoSize = Math.round(Math.min(s.w, s.h) * s.scale);
    await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: '#18181B'
      }
    })
      .composite([{
        input: await sharp(masterBuffer).resize(logoSize, logoSize).toBuffer(),
        gravity: 'center'
      }])
      .png()
      .toFile(path.join(targetDir, 'splash.png'));
  }

  // Android 12+ Splash Icon (Square 512x512 1:1 ratio, centered)
  const drawableDir = path.join(androidResDir, 'drawable');
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });

  const splashIconBuffer = await sharp(masterBuffer)
    .resize(512, 512)
    .png()
    .toBuffer();

  await fs.promises.writeFile(path.join(drawableDir, 'splash_icon.png'), splashIconBuffer);
  await fs.promises.writeFile(path.join(drawableDir, 'splash.png'), splashIconBuffer);

  console.log('\n🎉 ALL assets (including splash_icon and dark/night drawables) updated with the new Sovereign Eagle logo!');
}

generate().catch(console.error);
