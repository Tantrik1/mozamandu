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
            subcategory:subcategories(id, name)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

        if (!isMounted) return;

        if (error) {
          console.error('❌ LatestProducts: Fetch error:', error);
          setProducts([]);
        } else {
          console.log('✅ LatestProducts: Latest products loaded:', data?.length || 0);
          setProducts(data || []);
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Latest Products</h2>
            <p className="mt-4 text-lg text-gray-600">
              Check out our newest arrivals
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Latest Products</h2>
            <p className="mt-4 text-lg text-gray-600">
              Check out our newest arrivals
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500">No products available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Latest Products</h2>
          <p className="mt-4 text-lg text-gray-600">
            Check out our newest arrivals
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
