import imageCompression from 'browser-image-compression';

export interface OptimizedImageResult {
  file: File;
  preview: string;
}

export interface ImageOptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  forceCompress?: boolean; // Force compression regardless of size
}

// Threshold for compression - only compress if larger than 1.5MB
const COMPRESSION_THRESHOLD_MB = 1.5;
const COMPRESSION_THRESHOLD_BYTES = COMPRESSION_THRESHOLD_MB * 1024 * 1024;

// Default options for images that need compression (>1.5MB)
const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxSizeMB: 1.5, // Target 1.5MB for large images
  maxWidthOrHeight: 1920,
  quality: 0.9,
};

// Preset for high compression (notices, banners) - only used if forceCompress is true
export const HIGH_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  quality: 0.85,
  forceCompress: true,
};

// Preset for product images - light touch, mainly format conversion
export const PRODUCT_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  quality: 0.92,
};

// Preset for thumbnails/category images
export const THUMBNAIL_COMPRESSION: ImageOptimizationOptions = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1200,
  quality: 0.9,
};

const MAX_FILE_SIZE_MB = 10; // Allow uploads up to 10MB
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
 * Converts an image file to WebP format
 * Only compresses if file is larger than 1.5MB, otherwise just converts format
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Validate the original file size
  const validation = validateFileSize(file);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  try {
    const needsCompression = file.size > COMPRESSION_THRESHOLD_BYTES || opts.forceCompress;
    
    let resultFile: File;
    
    if (needsCompression) {
      // Compress the image if it's larger than threshold
      console.log(`Image ${file.name} is ${(file.size / 1024 / 1024).toFixed(2)}MB - compressing...`);
      
      const compressedFile = await imageCompression(file, {
        maxSizeMB: opts.maxSizeMB!,
        maxWidthOrHeight: opts.maxWidthOrHeight!,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: opts.quality!,
        alwaysKeepResolution: false,
      });

      const originalName = file.name.replace(/\.[^/.]+$/, '');
      resultFile = new File([compressedFile], `${originalName}.webp`, {
        type: 'image/webp',
      });
    } else {
      // Just convert to WebP without heavy compression
      console.log(`Image ${file.name} is ${(file.size / 1024 / 1024).toFixed(2)}MB - converting to WebP only...`);
      
      const convertedFile = await imageCompression(file, {
        maxSizeMB: 10, // No real size limit for small images
        maxWidthOrHeight: 4096, // Keep original dimensions up to 4K
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.95, // High quality for format conversion
        alwaysKeepResolution: true,
      });

      const originalName = file.name.replace(/\.[^/.]+$/, '');
      resultFile = new File([convertedFile], `${originalName}.webp`, {
        type: 'image/webp',
      });
    }

    // Generate preview URL
    const preview = await generatePreview(resultFile);

    const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const newSizeMB = (resultFile.size / 1024 / 1024).toFixed(2);
    const savings = ((1 - resultFile.size / file.size) * 100).toFixed(0);
    
    console.log(
      `Image processed: ${file.name} (${originalSizeMB}MB) → ${resultFile.name} (${newSizeMB}MB) - ${savings}% ${Number(savings) > 0 ? 'smaller' : 'change'}`
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
 * Checks if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Gets human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
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
    throw new Error('Please select a valid image file (JPG, PNG, GIF, WebP)');
  }

  // Validate file size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.message);
  }

  // Optimize the image (converts to WebP and compresses)
  return optimizeImage(file, options);
}
