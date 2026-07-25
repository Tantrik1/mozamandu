import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HomeProductCard } from '@/components/home/HomeProductCard';

interface MoreFromMozamanduProps {
  currentProductId: string;
}

const fetchRandomProducts = async (currentProductId: string) => {
  const { data } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, cost_price, subcategory:subcategories(name, min_selling_price)')
    .eq('status', 'active')
    .neq('id', currentProductId)
    .limit(20);
  
  if (!data || data.length === 0) return [];
  
  // Shuffle and take 8 random products
  const shuffled = data.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
};

export const MoreFromMozamandu = memo(function MoreFromMozamandu({ currentProductId }: MoreFromMozamanduProps) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['more-from-mozamandu', currentProductId],
    queryFn: () => fetchRandomProducts(currentProductId),
    enabled: !!currentProductId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 w-56 bg-muted rounded animate-pulse" />
          </div>
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
    <section className="py-10 md:py-16 lg:py-20 bg-background border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
              More from Mozamandu
            </h2>
          </div>
          <Link 
            to="/shop"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Explore All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <HomeProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
