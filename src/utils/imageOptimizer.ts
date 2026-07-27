import imageCompression from 'browser-image-compression';

export interface OptimizedImageResult {
  file: File;
  preview: string;
}

export interface ImageOptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  skipOptimization?: boolean; // Skip optimization entirely, just validate
}

// Target file size: 800KB - 1MB for optimal quality/size balance
const TARGET_SIZE_MB = 1.0;

// Default options - high quality WebP conversion
const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxSizeMB: TARGET_SIZE_MB,
  maxWidthOrHeight: 2048, // Keep high resolution
  quality: 0.92, // High quality
};

// Preset for product images - highest quality
export const PRODUCT_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 1.2, // Allow slightly larger for product images
  maxWidthOrHeight: 2048,
  quality: 0.95, // Very high quality for products
};

// Preset for banners/hero images - high quality, larger size allowed
export const HIGH_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 2560,
  quality: 0.93,
};

// Preset for thumbnails/category images - balanced
export const THUMBNAIL_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1200,
  quality: 0.90,
};

const MAX_FILE_SIZE_MB = 15; // Allow uploads up to 15MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validates that a file doesn't exceed the maximum allowed size
 */
export function validateFileSize(file: File): { valid: boolean; message?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
    };
  }
  return { valid: true };
}

/**
 * Checks if a file is an Apple HEIC/HEIF image format from iPhone
 */
export function isHeicFile(file: File): boolean {
  const mimeType = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return (
    mimeType.includes('heic') ||
    mimeType.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

/**
 * Automatically converts iPhone HEIC/HEIF photos to JPEG in-browser
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  console.log(`HEIC/HEIF image detected (${file.name}). Converting iPhone photo...`);
  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default;

    const convertedResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    });

    const resultBlob = Array.isArray(convertedResult) ? convertedResult[0] : convertedResult;
    const baseName = file.name.replace(/\.(heic|heif)$/i, '');
    return new File([resultBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting HEIC image:', error);
    throw new Error('Failed to convert iPhone HEIC photo. Please ensure file is a valid image.');
  }
}

/**
 * Checks if a file is an image (including iPhone HEIC format)
 */
export function isImageFile(file: File): boolean {
  if (isHeicFile(file)) return true;
  return file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|svg)$/i.test(file.name);
}

/**
 * Converts an image file to high-quality WebP format
 * Supports iPhone HEIC/HEIF, JPG, PNG, WebP
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // 1. Convert iPhone HEIC/HEIF files first if needed
  const targetFile = await convertHeicIfNeeded(file);

  // Validate the original file size
  const validation = validateFileSize(targetFile);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Skip optimization if requested
  if (opts.skipOptimization) {
    const preview = await generatePreview(targetFile);
    return { file: targetFile, preview };
  }

  try {
    const originalSizeKB = targetFile.size / 1024;
    const targetSizeKB = (opts.maxSizeMB || TARGET_SIZE_MB) * 1024;
    
    console.log(`Processing ${targetFile.name}: ${(targetFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    // If file is already small and WebP, minimal processing
    if (targetFile.type === 'image/webp' && originalSizeKB <= targetSizeKB * 1.2) {
      console.log(`File already optimized WebP, keeping as-is`);
      const preview = await generatePreview(targetFile);
      return { file: targetFile, preview };
    }

    // Convert to high-quality WebP
    const compressedFile = await imageCompression(targetFile, {
      maxSizeMB: opts.maxSizeMB!,
      maxWidthOrHeight: opts.maxWidthOrHeight!,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: opts.quality!,
      alwaysKeepResolution: originalSizeKB < 500, // Keep resolution for small images
      preserveExif: false, // Remove metadata to save space
    });

    const originalName = targetFile.name.replace(/\.[^/.]+$/, '');
    const resultFile = new File([compressedFile], `${originalName}.webp`, {
      type: 'image/webp',
    });

    // Generate preview URL
    const preview = await generatePreview(resultFile);

    const originalSizeMB = (targetFile.size / 1024 / 1024).toFixed(2);
    const newSizeKB = (resultFile.size / 1024).toFixed(0);
    const newSizeMB = (resultFile.size / 1024 / 1024).toFixed(2);
    
    console.log(
      `✓ Optimized: ${file.name} (${originalSizeMB}MB) → ${resultFile.name} (${newSizeKB}KB / ${newSizeMB}MB)`
    );

    return {
      file: resultFile,
      preview,
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image. Please try a different image.');
  }
}

/**
 * Generates a preview data URL for an image file
 */
export function generatePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Gets human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validates and optimizes an image file for upload
 * Returns the optimized file ready for Supabase storage
 */
export async function prepareImageForUpload(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<{ file: File; preview: string }> {
  // Validate it's an image
  if (!isImageFile(file)) {
    throw new Error('Please select a valid image file (JPG, PNG, GIF, WebP, HEIC)');
  }

  // Validate file size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.message);
  }

  // Optimize the image (converts HEIC to JPEG then WebP with high quality)
  return optimizeImage(file, options);
}
