
import React, { useState, useEffect } from 'react';
import { UnifiedProductCard } from '@/components/products/UnifiedProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchFeaturedProducts, type Product } from '@/utils/productFetcher';

export function FeaturedProductsCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      const productsData = await fetchFeaturedProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading featured products:', error);
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
              <UnifiedProductCard key={`${product.id}-${index}`} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
