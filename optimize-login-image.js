/**
 * Image Optimization Script for Login Background
 *
 * This script optimizes your 4MB login background image to:
 * - High-quality WebP (200-600KB)
 * - Tiny blurred placeholder (< 5KB)
 * - Optional JPEG fallback
 *
 * Usage:
 * 1. npm install sharp (if not already installed)
 * 2. Update the INPUT_IMAGE_PATH below to point to your 4MB image
 * 3. Run: node optimize-login-image.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ========== CONFIGURATION ==========
// UPDATE THIS PATH TO YOUR 4MB IMAGE
const INPUT_IMAGE_PATH = './public/Complex Co-169.jpg'; // <-- CHANGE THIS!

// Angular 19+ uses public folder instead of src/assets
const OUTPUT_DIR = path.join(__dirname, 'public', 'images');
const OUTPUT_FILES = {
  webp: 'login-bg.webp',
  jpeg: 'login-bg.jpg',
  placeholder: 'login-bg-placeholder.jpg'
};

// Quality settings
const WEBP_QUALITY = 82;  // Good balance of quality/size (75-85 recommended)
const JPEG_QUALITY = 85;  // Fallback for old browsers
const PLACEHOLDER_SIZE = { width: 40, height: 30 };
const PLACEHOLDER_BLUR = 10;

// ========== SCRIPT ==========

async function optimizeImages() {

  // Check if input image exists
  if (!fs.existsSync(INPUT_IMAGE_PATH)) {
    console.error(`❌ Error: Input image not found at: ${INPUT_IMAGE_PATH}`);
       process.exit(1);
  }

  // Get original file size
  const originalStats = fs.statSync(INPUT_IMAGE_PATH);
  const originalSizeMB = (originalStats.size / 1024 / 1024).toFixed(2);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    const image = sharp(INPUT_IMAGE_PATH);
    const metadata = await image.metadata();

    // 1. Create high-quality WebP
    await sharp(INPUT_IMAGE_PATH)
      .webp({
        quality: WEBP_QUALITY,
        effort: 6  // Max compression effort (0-6)
      })
      .toFile(path.join(OUTPUT_DIR, OUTPUT_FILES.webp));

    const webpStats = fs.statSync(path.join(OUTPUT_DIR, OUTPUT_FILES.webp));
    const webpSizeKB = (webpStats.size / 1024).toFixed(2);

    // 2. Create JPEG fallback
    await sharp(INPUT_IMAGE_PATH)
      .jpeg({
        quality: JPEG_QUALITY,
        progressive: true  // Progressive loading
      })
      .toFile(path.join(OUTPUT_DIR, OUTPUT_FILES.jpeg));

    const jpegStats = fs.statSync(path.join(OUTPUT_DIR, OUTPUT_FILES.jpeg));
    const jpegSizeKB = (jpegStats.size / 1024).toFixed(2);

    // 3. Create tiny blurred placeholder
    await sharp(INPUT_IMAGE_PATH)
      .resize(PLACEHOLDER_SIZE.width, PLACEHOLDER_SIZE.height, {
        fit: 'cover'
      })
      .blur(PLACEHOLDER_BLUR)
      .jpeg({ quality: 60 })
      .toFile(path.join(OUTPUT_DIR, OUTPUT_FILES.placeholder));
  } catch (error) {
    console.error('\n❌ Error during optimization:', error.message);
    process.exit(1);
  }
}

// Run the optimization
optimizeImages();
