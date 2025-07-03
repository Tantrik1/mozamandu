
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Footer } from '@/components/layout/Footer';
import { calculateTotalProductStock } from '@/utils/unifiedStockManager';

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
}

export default function SubcategoryPage() {
  const { subcategoryId } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategory, setSubcategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      fetchSubcategoryData();
      fetchProducts();
    }
  }, [subcategoryId]);

  const fetchSubcategoryData = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          categories (name)
        `)
        .eq('id', subcategoryId)
        .single();

      if (error) throw error;
      setSubcategory(data);
    } catch (error) {
      console.error('Error fetching subcategory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subcategory details.",
        variant: "destructive",
      });
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate accurate stock for each product using breakdown table
      const productsWithStock = await Promise.all(
        (data || []).map(async (product) => {
          const totalStock = await calculateTotalProductStock(product.id);
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            is_featured: product.is_featured,
            image_url: product.image_url,
            stock_quantity: totalStock,
            has_color_variants: product.has_color_variants,
            color_has_size_variants: product.color_has_size_variants
          } as Product;
        })
      );

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (product: Product) => {
    return product.selling_price || subcategory?.selling_price || 0;
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
        {subcategory && (
          <div className="mb-8">
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>{subcategory.categories?.name}</span>
              <span className="mx-2">›</span>
              <span className="font-medium text-gray-900">{subcategory.name}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{subcategory.name}</h1>
            {subcategory.description && (
              <p className="text-gray-600 mt-2">{subcategory.description}</p>
            )}
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-500">Check back later for new products in this category!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg font-semibold">{product.name}</CardTitle>
                    {product.is_featured && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  {product.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
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
        )}
      </div>
      <Footer />
    </div>
  );
}
