import { useState, useRef, memo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  isFeatured?: boolean;
  discountPercent?: number;
  onImageChange?: (index: number) => void;
}

export const ProductImageGallery = memo(function ProductImageGallery({
  images,
  productName,
  isFeatured,
  discountPercent,
  onImageChange
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const displayImages = images.length > 0 ? images : ['/placeholder.svg'];

  useEffect(() => {
    setCurrentIndex(0);
    onImageChange?.(0);
  }, [images, onImageChange]);

  const goToImage = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, displayImages.length - 1));
    setCurrentIndex(newIndex);
    onImageChange?.(newIndex);
  }, [displayImages.length, onImageChange]);

  const handlePrev = useCallback(() => {
    goToImage(currentIndex === 0 ? displayImages.length - 1 : currentIndex - 1);
  }, [currentIndex, displayImages.length, goToImage]);

  const handleNext = useCallback(() => {
    goToImage(currentIndex === displayImages.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, displayImages.length, goToImage]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStart(null);
  }, [touchStart, handleNext, handlePrev]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  }, [productName]);

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Main Image Container */}
      <div 
        ref={imageContainerRef}
        className="relative aspect-[4/5] lg:aspect-square bg-muted/30 rounded-xl lg:rounded-2xl overflow-hidden group"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main Image */}
        <OptimizedImage 
          src={displayImages[currentIndex]} 
          alt={`${productName} - Image ${currentIndex + 1}`}
          className={cn(
            "w-full h-full object-cover transition-transform duration-300 ease-out",
            isZoomed && "lg:scale-[2]"
          )}
          containerClassName="w-full h-full"
          priority={currentIndex === 0}
        />

        {/* Gradient Overlay for badges */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />

        {/* Top Left Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isFeatured && (
            <Badge className="bg-amber-500 text-white border-0 text-xs font-medium px-2.5 py-1">
              Featured
            </Badge>
          )}
          {discountPercent && discountPercent > 0 && (
            <Badge className="bg-rose-500 text-white border-0 text-xs font-medium px-2.5 py-1">
              -{discountPercent}% OFF
            </Badge>
          )}
        </div>

        {/* Top Right Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button 
            onClick={() => setIsWishlisted(!isWishlisted)}
            className={cn(
              "w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
              isWishlisted 
                ? "bg-rose-500 text-white" 
                : "bg-white/80 text-foreground hover:bg-white"
            )}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={cn("w-4 h-4 lg:w-5 lg:h-5", isWishlisted && "fill-current")} />
          </button>
          <button 
            onClick={handleShare}
            className="w-9 h-9 lg:w-10 lg:h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-all"
            aria-label="Share product"
          >
            <Share2 className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
        </div>

        {/* Zoom Indicator (Desktop only) */}
        <div className="hidden lg:flex absolute bottom-4 left-4 items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3.5 h-3.5" />
          Hover to zoom
        </div>

        {/* Navigation Arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Mobile Dots Indicator */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden">
            {displayImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToImage(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentIndex 
                    ? "bg-white w-4" 
                    : "bg-white/50"
                )}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Desktop Image Counter */}
        {displayImages.length > 1 && (
          <div className="hidden lg:block absolute bottom-4 right-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
            {currentIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {displayImages.length > 1 && (
        <div className="hidden lg:flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => goToImage(idx)}
              className={cn(
                "flex-shrink-0 w-16 h-16 xl:w-20 xl:h-20 rounded-lg overflow-hidden border-2 transition-all",
                idx === currentIndex 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-transparent hover:border-border opacity-70 hover:opacity-100"
              )}
              aria-label={`View image ${idx + 1}`}
            >
              <OptimizedImage 
                src={img} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
