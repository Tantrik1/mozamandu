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
      <section className="py-10 md:py-16 bg-slate-50/70 dark:bg-slate-950/70 border-t border-border/40">
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
    <section className="py-10 md:py-16 lg:py-20 bg-slate-50/70 dark:bg-slate-950/70 border-t border-border/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Consistent Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-2xs">
              <Tag className="w-3.5 h-3.5" />
              Special Offers
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Featured Deals
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl">
              Don't miss out on exclusive pricing and promotional sock bundles
            </p>
          </div>

          <Button asChild className="rounded-full group self-start sm:self-auto text-xs sm:text-sm font-bold shadow-md px-6">
            <Link to="/shop" className="flex items-center gap-2">
              Shop All Deals
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
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
                  className="border-rose-500/20 hover:border-rose-500/40"
                  badge={
                    discount > 0 ? (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white text-[10px] sm:text-xs font-extrabold rounded-full shadow-2xs">
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
      </div>
    </section>
  );
});
