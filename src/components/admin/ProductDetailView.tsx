import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Package, DollarSign, Calendar, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getProductStockSummary } from '@/utils/inventoryManager';

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
  status: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  categories: {
    id: string;
    name: string;
  };
  subcategories: {
    id: string;
    name: string;
  };
}

interface ProductDetailViewProps {
  productId: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: (productId: string) => void;
}

export function ProductDetailView({ productId, onEdit, onBack, onDelete }: ProductDetailViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [stockSummary, setStockSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductData();
  }, [productId]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      
      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          categories (id, name),
          subcategories (id, name)
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch stock summary
      const summary = await getProductStockSummary(productId);
      setStockSummary(summary);

    } catch (error) {
      console.error('Error fetching product data:', error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading product details...</div>;
  }

  if (!product) {
    return <div className="text-center py-8">Product not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(productId)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Product
          </Button>
        </div>
      </div>

      {/* Product Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image */}
            {product.image_url && (
              <div className="md:col-span-1">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-auto rounded-md object-cover"
                />
              </div>
            )}

            {/* Details */}
            <div className="md:col-span-1 space-y-3">
              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Description</h4>
                <p className="text-gray-600">{product.description || 'No description available'}</p>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Category</h4>
                <p className="text-gray-600">{product.categories?.name}</p>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Subcategory</h4>
                <p className="text-gray-600">{product.subcategories?.name}</p>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Pricing</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span>Cost Price:</span>
                    <Badge variant="secondary">${product.cost_price}</Badge>
                  </div>
                  {product.selling_price && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>Selling Price:</span>
                      <Badge variant="default">${product.selling_price}</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Stock Summary</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span>Total Stock:</span>
                    <Badge variant="outline">{stockSummary?.totalStock || 0} units</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Status</h4>
                {product.status === 'active' ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Additional Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Created At:</span>
                    <Badge variant="ghost">
                      {new Date(product.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Updated At:</span>
                    <Badge variant="ghost">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <span>Featured:</span>
                    <Badge variant="ghost">{product.is_featured ? 'Yes' : 'No'}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
