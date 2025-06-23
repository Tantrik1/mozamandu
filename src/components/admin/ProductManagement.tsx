
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { EnhancedProductForm } from './EnhancedProductForm';
import { ProductDetailView } from './ProductDetailView';
import { Pencil, Trash2, Plus, Search, Package, Eye } from 'lucide-react';
import { getProductStockSummary } from '@/utils/stockCalculation';

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

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [productStocks, setProductStocks] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      calculateProductStocks();
    }
  }, [products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProductStocks = async () => {
    const stocks: Record<string, number> = {};
    
    for (const product of products) {
      try {
        const stock = await getProductStockSummary(product.id);
        stocks[product.id] = stock;
      } catch (error) {
        console.error('Error calculating stock for product:', product.id, error);
        stocks[product.id] = product.stock_quantity || 0;
      }
    }
    
    setProductStocks(stocks);
  };

  const handleView = (productId: string) => {
    setViewingProductId(productId);
  };

  const handleEdit = (productId: string) => {
    setEditingProductId(productId);
    setIsFormOpen(true);
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
      
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handleFormSave = () => {
    setIsFormOpen(false);
    setEditingProductId(null);
    fetchProducts();
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProductId(null);
  };

  const handleDetailViewEdit = () => {
    if (viewingProductId) {
      setEditingProductId(viewingProductId);
      setViewingProductId(null);
      setIsFormOpen(true);
    }
  };

  const handleDetailViewDelete = () => {
    setViewingProductId(null);
    fetchProducts();
  };

  const handleDetailViewBack = () => {
    setViewingProductId(null);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.subcategories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading products...</div>;
  }

  if (viewingProductId) {
    return (
      <ProductDetailView
        productId={viewingProductId}
        onEdit={handleDetailViewEdit}
        onDelete={handleDetailViewDelete}
        onBack={handleDetailViewBack}
      />
    );
  }

  if (isFormOpen) {
    return (
      <EnhancedProductForm
        productId={editingProductId || undefined}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex space-x-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">{product.name}</h3>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                        {product.is_featured && (
                          <Badge variant="outline">Featured</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Category:</span> {product.categories?.name}
                          {' > '}
                          <span className="font-medium">Subcategory:</span> {product.subcategories?.name}
                        </p>
                        <p>
                          <span className="font-medium">Cost Price:</span> Rs {product.cost_price}
                          {product.selling_price && (
                            <>
                              {' | '}
                              <span className="font-medium">Selling Price:</span> Rs {product.selling_price}
                            </>
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Stock:</span> 
                          <Badge variant="outline" className="ml-2">
                            {productStocks[product.id] !== undefined ? productStocks[product.id] : 'Loading...'}
                          </Badge>
                          {(product.has_color_variants || product.has_size_variants) && (
                            <span className="text-xs text-gray-500 ml-2">
                              (Calculated from variants)
                            </span>
                          )}
                        </p>
                        {(product.has_color_variants || product.has_size_variants) && (
                          <div className="flex items-center space-x-1">
                            {product.has_color_variants && (
                              <Badge variant="outline" className="text-xs">Color Variants</Badge>
                            )}
                            {product.has_size_variants && (
                              <Badge variant="outline" className="text-xs">Size Variants</Badge>
                            )}
                          </div>
                        )}
                        {product.description && (
                          <p className="text-gray-500 mt-2 line-clamp-2">{product.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(product.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product.id, product.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
