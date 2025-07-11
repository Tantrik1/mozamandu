
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
}

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  image_url: string | null;
  categories: {
    name: string;
  } | null;
}

export default function SubcategoryPage() {
  const { subcategoryId } = useParams<{ subcategoryId: string }>();
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      fetchSubcategoryAndProducts();
    }
  }, [subcategoryId]);

  const fetchSubcategoryAndProducts = async () => {
    if (!subcategoryId) return;

    try {
      // First fetch subcategory details
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select(`
          *,
          categories(name)
        `)
        .eq('id', subcategoryId)
        .eq('status', 'on')
        .single();

      if (subcategoryError) throw subcategoryError;
      setSubcategory(subcategoryData);

      // Then fetch products in this subcategory
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      if (productsData) {
        // Calculate stock for each product
        const productsWithStock = await Promise.all(
          productsData.map(async (product) => {
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
      console.error('Error fetching subcategory and products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Subcategory not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-4">
          <Badge variant="outline" className="mb-2">
            {subcategory.categories?.name}
          </Badge>
          <h1 className="text-3xl font-bold">{subcategory.name}</h1>
          {subcategory.description && (
            <p className="text-gray-600 mt-2">{subcategory.description}</p>
          )}
        </div>

        {subcategory.image_url && (
          <div className="mb-6">
            <img
              src={subcategory.image_url}
              alt={subcategory.name}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {products.length > 0 && (
          <Badge variant="outline" className="text-sm">
            {products.length} product{products.length !== 1 ? 's' : ''} available
          </Badge>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              subcategorySellingPrice={subcategory.selling_price}
            />
          ))}
        </div>
      )}
    </div>
  );
}
