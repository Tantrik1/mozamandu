
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  created_at: string;
  categories: {
    name: string;
  };
  subcategories: {
    name: string;
    selling_price: number;
  };
  product_images: {
    image_url: string;
    is_primary: boolean;
  }[];
}

export function LatestProducts() {
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestProducts();
  }, []);

  const fetchLatestProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          selling_price,
          created_at,
          categories (name),
          subcategories (name, selling_price),
          product_images (image_url, is_primary)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setLatestProducts(data || []);
    } catch (error) {
      console.error('Error fetching latest products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">Loading latest products...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Latest Products</h2>
          <p className="text-gray-600 text-lg">Discover our newest arrivals</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {latestProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
