import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Flame } from 'lucide-react';
import { HomeProductCard } from './HomeProductCard';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  image_url: string | null;
  subcategory: { name: string } | null;
  order_count: number;
  has_color_variants?: boolean;
}

interface MostSoldProductsProps {
  products: Product[];
  isLoading: boolean;
}

export const MostSoldProducts = memo(function MostSoldProducts({ products, isLoading }: MostSoldProductsProps) {
  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Center Aligned Section Header without Eyebrow */}
        <div className="text-center mb-8 md:mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-foreground">Most Sold </span>
            <span className="text-destructive">Products</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            Customer favorites loved and ordered repeatedly across Nepal
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
                badge={
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white text-[10px] sm:text-xs font-extrabold rounded-full shadow-2xs">
                      <Flame className="w-3 h-3 fill-current" />
                      Popular
                    </span>
                  </div>
                }
              />
            </div>
          ))}
        </div>

        {/* Center View All Button */}
        <div className="mt-8 text-center">
          <Button asChild variant="outline" className="rounded-full px-8 border-border/80 font-bold hover:bg-muted/50">
            <Link to="/shop" className="flex items-center gap-2">
              View All Best Sellers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
