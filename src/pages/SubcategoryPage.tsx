
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedProductCard } from '@/components/customer/AdvancedProductCard';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { fetchSubcategoryProducts, type Product } from '@/utils/productFetcher';

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

export default function SubcategoryPage() {
  const { subcategoryId } = useParams<{ subcategoryId: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      loadSubcategoryData();
    }
  }, [subcategoryId]);

  const loadSubcategoryData = async () => {
    try {
      setLoading(true);

      // Fetch subcategory details
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('id', subcategoryId)
        .single();

      if (subcategoryError) {
        console.error('Error fetching subcategory:', subcategoryError);
        throw subcategoryError;
      }

      if (!subcategoryData) {
        console.log('Subcategory not found');
        setSubcategory(null);
        setProducts([]);
        return;
      }

      setSubcategory(subcategoryData);

      // Fetch products using the unified fetcher
      const productsData = await fetchSubcategoryProducts(subcategoryId!);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading subcategory data:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      
      {/* Subcategory Header */}
      {subcategory && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {subcategory.name}
              </h1>
              {subcategory.description && (
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  {subcategory.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No products found in this category</p>
              <p className="text-sm text-gray-400">Check back later for new arrivals!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <AdvancedProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
