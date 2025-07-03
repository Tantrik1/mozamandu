
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  image_url: string | null;
  description: string | null;
  cost_price: number;
  is_featured: boolean | null;
  has_color_variants: boolean | null;
  has_size_variants: boolean | null;
  status: string | null;
  stock_quantity: number | null;
  category_id: string;
  subcategory_id: string;
  subcategory: {
    id: string;
    name: string;
  };
}

export function LatestProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchLatestProducts = async () => {
      try {
        console.log('🔄 LatestProducts: Starting data fetch');

        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            selling_price,
            image_url,
            description,
            cost_price,
            is_featured,
            has_color_variants,
            has_size_variants,
            status,
            stock_quantity,
            category_id,
            subcategory_id,
            subcategory:subcategories!inner(id, name)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

        if (!isMounted) return;

        if (error) {
          console.error('❌ LatestProducts: Fetch error:', error);
          setProducts([]);
        } else {
          console.log('✅ LatestProducts: Raw data received:', data);
          
          // Transform the data to ensure proper structure
          const transformedProducts = (data || []).map(product => ({
            ...product,
            selling_price: product.selling_price || 0,
            cost_price: product.cost_price || 0,
            is_featured: product.is_featured || false,
            has_color_variants: product.has_color_variants || false,
            has_size_variants: product.has_size_variants || false,
            stock_quantity: product.stock_quantity || 0,
            subcategory: product.subcategory || { id: '', name: 'Unknown' }
          }));
          
          console.log('✅ LatestProducts: Transformed products:', transformedProducts.length);
          setProducts(transformedProducts);
        }

      } catch (error) {
        console.error('❌ LatestProducts: Unexpected error:', error);
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          console.log('✅ LatestProducts: Data fetch complete');
          setLoading(false);
        }
      }
    };

    fetchLatestProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-8 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Latest Products</h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
              Check out our newest arrivals
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-40 sm:h-64 rounded-lg mb-4"></div>
                <div className="h-4 sm:h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-8 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Latest Products</h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
              Check out our newest arrivals
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500">No products available at the moment.</p>
            <p className="text-sm text-gray-400 mt-2">Please check back later or contact support if this issue persists.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Latest Products</h2>
          <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
            Check out our newest arrivals
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              subcategoryPrice={product.selling_price || 0} 
            />
          ))}
        </div>
      </div>
    </section>
  );
}
