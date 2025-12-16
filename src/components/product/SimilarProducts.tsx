import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SimilarProductsProps {
  categoryId: string;
  currentProductId: string;
}

const fetchSimilarProducts = async (categoryId: string, currentProductId: string) => {
  const { data } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, cost_price')
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .neq('id', currentProductId)
    .limit(8);
  return data || [];
};

export const SimilarProducts = memo(function SimilarProducts({ categoryId, currentProductId }: SimilarProductsProps) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['similar-products', categoryId, currentProductId],
    queryFn: () => fetchSimilarProducts(categoryId, currentProductId),
    enabled: !!categoryId && !!currentProductId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Similar Products</h2>
          </div>
          <Link 
            to={`/shop?category=${categoryId}`}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product, index) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="group animate-fade-in"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Product Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-white/80 text-sm font-medium">
                    Rs. {(product.selling_price || product.cost_price).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Product Info Below Image (Mobile) */}
              <div className="mt-3 lg:hidden">
                <h3 className="font-medium text-foreground text-sm line-clamp-1">{product.name}</h3>
                <p className="text-primary font-semibold text-sm">
                  Rs. {(product.selling_price || product.cost_price).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});
