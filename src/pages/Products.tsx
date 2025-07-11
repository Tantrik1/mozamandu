
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProductCard } from '@/components/customer/EnhancedProductCard';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';

interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price?: number;
  image_url?: string;
  status: string;
  subcategory_id: string;
  is_featured?: boolean;
  has_color_variants?: boolean;
  color_has_size_variants?: boolean;
  subcategories: {
    name: string;
    selling_price: number;
    minimum_quantity: number;
  };
  color_variants?: {
    id: string;
    color_name: string;
    image_url?: string;
    has_sizes: boolean;
    size_variants: {
      id: string;
      size_name: string;
      size_code?: string;
    }[];
  }[];
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log('Fetching all products...');
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          cost_price,
          selling_price,
          image_url,
          status,
          subcategory_id,
          is_featured,
          has_color_variants,
          color_has_size_variants,
          subcategories!inner (
            name,
            selling_price,
            minimum_quantity
          ),
          color_variants (
            id,
            color_name,
            image_url,
            has_sizes,
            size_variants (
              id,
              size_name,
              size_code
            )
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      console.log('Products fetched:', data?.length || 0);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading products...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No products found</p>
              <p className="text-sm text-gray-400">Check back later for new arrivals!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <EnhancedProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
