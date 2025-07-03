import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart } from 'lucide-react';
import { ProductCard } from '@/components/customer/ProductCard';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';

interface Product {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  cost_price?: number;
  is_featured?: boolean;
  image_url?: string;
  has_color_variants?: boolean;
  color_has_size_variants?: boolean;
  stock_quantity?: number;
  subcategory_id?: string;
  category_id?: string;
  subcategories: {
    name: string;
    selling_price: number;
  };
}
interface Subcategory {
  id: string;
  name: string;
  products: Product[];
}
export function SubcategoryProductTabs() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchSubcategoriesWithProducts();
  }, []);
  const fetchSubcategoriesWithProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('subcategories').select(`
          id,
          name,
          products!inner (
            id,
            name,
            description,
            selling_price,
            image_url,
            has_color_variants,
            color_has_size_variants,
            is_featured,
            stock_quantity,
            subcategory_id,
            subcategories (name, selling_price)
          )
        `).eq('status', 'on').eq('products.status', 'active').limit(4);
      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories with products:', error);
    } finally {
      setLoading(false);
    }
  };
  const getProductPrice = (product: Product) => {
    return product.selling_price || product.subcategories?.selling_price || 0;
  };
  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }
  if (!subcategories.length) {
    return null;
  }
  // Sort subcategories alphabetically by name
  const sortedSubcategories = [...subcategories].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="py-8 sm:py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
            Shop by Subcategory
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full mx-auto mb-4"></div>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Browse our top subcategories and discover trending products
          </p>
        </div>
        <Tabs defaultValue={sortedSubcategories[0]?.id} className="w-full">
          <TabsList className="mb-6 flex flex-wrap gap-3 bg-white shadow rounded-lg p-2">
            {sortedSubcategories.map((subcategory) => (
              <TabsTrigger key={subcategory.id} value={subcategory.id} className="capitalize px-4 py-2 rounded-lg font-semibold text-gray-700 hover:bg-red-50 focus:bg-red-100 transition-colors">
                {subcategory.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {sortedSubcategories.map((subcategory) => (
            <TabsContent key={subcategory.id} value={subcategory.id} className="w-full">
              <Carousel
                opts={{ align: 'start', loop: true }}
                className="w-full"
              >
                <CarouselContent className="-ml-1 md:-ml-4">
                  {subcategory.products.map((product, idx) => (
                    <CarouselItem
                      key={product.id}
                      className={
                        'pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4'
                      }
                    >
                      <div
                        className="transition-transform duration-300 ease-in-out transform hover:scale-105 opacity-0 animate-fadeIn h-full"
                        style={{ animationDelay: `${0.1 + idx * 0.07}s` }}
                      >
                        <ProductCard
                          product={product as any}
                          subcategoryPrice={product.subcategories?.selling_price || 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {/* Navigation Arrows - Hidden on mobile for better touch experience */}
                <div className="hidden md:block">
                  <CarouselPrevious className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 border-2 border-gray-200" />
                  <CarouselNext className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 border-2 border-gray-200" />
                </div>
              </Carousel>
              {/* Touch indicator for mobile */}
              <div className="md:hidden text-center mt-4">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <span>👆 Swipe to explore products</span>
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
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
}