import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedProductCard } from '@/components/customer/AdvancedProductCard';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';

interface ProductVariant {
  id: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: {
    id: string;
    size_name: string;
    size_code?: string;
  }[];
}

interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price?: number;
  image_url?: string;
  status: string;
  subcategory_id: string;
  is_featured?: boolean;
  has_color_variants?: boolean;
  color_has_size_variants?: boolean;
  subcategories: {
    name: string;
    selling_price: number;
    minimum_quantity: number;
  };
  color_variants?: ProductVariant[];
}

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
      fetchSubcategoryAndProducts();
    }
  }, [subcategoryId]);

  const fetchSubcategoryAndProducts = async () => {
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
        setLoading(false);
        return;
      }

      setSubcategory(subcategoryData);

      // Fetch products for the subcategory
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          cost_price,
          selling_price,
          image_url,
          status,
          subcategory_id,
          is_featured,
          has_color_variants,
          color_has_size_variants,
          subcategories!products_subcategory_id_fkey (
            name,
            selling_price,
            minimum_quantity
          )
        `)
        .eq('subcategory_id', subcategoryId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }

      if (!productsData || productsData.length === 0) {
        console.log('No products found in this subcategory');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get variants for products
      const productsWithVariants = [];
      
      for (const product of productsData) {
        let productWithVariants = { ...product, color_variants: [] };

        if (product.has_color_variants) {
          const { data: colorVariants, error: colorError } = await supabase
            .from('color_variants')
            .select(`
              id,
              color_name,
              image_url,
              has_sizes
            `)
            .eq('product_id', product.id);

          if (colorError) {
            console.error('Error fetching color variants:', colorError);
          } else if (colorVariants) {
            for (const colorVariant of colorVariants) {
              let colorWithSizes = { ...colorVariant, size_variants: [] };

              if (colorVariant.has_sizes) {
                const { data: sizeVariants, error: sizeError } = await supabase
                  .from('size_variants')
                  .select(`
                    id,
                    size_name,
                    size_code
                  `)
                  .eq('color_variant_id', colorVariant.id);

                if (sizeError) {
                  console.error('Error fetching size variants:', sizeError);
                } else if (sizeVariants) {
                  colorWithSizes.size_variants = sizeVariants;
                }
              }

              productWithVariants.color_variants.push(colorWithSizes);
            }
          }
        }

        productsWithVariants.push(productWithVariants);
      }

      console.log('Products with variants processed:', productsWithVariants.length);
      setProducts(productsWithVariants);
    } catch (error) {
      console.error('Error fetching subcategory and products:', error);
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
