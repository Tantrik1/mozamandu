import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface EnhancedOptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
  quality?: number;
  blur?: boolean;
  preload?: boolean;
  sizes?: string;
  priority?: boolean;
}

export function EnhancedOptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  fallback = '/placeholder.svg',
  onLoad,
  onError,
  quality = 75,
  blur = true,
  preload = false,
  sizes,
  priority = false,
}: EnhancedOptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager' || priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [blurDataUrl, setBlurDataUrl] = useState<string>('');

  // Generate optimized src URLs
  const generateOptimizedSrc = useCallback((originalSrc: string, w?: number, q?: number) => {
    if (!originalSrc || originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    // For Supabase storage URLs, we can add query params for optimization
    if (originalSrc.includes('supabase')) {
      const url = new URL(originalSrc);
      if (w) url.searchParams.set('width', w.toString());
      if (q) url.searchParams.set('quality', q.toString());
      url.searchParams.set('format', 'webp');
      return url.toString();
    }

    return originalSrc;
  }, []);

  // Generate blur placeholder
  const generateBlurDataUrl = useCallback((src: string) => {
    if (!blur) return '';
    
    // Simple blur placeholder - in production, this could be generated server-side
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 10, 10);
      gradient.addColorStop(0, '#f0f0f0');
      gradient.addColorStop(1, '#e0e0e0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 10, 10);
      return canvas.toDataURL();
    }
    return '';
  }, [blur]);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback((originalSrc: string) => {
    if (!originalSrc || originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return '';
    }

    const breakpoints = [640, 768, 1024, 1280, 1536];
    return breakpoints
      .map(bp => `${generateOptimizedSrc(originalSrc, bp, quality)} ${bp}w`)
      .join(', ');
  }, [generateOptimizedSrc, quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager' || priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [loading, priority]);

  // Preload critical images
  useEffect(() => {
    if (preload || priority) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = generateOptimizedSrc(src, width, quality);
      if (generateSrcSet(src)) {
        link.setAttribute('imagesrcset', generateSrcSet(src));
      }
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [preload, priority, src, width, quality, generateOptimizedSrc, generateSrcSet]);

  // Set up image sources
  useEffect(() => {
    if (isInView) {
      setCurrentSrc(generateOptimizedSrc(src, width, quality));
      if (blur) {
        setBlurDataUrl(generateBlurDataUrl(src));
      }
    }
  }, [isInView, src, width, quality, blur, generateOptimizedSrc, generateBlurDataUrl]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setCurrentSrc(fallback);
    onError?.();
  };

  return (
    <div 
      ref={imgRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {/* Blur placeholder */}
      {blur && blurDataUrl && !isLoaded && (
        <img
          src={blurDataUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm"
          style={{ filter: 'blur(10px)' }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && !blur && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse" />
      )}
      
      {/* Main image */}
      {isInView && currentSrc && (
        <img
          src={hasError ? fallback : currentSrc}
          srcSet={hasError ? '' : generateSrcSet(src)}
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          alt={alt}
          loading={loading}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-all duration-500 ease-out",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
            className
          )}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
        />
      )}
    </div>
  );
}