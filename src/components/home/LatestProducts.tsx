import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  image_url: string | null;
  subcategory: { name: string } | null;
}

interface LatestProductsProps {
  products: Product[];
  isLoading: boolean;
}

export const LatestProducts = memo(function LatestProducts({ products, isLoading }: LatestProductsProps) {
  if (isLoading) {
    return (
      <section className="py-16 lg:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
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
    <section className="py-16 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 animate-fade-in">
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Link 
                to={`/product/${product.id}`}
                className="group block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  <img
                    src={product.image_url || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    width={512}
                    height={512}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      New
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {product.subcategory?.name || 'Uncategorized'}
                  </p>
                  <h3 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-foreground">
                    Rs. {product.selling_price?.toLocaleString() || '0'}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
