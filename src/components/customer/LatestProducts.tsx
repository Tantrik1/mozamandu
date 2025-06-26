
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  cost_price: number;
  created_at: string;
  image_url: string;
  has_color_variants: boolean;
  has_size_variants: boolean;
  stock_quantity: number;
  category_id: string;
  subcategory_id: string;
  is_featured: boolean;
  categories: {
    name: string;
  };
  subcategories: {
    name: string;
    selling_price: number;
  };
}

export function LatestProducts() {
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 LatestProducts: Starting data fetch');

    // Set timeout fallback
    loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ LatestProducts: Loading timeout after 10 seconds');
        setError('Loading took too long. Please refresh the page.');
        setLoading(false);
      }
    }, 10000);
    
    const fetchLatestProducts = async () => {
      try {
        console.log('🔄 LatestProducts: Fetching latest products...');
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            selling_price,
            cost_price,
            created_at,
            image_url,
            has_color_variants,
            has_size_variants,
            stock_quantity,
            category_id,
            subcategory_id,
            is_featured,
            categories (name),
            subcategories (name, selling_price)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) {
          console.error('❌ LatestProducts: Error fetching latest products:', error);
          // Check for RLS issues
          if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
            console.warn('⚠️ LatestProducts: RLS may be blocking access');
          }
          throw error;
        }
        
        if (!isMounted) return;

        console.log('✅ LatestProducts: Latest products fetched:', data?.length || 0);
        setLatestProducts(data || []);
        setError(null);
      } catch (error) {
        console.error('❌ LatestProducts: Exception during fetch:', error);
        if (isMounted) {
          setError('Failed to load latest products. Please try again.');
        }
      } finally {
        if (isMounted) {
          console.log('✅ LatestProducts: Setting loading to false');
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    fetchLatestProducts();

    return () => {
      console.log('🧹 LatestProducts: Cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Latest Products</h2>
            <p className="text-gray-600">Discover our newest arrivals</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
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
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Latest Products</h2>
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
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Latest Products</h2>
          <p className="text-gray-600">Discover our newest arrivals</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {latestProducts.map((product) => (
            <ProductCard 
              key={product.id}
              product={product} 
              subcategoryPrice={product.subcategories?.selling_price || 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
