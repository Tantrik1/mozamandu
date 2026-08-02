import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  /** Set to true for above-the-fold images (hero, first product card, etc.) */
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  /** Additional wrapper class for the container div */
  containerClassName?: string;
}

/**
 * OptimizedImage — a progressive-loading image component.
 * 
 * Features:
 * - Shimmer placeholder while loading
 * - Smooth fade-in on load
 * - IntersectionObserver-based lazy loading (unless `priority` is set)
 * - Error fallback to placeholder SVG
 * - fetchpriority="high" for above-the-fold images
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  fallbackSrc = '/placeholder.svg',
  priority = false,
  width,
  height,
  sizes,
  containerClassName,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // priority images are "in view" immediately
  const imgRef = useRef<HTMLDivElement>(null);

  const displaySrc = error ? fallbackSrc : (src || fallbackSrc);

  // IntersectionObserver for non-priority images
  useEffect(() => {
    if (priority || isInView) return;

    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, isInView]);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', containerClassName)}>
      {/* Shimmer placeholder — shown until image loads */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Actual image — only rendered when in viewport (or priority) */}
      {isInView && (
        <img
          src={displaySrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          width={width}
          height={height}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true); // Show fallback immediately
          }}
        />
      )}
    </div>
  );
});
