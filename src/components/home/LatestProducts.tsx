import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { HomeProductCard } from './HomeProductCard';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  image_url: string | null;
  subcategory: { name: string } | null;
  has_color_variants?: boolean;
}

interface LatestProductsProps {
  products: Product[];
  isLoading: boolean;
}

export const LatestProducts = memo(function LatestProducts({ products, isLoading }: LatestProductsProps) {
  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
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

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Consistent Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              Fresh Additions
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Latest Products
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl">
              Explore our newest sock designs crafted with high-comfort combed cotton
            </p>
          </div>

          <Button asChild variant="ghost" className="group self-start sm:self-auto text-xs sm:text-sm font-semibold">
            <Link to="/shop" className="flex items-center gap-1.5">
              View All Catalog
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
                    <span className="px-2.5 py-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-extrabold rounded-full shadow-2xs">
                      New Arrival
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
