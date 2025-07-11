import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProductCard } from './EnhancedProductCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
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
      prevIndex + 4 >= products.length ? 0 : prevIndex + 4
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? Math.max(0, products.length - 4) : Math.max(0, prevIndex - 4)
    );
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-lg text-gray-600">Our handpicked bestsellers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
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

  if (products.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-lg text-gray-600">No featured products available at the moment</p>
          </div>
        </div>
      </section>
    );
  }

  const visibleProducts = products.slice(currentIndex, currentIndex + 4);
  const canGoNext = currentIndex + 4 < products.length;
  const canGoPrev = currentIndex > 0;

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-lg text-gray-600">Our handpicked bestsellers</p>
        </div>

        <div className="relative">
          {products.length > 4 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg"
                onClick={prevSlide}
                disabled={!canGoPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg"
                onClick={nextSlide}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleProducts.map((product) => (
              <EnhancedProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* Dots indicator */}
        {products.length > 4 && (
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: Math.ceil(products.length / 4) }).map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  Math.floor(currentIndex / 4) === index ? 'bg-primary' : 'bg-gray-300'
                }`}
                onClick={() => setCurrentIndex(index * 4)}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link to="/products">
            <Button variant="outline" size="lg">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
