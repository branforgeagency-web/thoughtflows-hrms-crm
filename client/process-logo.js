import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputImagePath = 'C:/Users/ramku/.gemini/antigravity/brain/e09b66e9-e43d-4c13-9912-5c249000704d/thoughtflows_logo_enhanced_1789107257783.jpg';
const outputDir = 'c:/Office/thoughtflows-hrms-crm/client/src/assets';
const publicDir = 'c:/Office/thoughtflows-hrms-crm/client/public';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function processLogo() {
  console.log('Loading enhanced image...');
  
  // First, trim the excess white margins
  const trimmed = await sharp(inputImagePath)
    .trim({ threshold: 10 })
    .toBuffer();

  const { width, height } = await sharp(trimmed).metadata();
  console.log(`Trimmed size: ${width}x${height}`);

  // Save standard high-res PNG (with clean background)
  await sharp(trimmed)
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'thoughtflows-logo-original.png'));

  // Create Transparent PNG version:
  // Convert pixels that are close to white (R,G,B > 240) to transparent
  const rawData = await sharp(trimmed)
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Version 1: Standard transparent PNG (keeping original colors: teal + dark navy)
  const transparentBuffer = Buffer.from(rawData);
  for (let i = 0; i < transparentBuffer.length; i += 4) {
    const r = transparentBuffer[i];
    const g = transparentBuffer[i + 1];
    const b = transparentBuffer[i + 2];
    
    // Check if pixel is close to white background
    const minVal = Math.min(r, g, b);
    if (minVal > 220) {
      // Fade alpha smoothly between 220 and 255
      const alpha = Math.max(0, 255 - ((minVal - 220) / 35) * 255);
      transparentBuffer[i + 3] = Math.min(transparentBuffer[i + 3], Math.round(alpha));
    }
  }

  await sharp(transparentBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(outputDir, 'thoughtflows-logo.png'));
  
  await sharp(transparentBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(publicDir, 'thoughtflows-logo.png'));

  // Version 2: Dark-theme optimized transparent PNG
  // On dark teal background, turn the dark slate "THOUGHT" and subtitle text to crisp white/ice-blue
  // while preserving the vibrant teal crescent, brain, birds, and "FLOWS"
  const darkThemeBuffer = Buffer.from(rawData);
  for (let i = 0; i < darkThemeBuffer.length; i += 4) {
    const r = darkThemeBuffer[i];
    const g = darkThemeBuffer[i + 1];
    const b = darkThemeBuffer[i + 2];
    const minVal = Math.min(r, g, b);

    if (minVal > 220) {
      const alpha = Math.max(0, 255 - ((minVal - 220) / 35) * 255);
      darkThemeBuffer[i + 3] = Math.min(darkThemeBuffer[i + 3], Math.round(alpha));
    } else {
      // If it is dark navy/slate (where r < 70, g < 90, b < 110, or low saturation)
      const isDarkNavy = (r < 75 && g < 90 && b < 110) || (Math.abs(r - g) < 20 && Math.abs(g - b) < 25 && g < 120);
      if (isDarkNavy) {
        // Transform to crisp white
        darkThemeBuffer[i] = 255;
        darkThemeBuffer[i + 1] = 255;
        darkThemeBuffer[i + 2] = 255;
      }
    }
  }

  await sharp(darkThemeBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(outputDir, 'thoughtflows-logo-light.png'));

  // Generate favicon
  // Crop emblem (left side) for high-impact 64x64 favicon
  const emblemWidth = Math.round(height * 1.05);
  await sharp(trimmed)
    .extract({ left: 0, top: 0, width: emblemWidth, height: height })
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('All logo assets successfully generated!');
}

processLogo().catch(console.error);
