
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from './ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  image_url: string | null;
  subcategory: {
    id: string;
    name: string;
  };
}

export function FeaturedProductsCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchFeaturedProducts = async () => {
      try {
        console.log('🔄 FeaturedProductsCarousel: Starting data fetch');

        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            selling_price,
            image_url,
            subcategory:subcategories(id, name)
          `)
          .eq('status', 'active')
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (!isMounted) return;

        if (error) {
          console.error('❌ FeaturedProductsCarousel: Fetch error:', error);
          setProducts([]);
        } else {
          console.log('✅ FeaturedProductsCarousel: Featured products loaded:', data?.length || 0);
          setProducts(data || []);
        }

      } catch (error) {
        console.error('❌ FeaturedProductsCarousel: Unexpected error:', error);
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          console.log('✅ FeaturedProductsCarousel: Data fetch complete');
          setLoading(false);
        }
      }
    };

    fetchFeaturedProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, products.length - 3));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, products.length - 3)) % Math.max(1, products.length - 3));
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="mt-4 text-lg text-gray-600">
              Discover our handpicked selection of premium socks
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="mt-4 text-lg text-gray-600">
              Discover our handpicked selection of premium socks
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500">No featured products available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          <p className="mt-4 text-lg text-gray-600">
            Discover our handpicked selection of premium socks
          </p>
        </div>
        
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 25}%)` }}
            >
              {products.map((product) => (
                <div key={product.id} className="w-1/4 flex-shrink-0 px-3">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
          
          {products.length > 4 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white shadow-lg hover:bg-gray-50"
                onClick={prevSlide}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white shadow-lg hover:bg-gray-50"
                onClick={nextSlide}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
