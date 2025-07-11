import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProductCard } from './EnhancedProductCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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

export function LatestProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestProducts();
  }, []);

  const fetchLatestProducts = async () => {
    try {
      console.log('Fetching latest products...');
      
      const { data: productsData, error: productsError } = await supabase
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
          subcategories!products_subcategory_id_fkey (
            name,
            selling_price,
            minimum_quantity
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);

      if (productsError) {
        console.error('Error fetching latest products:', productsError);
        throw productsError;
      }

      if (!productsData || productsData.length === 0) {
        console.log('No latest products found');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get variants for latest products
      const productsWithVariants = [];
      
      for (const product of productsData) {
        let productWithVariants = { ...product, color_variants: [] };

        if (product.has_color_variants) {
          const { data: colorVariants, error: colorError } = await supabase
            .from('color_variants')
            .select(`
              id,
              color_name,
              image_url,
              has_sizes
            `)
            .eq('product_id', product.id);

          if (colorError) {
            console.error('Error fetching color variants:', colorError);
          } else if (colorVariants) {
            for (const colorVariant of colorVariants) {
              let colorWithSizes = { ...colorVariant, size_variants: [] };

              if (colorVariant.has_sizes) {
                const { data: sizeVariants, error: sizeError } = await supabase
                  .from('size_variants')
                  .select(`
                    id,
                    size_name,
                    size_code
                  `)
                  .eq('color_variant_id', colorVariant.id);

                if (sizeError) {
                  console.error('Error fetching size variants:', sizeError);
                } else if (sizeVariants) {
                  colorWithSizes.size_variants = sizeVariants;
                }
              }

              productWithVariants.color_variants.push(colorWithSizes);
            }
          }
        }

        productsWithVariants.push(productWithVariants);
      }

      console.log('Latest products with variants processed:', productsWithVariants.length);
      setProducts(productsWithVariants);
    } catch (error) {
      console.error('Error fetching latest products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Products</h2>
            <p className="text-lg text-gray-600">Discover our newest arrivals</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Products</h2>
          <p className="text-lg text-gray-600">Discover our newest arrivals</p>
        </div>

        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <EnhancedProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="text-center mt-12">
              <Link to="/products">
                <Button variant="outline" size="lg">
                  View All Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No products available at the moment</p>
            <Link to="/categories">
              <Button variant="outline">
                Browse Categories
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
