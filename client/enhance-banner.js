import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const generatedImagePath = 'C:/Users/ramku/.gemini/antigravity/brain/9bd02def-4f1c-419f-bf9a-11d92abb22e1/.user_uploaded/media_1789112049762.png';
const publicDir = 'c:/Office/thoughtflows-hrms-crm/client/public';
const assetsDir = 'c:/Office/thoughtflows-hrms-crm/client/src/assets';

async function processEnhancedBanner() {
  console.log('Inspecting generated image...');
  const meta = await sharp(generatedImagePath).metadata();
  console.log(`Initial generated dimensions: ${meta.width}x${meta.height}`);

  // Target 4K dimensions (3840px wide or 4096px wide DCI)
  // Let's create an ultra-crisp 4K version (3840 x 2160 standard 16:9 4K or proportional to aspect ratio)
  const targetWidth4K = 3840;
  const targetHeight4K = Math.round(meta.height * (targetWidth4K / meta.width));
  console.log(`Rendering 4K resolution: ${targetWidth4K}x${targetHeight4K}...`);

  // Process with lanczos3 resampling + subtle high-pass edge sharpening for razor clarity
  const processed4K = await sharp(generatedImagePath)
    .resize(targetWidth4K, targetHeight4K, {
      kernel: sharp.kernel.lanczos3,
      fastShrinkOnLoad: false
    })
    .sharpen({
      sigma: 1.2,
      m1: 1.0,
      m2: 2.0,
      x1: 2,
      y2: 10,
      y3: 20
    })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  const publicDest = path.join(publicDir, 'hero-banner-bg.png');
  const assetsDest = path.join(assetsDir, 'hero-banner-bg.png');

  fs.writeFileSync(publicDest, processed4K);
  fs.writeFileSync(assetsDest, processed4K);

  const stats = fs.statSync(publicDest);
  console.log(`Saved 4K enhanced hero-banner-bg.png successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

processEnhancedBanner().catch(err => {
  console.error('Error processing banner:', err);
  process.exit(1);
});
