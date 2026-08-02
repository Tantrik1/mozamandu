/**
 * R2 Image Migration Script
 * ─────────────────────────
 * Re-compresses ALL existing images in the Cloudflare R2 bucket to
 * KB-sized WebP without visible quality loss.
 * 
 * What it does:
 * 1. Lists every object in the R2 bucket
 * 2. Downloads each image
 * 3. Re-encodes to WebP at 1200px max dimension, quality 90 (no visible loss)
 * 4. Uploads back to R2 with the same key (overwrites in-place)
 * 5. Updates the media_library size_bytes in Supabase
 * 
 * Usage:
 *   node scripts/migrate-r2-images.mjs
 *   node scripts/migrate-r2-images.mjs --dry-run       # preview without changes
 *   node scripts/migrate-r2-images.mjs --folder products  # only process one folder
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// ── Config (same as server/index.js) ────────────────────────────
const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://ab94ca7fe2714291ff48ec76111769e3.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '66ba4e715f5e7643bcf8dd8fa71786bc',
    secretAccessKey: 'c1d63b6161fb6e8fdc011098eadf75c4a33e0a7d4cd18b7e1bd548a8a6b5f313',
  },
});

const BUCKET = 'mozamandu';
const CDN_BASE = 'https://images.mozamandu.com';

const supabase = createClient(
  'https://huwhbxjlyucamitwwhyg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk'
);

// ── Compression settings per folder ───────────────────────────
const FOLDER_SETTINGS = {
  products: { maxWidth: 1200, quality: 90 },
  categories: { maxWidth: 1000, quality: 90 },
  subcategories: { maxWidth: 1000, quality: 90 },
  color_variants: { maxWidth: 1200, quality: 90 },
  product_additional_images: { maxWidth: 1200, quality: 90 },
  'blog-images': { maxWidth: 1400, quality: 90 },
  'notice-images': { maxWidth: 1200, quality: 90 },
  'payment-screenshots': { maxWidth: 1200, quality: 88 },
  payment_methods: { maxWidth: 800, quality: 88 },
  uploads: { maxWidth: 1200, quality: 90 },
};

const DEFAULT_SETTINGS = { maxWidth: 1200, quality: 90 };

// ── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FOLDER_FILTER = args.find((a, i) => args[i - 1] === '--folder') || null;

// ── Helpers ───────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFolder(key) {
  const parts = key.split('/');
  return parts.length > 1 ? parts[0] : 'uploads';
}

function isImageKey(key) {
  return /\.(webp|jpg|jpeg|png|gif|avif|bmp)$/i.test(key);
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ── Main ──────────────────────────────────────────────────────
async function migrate() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   R2 Image Migration — Re-compress to KB WebP   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  if (DRY_RUN) console.log('🔍 DRY RUN mode — no files will be modified\n');
  if (FOLDER_FILTER) console.log(`📁 Filtering to folder: ${FOLDER_FILTER}\n`);

  // 1. List all objects in R2
  console.log('📋 Listing all objects in R2 bucket...');
  let allObjects = [];
  let continuationToken = undefined;

  do {
    const listCmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
    });
    const listRes = await s3Client.send(listCmd);
    allObjects = allObjects.concat(listRes.Contents || []);
    continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`   Found ${allObjects.length} total objects in R2\n`);

  // 2. Filter to images only
  let imageObjects = allObjects.filter(obj => obj.Key && isImageKey(obj.Key));
  if (FOLDER_FILTER) {
    imageObjects = imageObjects.filter(obj => getFolder(obj.Key) === FOLDER_FILTER);
  }

  console.log(`🖼️  ${imageObjects.length} images to process\n`);

  // 3. Process each image
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalSavedBytes = 0;
  const results = [];

  for (const obj of imageObjects) {
    const key = obj.Key;
    const folder = getFolder(key);
    const settings = FOLDER_SETTINGS[folder] || DEFAULT_SETTINGS;
    const originalSize = obj.Size || 0;

    process.stdout.write(`[${processed + skipped + failed + 1}/${imageObjects.length}] ${key} (${formatBytes(originalSize)}) → `);

    // Skip if already small (under 500KB)
    if (originalSize < 500 * 1024) {
      console.log(`✅ already ${formatBytes(originalSize)} — skipped`);
      skipped++;
      continue;
    }

    try {
      // Download
      const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
      const getRes = await s3Client.send(getCmd);
      const originalBuffer = await streamToBuffer(getRes.Body);

      // Re-compress with sharp
      const compressedBuffer = await sharp(originalBuffer)
        .resize({
          width: settings.maxWidth,
          height: settings.maxWidth,
          fit: 'inside',        // Maintain aspect ratio, fit within box
          withoutEnlargement: true, // Never upscale smaller images
        })
        .webp({
          quality: settings.quality,
          effort: 6,            // Higher effort = better compression at same quality
          smartSubsample: true, // Better chroma subsampling
        })
        .toBuffer();

      const newSize = compressedBuffer.length;
      const savings = originalSize - newSize;
      const pctReduction = ((savings / originalSize) * 100).toFixed(1);

      // Skip if compression didn't help much (< 10% savings)
      if (savings < originalSize * 0.1) {
        console.log(`✅ ${formatBytes(newSize)} (only ${pctReduction}% smaller) — skipped`);
        skipped++;
        continue;
      }

      if (!DRY_RUN) {
        // Upload compressed version back to R2
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: compressedBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }));

        // Update media_library size in Supabase
        const publicUrl = `${CDN_BASE}/${key}`;
        await supabase
          .from('media_library')
          .update({ size_bytes: newSize })
          .eq('url', publicUrl);
      }

      console.log(`📦 ${formatBytes(newSize)} (↓${pctReduction}%)${DRY_RUN ? ' [DRY RUN]' : ''}`);
      totalSavedBytes += savings;
      processed++;

      results.push({
        key,
        originalSize: formatBytes(originalSize),
        newSize: formatBytes(newSize),
        saved: `↓${pctReduction}%`,
      });

    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      failed++;
    }
  }

  // 4. Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('  MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`  Total images:     ${imageObjects.length}`);
  console.log(`  Compressed:       ${processed}`);
  console.log(`  Already small:    ${skipped}`);
  console.log(`  Failed:           ${failed}`);
  console.log(`  Total saved:      ${formatBytes(totalSavedBytes)}`);
  if (DRY_RUN) console.log('\n  ⚠️  DRY RUN — no changes were made');
  console.log('═══════════════════════════════════════════\n');

  if (results.length > 0) {
    console.log('Compressed files:');
    console.table(results);
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
