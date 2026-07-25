import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl md:rounded-3xl aspect-square animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 bg-background relative">
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

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {categories.map((category, index) => {
            const categoryImage = category.image_url || category.subcategories?.[0]?.image_url;
            const lowestPrice = category.subcategories?.length > 0
              ? Math.min(...category.subcategories.map(s => s.min_selling_price || 0).filter(p => p > 0))
              : null;
            
            return (
              <div
                key={category.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
              >
                <Link 
                  to={`/shop?category=${category.id}`}
                  className="group relative block rounded-2xl sm:rounded-3xl overflow-hidden aspect-square border border-border/60 shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  {/* Background Image */}
                  {categoryImage ? (
                    <img
                      src={categoryImage}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={400}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition-all duration-500" />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-4 sm:p-6 lg:p-7">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 group-hover:translate-y-[-2px] transition-transform duration-300">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-xs sm:text-sm text-white/70 line-clamp-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden xs:block">
                        {category.description}
                      </p>
                    )}
                    {lowestPrice && lowestPrice !== Infinity && (
                      <p className="text-xs sm:text-sm text-white/90 mb-2 font-medium">
                        From Rs. {lowestPrice.toLocaleString()}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white">
                      <span className="opacity-90 group-hover:opacity-100 transition-opacity">Explore Category</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                  
                  {/* Corner Accent */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105 border border-white/20">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
