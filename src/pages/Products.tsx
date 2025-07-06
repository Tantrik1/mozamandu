
import { useEffect, useState } from 'react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { ProductCard } from '@/components/customer/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Footer } from '@/components/layout/Footer';
import { calculateTotalProductStock } from '@/utils/inventoryManager';

interface Product {
  id: string;
  name: string;
  description: string;
  cost_price: number;
  selling_price: number;
  is_featured: boolean;
  image_url: string;
  stock_quantity: number;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  category_id: string;
  subcategory_id: string;
  categories: { name: string };
  subcategories: { name: string; selling_price: number };
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log('🔄 Products: Starting data fetch');

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories!inner (name),
          subcategories!inner (name, selling_price)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Products: Fetch error:', error);
        toast({
          title: "Error",
          description: "Failed to fetch products. Please try again later.",
          variant: "destructive",
        });
        setProducts([]);
      } else {
        console.log('✅ Products: Data loaded:', data?.length || 0);

        // Calculate accurate stock for each product using breakdown table
        const productsWithStock = await Promise.all(
          (data || []).map(async (product) => {
            const totalStock = await calculateTotalProductStock(product.id);
            return {
              ...product,
              stock_quantity: totalStock
            };
          })
        );

        setProducts(productsWithStock);
      }
    } catch (error) {
      console.error('❌ Products: Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading products.",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Our Products</h1>
          <p className="text-gray-600 mt-2">Discover our latest collection of gear and accessories</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-500">Check back later for new products!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                subcategoryPrice={product.subcategories?.selling_price || 0}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
