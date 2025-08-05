import { useEffect, useCallback } from 'react';

interface PerformanceOptimizations {
  enableResourceHints: boolean;
  enableImageLazyLoading: boolean;
  enablePrefetching: boolean;
  enableCriticalResourcePreloading: boolean;
}

export function usePerformanceOptimizer(
  options: Partial<PerformanceOptimizations> = {}
) {
  const {
    enableResourceHints = true,
    enableImageLazyLoading = true,
    enablePrefetching = true,
    enableCriticalResourcePreloading = true,
  } = options;

  // Preconnect to external domains
  const addResourceHints = useCallback(() => {
    if (!enableResourceHints) return;

    const hints = [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' },
      { rel: 'dns-prefetch', href: 'https://huwhbxjlyucamitwwhyg.supabase.co' },
    ];

    hints.forEach(({ rel, href, crossOrigin }) => {
      if (!document.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        if (crossOrigin !== undefined) link.crossOrigin = crossOrigin;
        document.head.appendChild(link);
      }
    });
  }, [enableResourceHints]);

  // Preload critical resources
  const preloadCriticalResources = useCallback(() => {
    if (!enableCriticalResourcePreloading) return;

    const criticalResources = [
      { href: '/placeholder.svg', as: 'image' },
      // Add other critical resources here
    ];

    criticalResources.forEach(({ href, as }) => {
      if (!document.querySelector(`link[rel="preload"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        document.head.appendChild(link);
      }
    });
  }, [enableCriticalResourcePreloading]);

  // Prefetch next likely pages
  const prefetchNextPages = useCallback(() => {
    if (!enablePrefetching) return;

    const likelyNextPages = [
      '/products',
      '/categories',
      '/checkout',
    ];

    likelyNextPages.forEach(href => {
      if (!document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      }
    });
  }, [enablePrefetching]);

  // Optimize image loading
  const optimizeImageLoading = useCallback(() => {
    if (!enableImageLazyLoading) return;

    // Add loading="lazy" to images that don't have it
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach((img) => {
      if (!img.closest('[data-priority]')) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }, [enableImageLazyLoading]);

  // Monitor performance
  const monitorPerformance = useCallback(() => {
    if ('PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime);
          }
          if (entry.entryType === 'first-input') {
            console.log('FID:', entry.processingStart - entry.startTime);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      } catch (e) {
        // Fallback for older browsers
        console.warn('Performance monitoring not supported');
      }

      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    // Apply optimizations
    addResourceHints();
    preloadCriticalResources();
    
    // Defer non-critical optimizations
    const timeoutId = setTimeout(() => {
      prefetchNextPages();
      optimizeImageLoading();
    }, 1000);

    // Start performance monitoring
    const cleanup = monitorPerformance();

    return () => {
      clearTimeout(timeoutId);
      cleanup?.();
    };
  }, [
    addResourceHints,
    preloadCriticalResources,
    prefetchNextPages,
    optimizeImageLoading,
    monitorPerformance,
  ]);

  return {
    addResourceHints,
    preloadCriticalResources,
    prefetchNextPages,
    optimizeImageLoading,
  };
}