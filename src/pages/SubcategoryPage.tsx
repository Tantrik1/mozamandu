import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProductCard } from '@/components/customer/EnhancedProductCard';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { toast } from '@/hooks/use-toast';

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
  color_variants?: {
    id: string;
    color_name: string;
    image_url?: string;
    has_sizes: boolean;
    size_variants: {
      id: string;
      size_name: string;
      size_code?: string;
    }[];
  }[];
}

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  selling_price: number;
  minimum_quantity: number;
  status: string;
}

export default function SubcategoryPage() {
  const { subcategoryId } = useParams<{ subcategoryId: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      fetchData();
    }
  }, [subcategoryId]);

  const fetchData = async () => {
    if (!subcategoryId) return;
    
    setLoading(true);
    try {
      console.log('Fetching data for subcategory:', subcategoryId);

      // Fetch subcategory details
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*')
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

      console.log('Subcategory found:', subcategoryData);
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
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
        setProducts([]);
        return;
      }

      if (!productsData || productsData.length === 0) {
        console.log('No products found for subcategory');
        setProducts([]);
        return;
      }

      console.log('Products found:', productsData.length);

      // Get variants for products that have them
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
      console.error('Error fetching data:', error);
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
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {subcategory?.image_url && (
              <img
                src={subcategory.image_url}
                alt={subcategory.name}
                className="w-full md:w-48 h-48 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{subcategory?.name}</h1>
              {subcategory?.description && (
                <p className="text-gray-600 mb-4">{subcategory.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="font-semibold text-primary">Base Price</p>
                  <p className="text-lg">Rs. {subcategory?.selling_price.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="font-semibold text-primary">Minimum Order</p>
                  <p className="text-lg">{subcategory?.minimum_quantity} pieces</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading products...</p>
            </div>
          </div>
        ) : !subcategory ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 mb-4">Subcategory not found</p>
              <Link to="/categories" className="inline-flex items-center text-primary hover:text-primary/80">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Categories
              </Link>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No products found in this subcategory</p>
              <p className="text-sm text-gray-400">Products will appear here once they are added to this subcategory.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Showing {products.length} product{products.length !== 1 ? 's' : ''} in {subcategory.name}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <EnhancedProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
