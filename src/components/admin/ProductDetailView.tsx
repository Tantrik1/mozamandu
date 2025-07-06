
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ArrowLeft, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProductEditBlockedModal } from './ProductEditBlockedModal';
import { validateProductEditability } from '@/utils/productEditValidation';

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
  color_has_size_variants: boolean;
  status: 'active' | 'inactive';
  categories: { name: string } | null;
  subcategories: { name: string } | null;
  // Note: stock_quantity removed - handled by inventory system
}

interface ProductDetailViewProps {
  productId: string;
  onEdit: () => void;
  onDelete: (productId: string, productName: string) => void;
  onBack: () => void;
}

export function ProductDetailView({ productId, onEdit, onDelete, onBack }: ProductDetailViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [editBlockedModal, setEditBlockedModal] = useState<{
    isOpen: boolean;
    reason: string;
    pendingOrdersCount?: number;
  }>({
    isOpen: false,
    reason: '',
    pendingOrdersCount: 0
  });

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;

      // Map the data to ensure proper typing (without stock_quantity)
      const mappedProduct: Product = {
        ...data,
        color_has_size_variants: data.color_has_size_variants || false
      };

      setProduct(mappedProduct);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch product',
        variant: 'destructive',
      });
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;

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

      onDelete(productId, productName);
      onBack();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async () => {
    // Validate if product can be edited
    const validation = await validateProductEditability(productId);
    
    if (!validation.canEdit) {
      setEditBlockedModal({
        isOpen: true,
        reason: validation.reason || 'Product cannot be edited at this time.',
        pendingOrdersCount: validation.pendingOrdersCount
      });
      return;
    }

    onEdit();
  };

  const closeEditBlockedModal = () => {
    setEditBlockedModal({
      isOpen: false,
      reason: '',
      pendingOrdersCount: 0
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading product details...</div>;
  }

  if (!product) {
    return <div className="flex justify-center p-8">Product not found.</div>;
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <div className="flex space-x-2">
            <Button onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(product.id, product.name)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Product
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-48 h-48 object-cover rounded-lg border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="space-y-2">
              <p>
                <span className="font-medium">Category:</span> {product.categories?.name}
              </p>
              <p>
                <span className="font-medium">Subcategory:</span> {product.subcategories?.name}
              </p>
              <p>
                <span className="font-medium">Cost Price:</span> Rs {product.cost_price}
              </p>
              {product.selling_price && (
                <p>
                  <span className="font-medium">Selling Price:</span> Rs {product.selling_price}
                </p>
              )}
              <p>
                <span className="font-medium">Status:</span>
                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                  {product.status}
                </Badge>
              </p>
              {product.is_featured && (
                <Badge variant="outline">Featured</Badge>
              )}
              {(product.has_color_variants || product.color_has_size_variants) && (
                <div className="flex items-center space-x-1">
                  {product.has_color_variants && (
                    <Badge variant="outline" className="text-xs">Color Variants</Badge>
                  )}
                  {product.color_has_size_variants && (
                    <Badge variant="outline" className="text-xs">Size Variants</Badge>
                  )}
                </div>
              )}
              {product.description && (
                <>
                  <p>
                    <span className="font-medium">Description:</span>
                  </p>
                  <p className="text-gray-500">{product.description}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Edit Blocked Modal */}
      <ProductEditBlockedModal
        isOpen={editBlockedModal.isOpen}
        onClose={closeEditBlockedModal}
        reason={editBlockedModal.reason}
        pendingOrdersCount={editBlockedModal.pendingOrdersCount}
      />
    </>
  );
}
