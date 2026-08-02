export interface OptimizedImageResult {
  file: File;
  preview: string;
}

export interface ImageOptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  skipOptimization?: boolean;
}

// Preset configurations (used for metadata reference)
export const PRODUCT_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 15.0,
  maxWidthOrHeight: 1200,
  quality: 0.90,
};

export const HIGH_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 15.0,
  maxWidthOrHeight: 1920,
  quality: 0.92,
};

export const THUMBNAIL_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 5.0,
  maxWidthOrHeight: 800,
  quality: 0.88,
};

const MAX_FILE_SIZE_MB = 25; // Allow uploads up to 25MB (processed by backend Sharp)
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
 * Automatically converts iPhone HEIC/HEIF photos to JPEG in-browser for instant UI preview
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  console.log(`[HEIC Converter] iPhone photo detected (${file.name}). Converting to JPEG...`);
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
 * Prepares image for upload by validating size/format, converting HEIC if needed,
 * and generating an instant local UI preview.
 * Actual compression & WebP conversion is handled 100% server-side by Sharp.
 */
export async function optimizeImage(
  file: File,
  _options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  // 1. Convert iPhone HEIC/HEIF files first if needed for browser preview
  const targetFile = await convertHeicIfNeeded(file);

  // 2. Validate file size
  const validation = validateFileSize(targetFile);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // 3. Generate instant UI preview
  const preview = await generatePreview(targetFile);

  console.log(`[Upload Ready] ${targetFile.name} (${(targetFile.size / 1024 / 1024).toFixed(2)}MB) → Server Sharp will optimize to WebP`);

  return {
    file: targetFile,
    preview,
  };
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
