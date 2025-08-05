
import { useState, useEffect } from 'react';

interface OptimizedImage {
  webp: string;
  fallback: string;
  loaded: boolean;
}

export function useImageOptimization(imageSrc: string) {
  const [optimizedImage, setOptimizedImage] = useState<OptimizedImage>({
    webp: '',
    fallback: imageSrc,
    loaded: false
  });

  useEffect(() => {
    const img = new Image();
    
    // Create WebP version by converting the original image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Set canvas size to a smaller dimension for compression
      const maxWidth = 600;
      const maxHeight = 600;
      
      let { width, height } = img;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP with quality compression
        const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
        
        setOptimizedImage({
          webp: webpDataUrl,
          fallback: imageSrc,
          loaded: true
        });
      }
    };
    
    img.onerror = () => {
      setOptimizedImage(prev => ({ ...prev, loaded: true }));
    };
    
    img.src = imageSrc;
  }, [imageSrc]);

  return optimizedImage;
}
