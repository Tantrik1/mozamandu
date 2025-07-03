import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { calculateTotalProductStock } from '@/utils/unifiedStockManager';
import { ProductCard } from '@/components/customer/ProductCard';

export function FeaturedProductsCarousel() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            name,
            selling_price
          )
        `)
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(8);

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
      }
    } catch (error) {
      console.error('❌ FeaturedProducts: Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading featured products.",
        variant: "destructive",
      });
      setFeaturedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (product: any) => {
    return product.selling_price || product.subcategory?.selling_price || 0;
  };

  if (loading) {
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
}
