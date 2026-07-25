import { memo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url?: string | null;
  subcategories: { image_url: string | null; min_selling_price: number }[];
}

interface ShopByCategoryProps {
  categories: Category[];
  isLoading: boolean;
}

export const ShopByCategory = memo(function ShopByCategory({ categories, isLoading }: ShopByCategoryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto slide loop every 2 seconds (2000ms)
  useEffect(() => {
    if (!isAutoPlaying || categories.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % categories.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, categories.length]);

  // Scroll container when activeIndex changes
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.children;
    if (cards[activeIndex]) {
      const targetCard = cards[activeIndex] as HTMLElement;
      container.scrollTo({
        left: targetCard.offsetLeft - container.offsetLeft,
        behavior: 'smooth',
      });
    }
  }, [activeIndex]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % categories.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + categories.length) % categories.length);
  };

  if (isLoading) {
    return (
      <section className="py-10 md:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Center Aligned Section Header */}
        <div className="text-center mb-8 md:mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Shop by </span>
            <span className="text-destructive">Category</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Browse our curated categories to find the exact sock style for every occasion
          </p>
        </div>

        {/* Carousel Container */}
        <div 
          className="relative group"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
          onTouchStart={() => setIsAutoPlaying(false)}
          onTouchEnd={() => setIsAutoPlaying(true)}
        >
          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-background/90 backdrop-blur-md shadow-md hover:bg-background opacity-80 hover:opacity-100 hidden sm:flex border-border/60"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-background/90 backdrop-blur-md shadow-md hover:bg-background opacity-80 hover:opacity-100 hidden sm:flex border-border/60"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </Button>

          {/* Swipeable Scroll Track */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-hide scrollbar-none snap-x snap-mandatory touch-pan-x"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category, index) => {
              const categoryImage = category.image_url || category.subcategories?.[0]?.image_url;
              const lowestPrice = category.subcategories?.length > 0
                ? Math.min(...category.subcategories.map(s => s.min_selling_price || 0).filter(p => p > 0))
                : null;
              
              return (
                <div
                  key={category.id}
                  className="snap-start shrink-0 w-[calc(50%-6px)] md:w-[calc(25%-18px)]"
                >
                  <Link 
                    to={`/shop?category=${category.id}`}
                    className="group block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    {/* Category Image - Same Aspect Ratio as Product Cards */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {categoryImage ? (
                        <img
                          src={categoryImage}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                          width={300}
                          height={300}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center" />
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent group-hover:from-black/80 transition-all duration-300" />
                      
                      {/* Subcategory Pill */}
                      <div className="absolute top-3 left-3">
                        <span className="bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                          Category
                        </span>
                      </div>

                      {/* Explore Action Banner Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <span className="text-xs sm:text-sm font-bold tracking-tight line-clamp-1">{category.name}</span>
                        <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform shrink-0" />
                      </div>
                    </div>

                    {/* Card Content - Identical padding & typography to HomeProductCard */}
                    <div className="p-4">
                      <p className="text-xs font-bold text-destructive mb-1 tracking-tight">
                        {category.name}
                      </p>
                      <h3 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                        {category.name} Collection
                      </h3>
                      {lowestPrice && lowestPrice !== Infinity ? (
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          From Rs. {lowestPrice.toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          Explore Items
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-3">
            {categories.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-5 bg-destructive' : 'w-1.5 bg-muted-foreground/30'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
