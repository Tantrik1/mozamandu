import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string;
  quality?: number;
}

interface UseImageCompressionReturn {
  compressImage: (file: File, options?: Partial<CompressionOptions>) => Promise<File>;
  isCompressing: boolean;
  error: string | null;
}

export function useImageCompression(): UseImageCompressionReturn {
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compressImage = useCallback(async (
    file: File,
    customOptions?: Partial<CompressionOptions>
  ): Promise<File> => {
    setIsCompressing(true);
    setError(null);

    const defaultOptions: CompressionOptions = {
      maxSizeMB: 0.5, // 500KB max
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',
      quality: 0.8,
    };

    const options = { ...defaultOptions, ...customOptions };

    try {
      // Check WebP support
      const canvas = document.createElement('canvas');
      const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      
      if (!webpSupported) {
        options.fileType = 'image/jpeg';
      }

      const compressedFile = await imageCompression(file, options);
      
      // If WebP is not supported, fallback to JPEG
      if (!webpSupported && options.fileType === 'image/webp') {
        const jpegOptions = { ...options, fileType: 'image/jpeg' };
        return await imageCompression(file, jpegOptions);
      }

      return compressedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compression failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCompressing(false);
    }
  }, []);

  return {
    compressImage,
    isCompressing,
    error,
  };
}