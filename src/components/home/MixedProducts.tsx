import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number | null;
  cost_price: number;
  subcategory: { name: string } | null;
}

const fetchMixedProducts = async () => {
  const { data } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, cost_price, subcategory:subcategories(name)')
    .eq('status', 'active')
    .limit(12);
  
  // Shuffle the products for random order
  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
};

export const MixedProducts = memo(function MixedProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['mixed-products'],
    queryFn: fetchMixedProducts,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="h-8 w-48 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3 bg-primary/10 px-4 py-1.5 rounded-full">
            <Sparkles className="w-4 h-4" />
            Discover More
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-3">
            Explore Our Collection
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Handpicked products from all categories for your comfort and style
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
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
                
                {/* Category Badge */}
                {product.subcategory?.name && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-background/80 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full text-foreground">
                      {product.subcategory.name}
                    </span>
                  </div>
                )}
                
                {/* Product Info on Hover */}
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

        {/* Shop More CTA */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
          <Button asChild size="lg" className="rounded-full gap-2 px-10 shadow-lg hover:shadow-xl transition-all">
            <Link to="/shop">
              Shop More
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
