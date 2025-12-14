import imageCompression from 'browser-image-compression';

export interface OptimizedImageResult {
  file: File;
  preview: string;
}

export interface ImageOptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxSizeMB: 1, // Target 1MB to stay well under 2MB limit
  maxWidthOrHeight: 1920,
  quality: 0.85,
};

const MAX_FILE_SIZE_MB = 2;
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
 * Converts an image file to WebP format and compresses it
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // First validate the original file size
  const validation = validateFileSize(file);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  try {
    // Compress and resize the image
    const compressedFile = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB!,
      maxWidthOrHeight: opts.maxWidthOrHeight!,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: opts.quality!,
    });

    // Create a new file with .webp extension
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const webpFile = new File([compressedFile], `${originalName}.webp`, {
      type: 'image/webp',
    });

    // Generate preview URL
    const preview = await generatePreview(webpFile);

    console.log(
      `Image optimized: ${file.name} (${(file.size / 1024).toFixed(1)}KB) → ${webpFile.name} (${(webpFile.size / 1024).toFixed(1)}KB)`
    );

    return {
      file: webpFile,
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
