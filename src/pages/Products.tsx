
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/customer/ProductCard';
import { Badge } from '@/components/ui/badge';
import { getProductStockSummary } from '@/utils/stockCalculation';

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  stock_quantity: number;
  categories: {
    name: string;
  } | null;
  subcategories: {
    name: string;
    selling_price: number;
  } | null;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('category');

  useEffect(() => {
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name, selling_price)
        `)
        .eq('status', 'active');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Calculate stock for each product
        const productsWithStock = await Promise.all(
          data.map(async (product) => {
            try {
              const stock = await getProductStockSummary(product.id);
              return {
                ...product,
                stock_quantity: stock,
              };
            } catch (error) {
              console.error('Error calculating stock for product:', product.id, error);
              return {
                ...product,
                stock_quantity: 0,
              };
            }
          })
        );
        setProducts(productsWithStock);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-lg">Loading products...</div>
        </div>
      </div>
    );
  }

  const categoryName = products[0]?.categories?.name;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {categoryName ? `${categoryName} Products` : 'All Products'}
        </h1>
        {products.length > 0 && (
          <Badge variant="outline" className="text-sm">
            {products.length} product{products.length !== 1 ? 's' : ''} found
          </Badge>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              subcategorySellingPrice={product.subcategories?.selling_price || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
