
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { calculateTotalProductStock } from '@/utils/unifiedStockManager';

export function LatestProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

  const fetchLatestProducts = async () => {
    try {
      console.log('🔄 LatestProducts: Starting data fetch');
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          subcategories!inner (
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
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

      if (error) {
        console.error('❌ LatestProducts: Fetch error:', error);
        toast({
          title: "Error",
          description: "Failed to fetch latest products. Please try again later.",
          variant: "destructive",
        });
        setLatestProducts([]);
      } else {
        console.log('✅ LatestProducts: Data loaded:', data?.length || 0);
        
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
        
        setLatestProducts(productsWithStock);
      }
    } catch (error) {
      console.error('❌ LatestProducts: Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading latest products.",
        variant: "destructive",
      });
      setLatestProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (product: any) => {
    return product.selling_price || product.subcategory?.selling_price || 0;
  };

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-6">Latest Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-6">Latest Products</h2>
        <p className="text-gray-600">No products available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6">Latest Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {latestProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full aspect-square object-cover rounded-t-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className="w-full aspect-square bg-gray-200 rounded-t-lg flex items-center justify-center">
              <span className="text-gray-400">No Image</span>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                {product.is_featured && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Featured
                  </Badge>
                )}
              </div>
              
              {product.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-red-600">
                  Rs. {getProductPrice(product)}
                </span>
                <span className={`text-sm font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Stock: {product.stock_quantity}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
