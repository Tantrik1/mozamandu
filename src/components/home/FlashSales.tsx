import { memo } from 'react';
import { HomeProductCard } from './HomeProductCard';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  cost_price: number;
  image_url: string | null;
  subcategory: { name: string; min_selling_price?: number | null; max_selling_price?: number | null } | null;
  has_color_variants?: boolean;
}

interface FlashSalesProps {
  products: Product[];
  isLoading: boolean;
}

export const FlashSales = memo(function FlashSales({ products, isLoading }: FlashSalesProps) {
  if (isLoading) {
    return (
      <section className="py-10 md:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Center Aligned Section Header */}
        <div className="text-center mb-8 md:mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Flash Deals </span>
            <span className="text-destructive">of the Day</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Grab premium socks at extraordinary discounted prices before stock runs out
          </p>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <HomeProductCard
                product={product}
                className="border-destructive/20 hover:border-destructive/40"
                badge={
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-extrabold rounded-full shadow-xs">
                      Flash Deal
                    </span>
                  </div>
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
