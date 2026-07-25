import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Percent, Tag } from 'lucide-react';
import { HomeProductCard } from './HomeProductCard';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  cost_price: number;
  image_url: string | null;
  subcategory: { name: string; min_selling_price?: number | null } | null;
  has_color_variants?: boolean;
}

interface FeaturedDealsProps {
  products: Product[];
  isLoading: boolean;
}

export const FeaturedDeals = memo(function FeaturedDeals({ products, isLoading }: FeaturedDealsProps) {
  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
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
    <section className="py-10 md:py-16 lg:py-20 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Center Aligned Section Header */}
        <div className="text-center mb-8 md:mb-12 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide bg-destructive/10 text-destructive border border-destructive/20 shadow-2xs">
            <Tag className="w-3.5 h-3.5" />
            Special Offers
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Featured Deals
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            Don't miss out on exclusive pricing and promotional sock bundles
          </p>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((product, index) => {
            const comparePrice = product.selling_price ?? product.subcategory?.min_selling_price ?? null;
            const discount = comparePrice != null
              ? Math.round(((product.cost_price - comparePrice) / product.cost_price) * 100)
              : 0;

            const displayPrice =
              product.selling_price ?? product.subcategory?.min_selling_price ?? product.cost_price ?? 0;

            return (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <HomeProductCard
                  product={product}
                  className="border-destructive/20 hover:border-destructive/40"
                  badge={
                    discount > 0 ? (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-destructive text-white text-[10px] sm:text-xs font-extrabold rounded-full shadow-2xs">
                          <Percent className="w-3 h-3" />
                          {discount}% OFF
                        </span>
                      </div>
                    ) : null
                  }
                  priceSlot={
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-extrabold text-primary">
                        Rs. {displayPrice.toLocaleString()}
                      </p>
                      {discount > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          Rs. {product.cost_price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Center View All Deals Button */}
        <div className="mt-8 text-center">
          <Button asChild size="lg" className="rounded-full gap-2 px-8 font-bold shadow-md hover:shadow-lg transition-all">
            <Link to="/shop">
              Shop All Deals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
