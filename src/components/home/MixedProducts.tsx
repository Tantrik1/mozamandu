import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getBatchProductStock, getActiveSubcategoryIds } from '@/utils/stockCalculation';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number | null;
  cost_price: number;
  subcategory: { name: string; min_selling_price?: number | null } | null;
}

const fetchMixedProducts = async () => {
  const activeSubIds = await getActiveSubcategoryIds();
  if (activeSubIds.length === 0) return [];
  const { data } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, cost_price, subcategory:subcategories(name, min_selling_price)')
    .eq('status', 'active')
    .in('subcategory_id', activeSubIds)
    .limit(8);

  const products = data || [];
  if (products.length === 0) return [];
  const stockMap = await getBatchProductStock(products.map(p => p.id));
  const inStock = products.filter(p => (stockMap[p.id] || 0) > 0);
  return inStock.sort(() => Math.random() - 0.5).slice(0, 4);
};

export const MixedProducts = memo(function MixedProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['mixed-products'],
    queryFn: fetchMixedProducts,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
    <section className="py-10 md:py-16 lg:py-20 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Center Aligned Section Header */}
        <div className="text-center mb-8 md:mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Handpicked </span>
            <span className="text-destructive">Selections</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Discover versatile styles and premium sock packs chosen for your ultimate comfort
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8">
          {products.map((product) => {
            const displayPrice =
              product.selling_price ?? product.subcategory?.min_selling_price ?? product.cost_price;

            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border/60 shadow-xs hover:shadow-xl transition-all duration-500">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                      decoding="async"
                      width={300}
                      height={300}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Category Badge */}
                  {product.subcategory?.name && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-background/85 backdrop-blur-md text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full text-foreground border border-border/40 shadow-2xs">
                        {product.subcategory.name}
                      </span>
                    </div>
                  )}

                  {/* Product Info on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden lg:block">
                    <h3 className="text-white font-bold text-sm line-clamp-1 mb-0.5">
                      {product.name}
                    </h3>
                    <p className="text-white/90 text-xs font-extrabold">
                      Rs. {displayPrice.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Product Info Below Image (Mobile) */}
                <div className="mt-2.5 lg:hidden space-y-0.5">
                  <h3 className="font-semibold text-foreground text-xs sm:text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-primary font-bold text-xs sm:text-sm">
                    Rs. {displayPrice.toLocaleString()}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Shop More CTA */}
        <div className="text-center">
          <Button asChild size="lg" className="rounded-full gap-2 px-10 font-bold shadow-md hover:shadow-lg transition-all">
            <Link to="/shop">
              Shop Full Collection
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
