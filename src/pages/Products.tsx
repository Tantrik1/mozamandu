
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { ProductCard } from '@/components/customer/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Footer } from '@/components/layout/Footer';

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
  categories: { name: string };
  subcategories: { name: string; selling_price: number };
}

export default function Products() {
  const { subcategoryId } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('All Products');
  const [subcategoryPrice, setSubcategoryPrice] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, [subcategoryId]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories (name),
          subcategories (name, selling_price)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // If subcategoryId is provided, filter by subcategory
      if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
        
        // Fetch subcategory details
        const { data: subcategoryData } = await supabase
          .from('subcategories')
          .select('name, selling_price')
          .eq('id', subcategoryId)
          .single();
        
        if (subcategoryData) {
          setPageTitle(`${subcategoryData.name} Products`);
          setSubcategoryPrice(subcategoryData.selling_price);
        }
      } else {
        setPageTitle('All Products');
        setSubcategoryPrice(0);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-gray-600 mt-2">Discover our latest collection of premium products</p>
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
                subcategoryPrice={subcategoryPrice || product.subcategories?.selling_price || 0}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
