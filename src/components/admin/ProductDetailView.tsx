
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductDetailViewProps {
  productId: string;
  onEdit: () => void;
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price?: number;
  category_id: string;
  subcategory_id: string;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  status: 'active' | 'inactive';
  image_url?: string;
  created_at: string;
  updated_at: string;
  categories: { name: string };
  subcategories: { name: string };
}

interface ColorVariant {
  id: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

interface SizeVariant {
  id: string;
  size_name: string;
  size_code?: string;
}

export function ProductDetailView({ productId, onEdit, onBack }: ProductDetailViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);

      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          categories!inner(name),
          subcategories!inner(name)
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch color variants if product has them
      if (productData.has_color_variants) {
        const { data: colors, error: colorError } = await supabase
          .from('color_variants')
          .select('*')
          .eq('product_id', productId);

        if (colorError) throw colorError;

        const variants: ColorVariant[] = [];
        
        for (const color of colors || []) {
          const { data: sizes, error: sizeError } = await supabase
            .from('size_variants')
            .select('*')
            .eq('color_variant_id', color.id);

          if (sizeError) throw sizeError;

          variants.push({
            id: color.id,
            color_name: color.color_name,
            image_url: color.image_url,
            has_sizes: color.has_sizes || false,
            size_variants: sizes || []
          });
        }

        setColorVariants(variants);
      }

    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch product details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading product details...</div>;
  }

  if (!product) {
    return <div className="text-center p-8">Product not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">{product.name}</h2>
        </div>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.image_url && (
              <div className="mb-4">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full max-w-sm h-48 object-cover rounded-lg border"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Name:</strong> {product.name}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                  {product.status}
                </Badge>
              </div>
              <div>
                <strong>Category:</strong> {product.categories.name}
              </div>
              <div>
                <strong>Subcategory:</strong> {product.subcategories.name}
              </div>
              <div>
                <strong>Cost Price:</strong> Rs. {product.cost_price}
              </div>
              <div>
                <strong>Selling Price:</strong> Rs. {product.selling_price || 'Not set'}
              </div>
              <div>
                <strong>Featured:</strong> {product.is_featured ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Has Colors:</strong> {product.has_color_variants ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Has Sizes:</strong> {product.color_has_size_variants ? 'Yes' : 'No'}
              </div>
            </div>

            {product.description && (
              <div>
                <strong>Description:</strong>
                <p className="mt-1 text-gray-600">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Created:</strong> {new Date(product.created_at).toLocaleDateString()}</p>
              <p><strong>Updated:</strong> {new Date(product.updated_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {product.has_color_variants && colorVariants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Color Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {colorVariants.map((variant) => (
                <div key={variant.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{variant.color_name}</h4>
                    {variant.image_url && (
                      <img
                        src={variant.image_url}
                        alt={variant.color_name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </div>

                  {variant.has_sizes && variant.size_variants.length > 0 && (
                    <div>
                      <strong>Sizes:</strong>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {variant.size_variants.map((size) => (
                          <Badge key={size.id} variant="secondary">
                            {size.size_name} {size.size_code && `(${size.size_code})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
