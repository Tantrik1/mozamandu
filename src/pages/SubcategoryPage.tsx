
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { ProductCard } from '@/components/customer/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Subcategory {
  id: string;
  name: string;
  description: string;
  selling_price: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  cost_price: number;
  selling_price: number;
  is_featured: boolean;
  image_url: string;
  has_color_variants: boolean;
  has_size_variants: boolean;
  stock_quantity: number;
  category_id: string;
  subcategory_id: string;
}

export default function SubcategoryPage() {
  const { subcategoryId } = useParams<{ subcategoryId: string }>();
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      fetchSubcategoryData();
    }
  }, [subcategoryId]);

  const fetchSubcategoryData = async () => {
    try {
      // Fetch subcategory details
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('id, name, description, selling_price')
        .eq('id', subcategoryId)
        .eq('status', 'on')
        .single();

      if (subcategoryError) {
        console.error('Error fetching subcategory:', subcategoryError);
        toast({
          title: "Error",
          description: "Subcategory not found",
          variant: "destructive",
        });
        return;
      }

      setSubcategory(subcategoryData);

      // Fetch products in this subcategory
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      } else {
        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Subcategory not found</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Subcategory Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{subcategory.name}</h1>
          {subcategory.description && (
            <p className="text-gray-600 mt-2 text-lg">{subcategory.description}</p>
          )}
          <div className="mt-4">
            <span className="text-2xl font-bold text-red-600">Base Price: ${subcategory.selling_price}</span>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-500">Products will appear here once they are added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product}
                subcategoryPrice={subcategory.selling_price}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
