import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CreateProductForm } from './CreateProductForm';
import { EditProductForm } from './EditProductForm';
import { ProductDetailView } from './ProductDetailView';
import { ProductDeletionDialog } from './ProductDeletionDialog';
import { Pencil, Trash2, Plus, Search, Package, Eye, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  color_has_size_variants: boolean;
  status: 'active' | 'inactive';
  categories: { name: string } | null;
  subcategories: { name: string } | null;
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [productStocks, setProductStocks] = useState<Record<string, number>>({});
  const [deletingProduct, setDeletingProduct] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      calculateProductStocks();
    }
  }, [products]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('status', 'on')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, category_id')
        .eq('status', 'on')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

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
        stocks[product.id] = 0;
      }
    }
    
    setProductStocks(stocks);
  };

  const handleView = (productId: string) => {
    setViewingProductId(productId);
  };

  const handleEdit = (productId: string) => {
    setEditingProductId(productId);
  };

  const handleDelete = (productId: string, productName: string) => {
    setDeletingProduct({ id: productId, name: productName });
  };

  const handleDeleteConfirm = () => {
    fetchProducts();
    setDeletingProduct(null);
  };

  const handleDeleteCancel = () => {
    setDeletingProduct(null);
  };

  const handleCreateSave = () => {
    setIsCreateFormOpen(false);
    fetchProducts();
  };

  const handleCreateCancel = () => {
    setIsCreateFormOpen(false);
  };

  const handleEditSave = () => {
    setEditingProductId(null);
    fetchProducts();
  };

  const handleEditCancel = () => {
    setEditingProductId(null);
  };

  const handleDetailViewEdit = () => {
    if (viewingProductId) {
      setEditingProductId(viewingProductId);
      setViewingProductId(null);
    }
  };

  const handleDetailViewDelete = () => {
    setViewingProductId(null);
    fetchProducts();
  };

  const handleDetailViewBack = () => {
    setViewingProductId(null);
  };

  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.subcategories?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || product.category_id === categoryFilter;
    
    // Subcategory filter
    const matchesSubcategory = !subcategoryFilter || subcategoryFilter === 'all' || product.subcategory_id === subcategoryFilter;
    
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

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

  if (isCreateFormOpen) {
    return (
      <CreateProductForm
        onSave={handleCreateSave}
        onCancel={handleCreateCancel}
      />
    );
  }

  if (editingProductId) {
    return (
      <EditProductForm
        productId={editingProductId}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <Button onClick={() => setIsCreateFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center space-x-4 flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={subcategoryFilter} 
            onValueChange={setSubcategoryFilter}
            disabled={!categoryFilter}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Subcategories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              {subcategories
                .filter(sub => !categoryFilter || categoryFilter === 'all' || sub.category_id === categoryFilter)
                .map((subcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          {(categoryFilter && categoryFilter !== 'all') || (subcategoryFilter && subcategoryFilter !== 'all') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setCategoryFilter('all');
                setSubcategoryFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
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
                          {(product.has_color_variants || product.color_has_size_variants) && (
                            <span className="text-xs text-gray-500 ml-2">
                              (Calculated from variants)
                            </span>
                          )}
                        </p>
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

      <ProductDeletionDialog
        isOpen={!!deletingProduct}
        onClose={handleDeleteCancel}
        productId={deletingProduct?.id || ''}
        productName={deletingProduct?.name || ''}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
