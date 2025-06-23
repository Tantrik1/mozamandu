
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Trash2, Package, Palette, Ruler } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  category_id: string;
  subcategory_id: string;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  has_size_variants: boolean;
  stock_quantity: number | null;
  status: 'active' | 'inactive';
  categories: { name: string } | null;
  subcategories: { name: string } | null;
}

interface ColorVariant {
  id: string;
  color_name: string;
  image_url: string | null;
  stock_quantity: number;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

interface SizeVariant {
  id: string;
  size_name: string;
  size_code: string | null;
  stock_quantity: number;
}

interface ProductDetailViewProps {
  productId: string;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function ProductDetailView({ productId, onEdit, onDelete, onBack }: ProductDetailViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStock, setTotalStock] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch product data
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch color variants if product has them
      if (productData.has_color_variants) {
        const { data: colorData, error: colorError } = await supabase
          .from('color_variants')
          .select('*')
          .eq('product_id', productId)
          .order('color_name');

        if (colorError) throw colorError;

        // Fetch size variants for each color variant
        const colorVariantsWithSizes = await Promise.all(
          (colorData || []).map(async (colorVariant) => {
            let sizeVariants: SizeVariant[] = [];
            
            if (productData.has_size_variants && colorVariant.has_sizes) {
              const { data: sizeData, error: sizeError } = await supabase
                .from('size_variants')
                .select('*')
                .eq('color_variant_id', colorVariant.id)
                .order('size_name');

              if (sizeError) throw sizeError;
              sizeVariants = sizeData || [];
            }

            return {
              ...colorVariant,
              size_variants: sizeVariants
            };
          })
        );

        setColorVariants(colorVariantsWithSizes);
      }

      // Calculate total stock
      calculateTotalStock(productData);
      
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

  const calculateTotalStock = async (productData: Product) => {
    try {
      const { data: stockData, error } = await supabase
        .rpc('calculate_product_stock', { product_uuid: productData.id });
      
      if (error) throw error;
      setTotalStock(stockData || 0);
    } catch (error) {
      console.error('Error calculating stock:', error);
      setTotalStock(productData.stock_quantity || 0);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      
      onDelete();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading product details...</div>;
  }

  if (!product) {
    return <div className="text-center py-8">Product not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                {product.status}
              </Badge>
              {product.is_featured && (
                <Badge variant="outline">Featured</Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={onEdit} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
          <Button onClick={handleDelete} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Image */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
            </CardHeader>
            <CardContent>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-64 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg border flex items-center justify-center">
                  <Package className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Product Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-600">Category</h4>
                  <p className="text-lg">{product.categories?.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-600">Subcategory</h4>
                  <p className="text-lg">{product.subcategories?.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-600">Cost Price</h4>
                  <p className="text-lg font-semibold">Rs {product.cost_price}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-600">Selling Price</h4>
                  <p className="text-lg font-semibold">
                    {product.selling_price ? `Rs ${product.selling_price}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-600">Total Stock</h4>
                  <p className="text-lg font-semibold">{totalStock}</p>
                </div>
              </div>
              
              {product.description && (
                <div>
                  <h4 className="font-medium text-gray-600 mb-2">Description</h4>
                  <p className="text-gray-800">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variant Information */}
          {(product.has_color_variants || product.has_size_variants) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Product Variants</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  {product.has_color_variants && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Palette className="h-3 w-3" />
                      <span>Color Variants</span>
                    </Badge>
                  )}
                  {product.has_size_variants && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Ruler className="h-3 w-3" />
                      <span>Size Variants</span>
                    </Badge>
                  )}
                </div>

                {product.has_color_variants && colorVariants.length > 0 && (
                  <div className="space-y-4">
                    {colorVariants.map((colorVariant) => (
                      <div key={colorVariant.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-lg">{colorVariant.color_name}</h4>
                            {!product.has_size_variants && (
                              <Badge variant="secondary">
                                Stock: {colorVariant.stock_quantity}
                              </Badge>
                            )}
                          </div>
                          {colorVariant.image_url && (
                            <img
                              src={colorVariant.image_url}
                              alt={colorVariant.color_name}
                              className="w-12 h-12 object-cover rounded border"
                            />
                          )}
                        </div>

                        {product.has_size_variants && colorVariant.has_sizes && colorVariant.size_variants.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-600 mb-2">Size Variants:</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {colorVariant.size_variants.map((sizeVariant) => (
                                <div key={sizeVariant.id} className="bg-gray-50 p-2 rounded border">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{sizeVariant.size_name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {sizeVariant.stock_quantity}
                                    </Badge>
                                  </div>
                                  {sizeVariant.size_code && (
                                    <div className="text-xs text-gray-500">
                                      Code: {sizeVariant.size_code}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {product.has_color_variants && colorVariants.length === 0 && (
                  <p className="text-gray-500">No color variants found</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
