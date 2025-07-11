
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { UnifiedProductCard } from '@/components/products/UnifiedProductCard';
import { fetchSubcategoryProducts, type Product } from '@/utils/productFetcher';

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  selling_price: number;
  minimum_quantity: number;
  status: string;
  category_id: string;
}

export default function SubcategoryPage() {
  const { subcategoryId } = useParams<{ subcategoryId: string }>();
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      fetchData();
    }
  }, [subcategoryId]);

  const fetchData = async () => {
    if (!subcategoryId) return;

    try {
      console.log('Fetching subcategory data for:', subcategoryId);

      // Fetch subcategory details
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('id', subcategoryId)
        .eq('status', 'on')
        .single();

      if (subcategoryError) {
        console.error('Error fetching subcategory:', subcategoryError);
        return;
      }

      console.log('Subcategory found:', subcategoryData);
      setSubcategory(subcategoryData);

      // Fetch products for this subcategory
      const productsData = await fetchSubcategoryProducts(subcategoryId);
      console.log('Products found:', productsData?.length || 0);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading products...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 mb-4">Subcategory not found</p>
              <Link to="/categories" className="inline-flex items-center text-primary hover:text-primary/80">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Categories
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/categories" className="inline-flex items-center mb-4 text-primary hover:text-primary/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Categories
          </Link>
          <h1 className="text-3xl font-bold mb-2">{subcategory.name}</h1>
          {subcategory.description && (
            <p className="text-gray-600">{subcategory.description}</p>
          )}
          <div className="flex gap-4 mt-4 text-sm text-gray-600">
            <span>Base Price: Rs. {subcategory.selling_price}</span>
            <span>Minimum Quantity: {subcategory.minimum_quantity}</span>
          </div>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No products found</p>
              <p className="text-sm text-gray-400">Products will appear here once they are added to this subcategory.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                {products.length} product{products.length !== 1 ? 's' : ''} found in {subcategory.name}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <UnifiedProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
