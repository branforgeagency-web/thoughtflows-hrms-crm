import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputImagePath = 'C:/Users/ramku/.gemini/antigravity/brain/e09b66e9-e43d-4c13-9912-5c249000704d/thoughtflows_logo_enhanced_1789107257783.jpg';
const outputDir = 'c:/Office/thoughtflows-hrms-crm/client/src/assets';
const publicDir = 'c:/Office/thoughtflows-hrms-crm/client/public';

async function generatePerfectLogos() {
  console.log('Generating high-fidelity logos...');

  // Trim margins
  const trimmedBuffer = await sharp(inputImagePath)
    .trim({ threshold: 12 })
    .toBuffer();

  const { width, height } = await sharp(trimmedBuffer).metadata();
  console.log(`Dimensions: ${width}x${height}`);

  // 1. High-resolution Original (clean white backdrop)
  await sharp(trimmedBuffer)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, 'thoughtflows-logo-original.png'));

  // 2. Pure Transparent Logo (original brand colors: navy + cyan)
  // Cleanly convert white background to transparent using color distance from white
  const raw = await sharp(trimmedBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const transparentNavyTeal = Buffer.from(raw);
  for (let i = 0; i < transparentNavyTeal.length; i += 4) {
    const r = transparentNavyTeal[i];
    const g = transparentNavyTeal[i + 1];
    const b = transparentNavyTeal[i + 2];

    // Distance from pure white (255, 255, 255)
    const diffR = 255 - r;
    const diffG = 255 - g;
    const diffB = 255 - b;
    const maxDiff = Math.max(diffR, diffG, diffB);

    if (maxDiff < 8) {
      transparentNavyTeal[i + 3] = 0; // completely transparent
    } else if (maxDiff < 36) {
      // Smooth alpha ramp
      transparentNavyTeal[i + 3] = Math.round((maxDiff / 36) * 255);
    }
  }

  await sharp(transparentNavyTeal, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(outputDir, 'thoughtflows-logo.png'));
  await sharp(transparentNavyTeal, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(publicDir, 'thoughtflows-logo.png'));

  // 3. Glowing White/Teal Logo (for dark or colored backgrounds)
  // Here, navy/dark-grey text & brain outline become crisp white (#ffffff)
  // while preserving the vibrant teal & cyan tones of the crescent and FLOWS!
  const transparentWhiteTeal = Buffer.from(raw);
  for (let i = 0; i < transparentWhiteTeal.length; i += 4) {
    const r = transparentWhiteTeal[i];
    const g = transparentWhiteTeal[i + 1];
    const b = transparentWhiteTeal[i + 2];

    const diffR = 255 - r;
    const diffG = 255 - g;
    const diffB = 255 - b;
    const maxDiff = Math.max(diffR, diffG, diffB);

    if (maxDiff < 8) {
      transparentWhiteTeal[i + 3] = 0;
    } else {
      const alpha = maxDiff < 36 ? (maxDiff / 36) : 1;
      transparentWhiteTeal[i + 3] = Math.round(alpha * 255);

      // Distinguish teal from navy/black:
      // In teal pixels, green and blue are significantly higher than red (e.g. g > r + 30, b > r + 20)
      const isTeal = (g > r + 25) || (b > r + 25);

      if (!isTeal) {
        // It's navy/charcoal text or brain outline: convert to crisp bright white
        transparentWhiteTeal[i] = 255;
        transparentWhiteTeal[i + 1] = 255;
        transparentWhiteTeal[i + 2] = 255;
      } else {
        // Boost teal saturation and brightness slightly so it pops on dark/colored backdrops
        transparentWhiteTeal[i] = Math.max(0, r - 10);
        transparentWhiteTeal[i + 1] = Math.min(255, g + 25);
        transparentWhiteTeal[i + 2] = Math.min(255, b + 25);
      }
    }
  }

  await sharp(transparentWhiteTeal, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(outputDir, 'thoughtflows-logo-white.png'));
  await sharp(transparentWhiteTeal, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(publicDir, 'thoughtflows-logo-white.png'));

  // 4. White-glass Pill Badge Version:
  // Render the original full-color logo inside an ultra-crisp rounded white capsule
  // This guarantees 100% clarity and brand compliance anywhere!
  const padX = 36;
  const padY = 20;
  const cardW = width + padX * 2;
  const cardH = height + padY * 2;
  const radius = Math.round(cardH / 2);

  const roundedRectSvg = Buffer.from(`
    <svg width="${cardW}" height="${cardH}">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="${radius}" ry="${radius}" fill="white" />
    </svg>
  `);

  await sharp(roundedRectSvg)
    .composite([
      {
        input: trimmedBuffer,
        left: padX,
        top: padY
      }
    ])
    .png()
    .toFile(path.join(outputDir, 'thoughtflows-logo-pill.png'));

  await sharp(roundedRectSvg)
    .composite([
      {
        input: trimmedBuffer,
        left: padX,
        top: padY
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'thoughtflows-logo-pill.png'));

  console.log('Successfully generated all logo variations!');
}

generatePerfectLogos().catch(console.error);
