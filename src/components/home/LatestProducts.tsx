import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock } from 'lucide-react';
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
      <section className="py-10 md:py-12 lg:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
    <section className="py-10 md:py-12 lg:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 md:mb-8 animate-fade-in">
          <div>
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-2">
              <Clock className="w-4 h-4" />
              New Arrivals
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Latest Products
            </h2>
          </div>
          <Button asChild variant="ghost" className="group self-start sm:self-auto">
            <Link to="/shop" className="flex items-center gap-2">
              View All
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
                    <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      New
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
