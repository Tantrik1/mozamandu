
import { useState, useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  is_featured: boolean;
  image_url: string;
  has_color_variants: boolean;
  has_size_variants: boolean;
  stock_quantity: number;
  category_id: string;
  subcategory_id: string;
  cost_price: number;
  categories: {
    name: string;
  };
  subcategories: {
    name: string;
    selling_price: number;
  };
}

export function FeaturedProductsCarousel() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 FeaturedProductsCarousel: Starting data fetch');

    // Set timeout fallback
    loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ FeaturedProductsCarousel: Loading timeout after 10 seconds');
        setError('Loading took too long. Please refresh the page.');
        setLoading(false);
      }
    }, 10000);
    
    const fetchFeaturedProducts = async () => {
      try {
        console.log('🔄 FeaturedProductsCarousel: Fetching featured products...');
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            selling_price,
            cost_price,
            is_featured,
            image_url,
            has_color_variants,
            has_size_variants,
            stock_quantity,
            category_id,
            subcategory_id,
            categories (name),
            subcategories (name, selling_price)
          `)
          .eq('is_featured', true)
          .eq('status', 'active')
          .limit(8);

        if (error) {
          console.error('❌ FeaturedProductsCarousel: Error fetching featured products:', error);
          // Check for RLS issues
          if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
            console.warn('⚠️ FeaturedProductsCarousel: RLS may be blocking access');
          }
          throw error;
        }
        
        if (!isMounted) return;

        console.log('✅ FeaturedProductsCarousel: Featured products fetched:', data?.length || 0);
        setFeaturedProducts(data || []);
        setError(null);
      } catch (error) {
        console.error('❌ FeaturedProductsCarousel: Exception during fetch:', error);
        if (isMounted) {
          setError('Failed to load featured products. Please try again.');
        }
      } finally {
        if (isMounted) {
          console.log('✅ FeaturedProductsCarousel: Setting loading to false');
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    fetchFeaturedProducts();

    return () => {
      console.log('🧹 FeaturedProductsCarousel: Cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
            <p className="text-gray-600">Discover our handpicked selection of premium products</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-gray-600">Discover our handpicked selection of premium products</p>
        </div>
        
        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {featuredProducts.map((product) => (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <ProductCard 
                  product={product} 
                  subcategoryPrice={product.subcategories?.selling_price || 0} 
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
