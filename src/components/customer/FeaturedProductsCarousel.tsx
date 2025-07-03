<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { calculateTotalProductStock } from '@/utils/unifiedStockManager';
import { ProductCard } from '@/components/customer/ProductCard';

=======
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
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
export function FeaturedProductsCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
<<<<<<< HEAD
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      console.log('🔄 FeaturedProducts: Starting data fetch');

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          subcategories!inner (
=======
    let isMounted = true;
    const fetchFeaturedProducts = async () => {
      try {
        console.log('🔄 FeaturedProductsCarousel: Starting data fetch');
        const {
          data,
          error
        } = await supabase.from('products').select(`
            id,
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
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
          `).eq('status', 'active').eq('is_featured', true).order('created_at', {
          ascending: false
        }).limit(8);
        if (!isMounted) return;
        if (error) {
          console.error('❌ FeaturedProductsCarousel: Fetch error:', error);
          setProducts([]);
        } else {
          console.log('✅ FeaturedProductsCarousel: Raw data received:', data);

<<<<<<< HEAD
      if (error) {
        console.error('❌ FeaturedProducts: Fetch error:', error);
        toast({
          title: "Error",
          description: "Failed to fetch featured products. Please try again later.",
          variant: "destructive",
        });
        setFeaturedProducts([]);
      } else {
        console.log('✅ FeaturedProducts: Data loaded:', data?.length || 0);

        // Calculate accurate stock for each product using breakdown table
        const productsWithStock = await Promise.all(
          (data || []).map(async (product) => {
            const totalStock = await calculateTotalProductStock(product.id);
            return {
              id: product.id,
              name: product.name,
              description: product.description,
              image_url: product.image_url,
              selling_price: product.selling_price,
              cost_price: product.cost_price,
              is_featured: product.is_featured,
              has_color_variants: product.has_color_variants,
              color_has_size_variants: product.color_has_size_variants,
              stock_quantity: totalStock,
              subcategory: product.subcategories
            };
          })
        );

        setFeaturedProducts(productsWithStock);
=======
          // Transform the data to ensure proper structure
          const transformedProducts = (data || []).map(product => ({
            ...product,
            selling_price: product.selling_price || 0,
            cost_price: product.cost_price || 0,
            is_featured: product.is_featured || false,
            has_color_variants: product.has_color_variants || false,
            has_size_variants: product.has_size_variants || false,
            stock_quantity: product.stock_quantity || 0,
            subcategory: product.subcategory || {
              id: '',
              name: 'Unknown'
            }
          }));
          console.log('✅ FeaturedProductsCarousel: Transformed products:', transformedProducts.length);
          setProducts(transformedProducts);
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
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
      }
    };
    fetchFeaturedProducts();
    return () => {
      isMounted = false;
    };
  }, []);
  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % Math.max(1, products.length - 3));
  };
  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + Math.max(1, products.length - 3)) % Math.max(1, products.length - 3));
  };
  if (loading) {
<<<<<<< HEAD
    return (
      <section className="py-8 sm:py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
              Featured Products
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full mx-auto mb-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuredProducts.length === 0) {
    return (
      <section className="py-8 sm:py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
              Featured Products
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full mx-auto mb-4"></div>
          </div>
          <p className="text-gray-600">No featured products available at the moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
            Featured Products
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full mx-auto mb-4"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.map((product, idx) => (
            <div
              key={product.id}
              className="transition-transform duration-300 ease-in-out transform hover:scale-105 opacity-0 animate-fadeIn"
              style={{ animationDelay: `${0.1 + idx * 0.07}s` }}
            >
              <ProductCard
                product={product}
                subcategoryPrice={product.subcategory?.selling_price || 0}
              />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s cubic-bezier(0.4,0,0.2,1) forwards;
        }
      `}</style>
    </section>
  );
=======
    return <section className="py-8 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
              Discover our handpicked selection of premium products
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-40 sm:h-64 rounded-lg mb-4"></div>
                <div className="h-4 sm:h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
              </div>)}
          </div>
        </div>
      </section>;
  }
  if (products.length === 0) {
    return <section className="py-8 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
              Discover our handpicked selection of premium products
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500">No featured products available at the moment.</p>
            <p className="text-sm text-gray-400 mt-2">Please check back later or contact support if this issue persists.</p>
          </div>
        </div>
      </section>;
  }
  return <section className="py-8 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Products</h2>
          <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
            Discover our handpicked selection of premium products
          </p>
        </div>
        
        <div className="relative">
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-300 ease-in-out" style={{
            transform: `translateX(-${currentIndex * 25}%)`
          }}>
              {products.map(product => <div key={product.id} className="w-1/2 sm:w-1/2 lg:w-1/4 flex-shrink-0 px-1.5 sm:px-3">
                  <ProductCard product={product} subcategoryPrice={product.selling_price || 0} />
                </div>)}
            </div>
          </div>
          
          {products.length > 4 && <>
              <Button variant="outline" size="icon" className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 sm:-translate-x-4 bg-white shadow-lg hover:bg-gray-50 h-8 w-8 sm:h-10 sm:w-10" onClick={prevSlide}>
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="outline" size="icon" className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 sm:translate-x-4 bg-white shadow-lg hover:bg-gray-50 h-8 w-8 sm:h-10 sm:w-10" onClick={nextSlide}>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </>}
        </div>
      </div>
    </section>;
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
}
