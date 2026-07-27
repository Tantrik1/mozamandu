import { useState, useEffect } from 'react';

/**
 * Dynamically measures the actual height of the main <header> element
 * using getBoundingClientRect() and ResizeObserver.
 * Ensures sticky sub-headers snap precisely below the main header on all devices.
 */
export function useHeaderOffset(fallbackOffset: number = 64): number {
  const [offset, setOffset] = useState<number>(fallbackOffset);

  useEffect(() => {
    const measureHeader = () => {
      const headerEl = document.querySelector('header');
      if (headerEl) {
        const rect = headerEl.getBoundingClientRect();
        if (rect.height > 0) {
          setOffset(Math.round(rect.height));
        }
      }
    };

    measureHeader();

    const headerEl = document.querySelector('header');
    let observer: ResizeObserver | null = null;

    if (headerEl && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        measureHeader();
      });
      observer.observe(headerEl);
    }

    window.addEventListener('resize', measureHeader);
    window.addEventListener('orientationchange', measureHeader);

    return () => {
      window.removeEventListener('resize', measureHeader);
      window.removeEventListener('orientationchange', measureHeader);
      if (observer && headerEl) {
        observer.unobserve(headerEl);
      }
    };
  }, []);

  return offset;
}
