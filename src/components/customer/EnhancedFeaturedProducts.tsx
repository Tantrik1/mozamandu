
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModernProductCard } from './ModernProductCard';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';
import { getProductStockSummary } from '@/utils/stockCalculation';

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  subcategory_id: string;
  stock_quantity: number;
  subcategories: {
    name: string;
    selling_price: number;
  } | null;
}

export function EnhancedFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          subcategories(name, selling_price)
        `)
        .eq('status', 'active')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      if (data) {
        // Calculate stock for each product using the inventory system
        const productsWithStock = await Promise.all(
          data.map(async (product) => {
            try {
              const stock = await getProductStockSummary(product.id);
              return {
                ...product,
                stock_quantity: stock,
                subcategories: product.subcategories,
              };
            } catch (error) {
              console.error('Error calculating stock for product:', product.id, error);
              return {
                ...product,
                stock_quantity: 0,
              };
            }
          })
        );
        setProducts(productsWithStock);
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Best Sellers</h2>
            <div className="flex justify-center items-center">
              <div className="text-lg">Loading best sellers...</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Best Sellers</h2>
            <p className="text-muted-foreground">No featured products available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Best Sellers</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our most popular products, carefully selected based on customer favorites and top ratings.
          </p>
        </div>
        
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {products.map((product) => (
                <CarouselItem 
                  key={product.id} 
                  className={`pl-2 md:pl-4 ${
                    isMobile 
                      ? 'basis-full' 
                      : 'basis-1/2 md:basis-1/3 lg:basis-1/4'
                  }`}
                >
                  <ModernProductCard
                    product={product}
                    subcategorySellingPrice={product.subcategories?.selling_price || 0}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            
            <div className="hidden md:block">
              <CarouselPrevious className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 bg-background shadow-lg hover:bg-accent border-border" />
              <CarouselNext className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 bg-background shadow-lg hover:bg-accent border-border" />
            </div>
          </Carousel>
          
          <div className="md:hidden text-center mt-4">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span>👆 Swipe to explore products</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
