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
      <section className="py-10 md:py-12 lg:py-16 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
    <section className="py-10 md:py-12 lg:py-16 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 md:mb-8 animate-fade-in">
          <div>
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-2">
              <Tag className="w-4 h-4" />
              Limited Time
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Featured Deals
            </h2>
            <p className="text-muted-foreground mt-2">
              Don't miss out on these amazing offers
            </p>
          </div>
          <Button asChild className="rounded-full group self-start sm:self-auto">
            <Link to="/shop" className="flex items-center gap-2">
              Shop All Deals
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
                  className="border-2 border-primary/20 hover:border-primary/50 hover:shadow-xl"
                  badge={
                    discount > 0 ? (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                          <Percent className="w-3 h-3" />
                          {discount}% OFF
                        </span>
                      </div>
                    ) : null
                  }
                  priceSlot={
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-primary">
                        Rs. {displayPrice.toLocaleString()}
                      </p>
                      {discount > 0 && (
                        <p className="text-sm text-muted-foreground line-through">
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
