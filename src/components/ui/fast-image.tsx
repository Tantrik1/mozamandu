
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FastImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function FastImage({ src, alt, className, priority = false }: FastImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer bg-[length:200%_100%]" />
      )}
      
      <picture>
        <source srcSet={src} type="image/webp" />
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          className={cn(
            "transition-all duration-300",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
            className
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </picture>
    </div>
  );
}
