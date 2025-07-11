import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedProductCard } from './AdvancedProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function FeaturedProductsCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      console.log('Fetching featured products for carousel...');
      
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
        .eq('is_featured', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching featured products:', productsError);
        throw productsError;
      }

      if (!productsData || productsData.length === 0) {
        console.log('No featured products found');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get variants for featured products
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

      console.log('Featured products with variants processed:', productsWithVariants.length);
      setProducts(productsWithVariants);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex >= products.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex <= 0 ? products.length - 1 : prevIndex - 1
    );
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-lg text-gray-600">Our most popular items</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                <div className="w-full h-64 bg-gray-200"></div>
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

  if (products.length === 0) {
    return null;
  }

  const visibleProducts = products.slice(currentIndex, currentIndex + 4).concat(
    products.slice(0, Math.max(0, (currentIndex + 4) - products.length))
  );

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-lg text-gray-600">Our most popular items</p>
        </div>

        <div className="relative">
          {products.length > 4 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10 p-0 bg-white shadow-lg border-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10 p-0 bg-white shadow-lg border-gray-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleProducts.map((product, index) => (
              <AdvancedProductCard key={`${product.id}-${index}`} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
