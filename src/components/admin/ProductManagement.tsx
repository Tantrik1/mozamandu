import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CreateProductForm } from './CreateProductForm';
import { EditProductForm } from './EditProductForm';
import { ProductDetailView } from './ProductDetailView';
import { ProductFilters, ProductFilters as ProductFiltersType } from './ProductFilters';
import { Pencil, Trash2, Plus, Package, Eye } from 'lucide-react';
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
  stock_quantity: number | null;
  status: 'active' | 'inactive';
  categories: { name: string } | null;
  subcategories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [productStocks, setProductStocks] = useState<Record<string, number>>({});
  const [stockLoading, setStockLoading] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<ProductFiltersType>({
    search: '',
    category: '',
    subcategory: '',
    status: '',
    priceMin: '',
    priceMax: '',
    stockMin: '',
    stockMax: '',
    featured: '',
    hasVariants: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSubcategories();
  }, [filters]);

  useEffect(() => {
    if (products.length > 0) {
      calculateProductStocks();
    }
  }, [products]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('status', 'on')
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name, category_id')
      .eq('status', 'on')
      .order('name');
    
    if (!error && data) {
      setSubcategories(data);
    }
  };

  const buildQuery = () => {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories(name),
        subcategories(name)
      `);

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    if (filters.category) {
      query = query.eq('category_id', filters.category);
    }
    
    if (filters.subcategory) {
      query = query.eq('subcategory_id', filters.subcategory);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status as 'active' | 'inactive');
    }
    
    if (filters.featured === 'true') {
      query = query.eq('is_featured', true);
    } else if (filters.featured === 'false') {
      query = query.eq('is_featured', false);
    }
    
    if (filters.hasVariants === 'true') {
      query = query.or('has_color_variants.eq.true,color_has_size_variants.eq.true');
    } else if (filters.hasVariants === 'false') {
      query = query.eq('has_color_variants', false).eq('color_has_size_variants', false);
    }
    
    if (filters.priceMin) {
      query = query.gte('selling_price', parseFloat(filters.priceMin));
    }
    
    if (filters.priceMax) {
      query = query.lte('selling_price', parseFloat(filters.priceMax));
    }
    
    if (filters.stockMin) {
      query = query.gte('stock_quantity', parseInt(filters.stockMin));
    }
    
    if (filters.stockMax) {
      query = query.lte('stock_quantity', parseInt(filters.stockMax));
    }

    // Apply sorting
    const ascending = filters.sortOrder === 'asc';
    query = query.order(filters.sortBy, { ascending });

    return query;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const query = buildQuery();
      const { data, error } = await query;

      if (error) throw error;
      
      // Map the data to ensure proper typing
      const mappedProducts: Product[] = (data || []).map(product => ({
        ...product,
        color_has_size_variants: product.color_has_size_variants || false
      }));
      
      setProducts(mappedProducts);
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
    console.log('Calculating stocks for', products.length, 'products');
    const stocks: Record<string, number> = {};
    const loadingStates: Record<string, boolean> = {};
    
    // Set loading states
    products.forEach(product => {
      loadingStates[product.id] = true;
    });
    setStockLoading(loadingStates);
    
    for (const product of products) {
      try {
        console.log(`Calculating stock for product: ${product.name} (${product.id})`);
        const stock = await getProductStockSummary(product.id);
        stocks[product.id] = stock;
        console.log(`Stock calculated for ${product.name}: ${stock}`);
        
        // Update loading state for this product
        setStockLoading(prev => ({ ...prev, [product.id]: false }));
      } catch (error) {
        console.error('Error calculating stock for product:', product.id, error);
        stocks[product.id] = product.stock_quantity || 0;
        setStockLoading(prev => ({ ...prev, [product.id]: false }));
      }
    }
    
    console.log('Final stock calculations:', stocks);
    setProductStocks(stocks);
  };

  const handleView = (productId: string) => {
    setViewingProductId(productId);
  };

  const handleEdit = (productId: string) => {
    setEditingProductId(productId);
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
        <div>
          <h2 className="text-2xl font-bold">Product Management</h2>
          <p className="text-gray-600">Manage your product catalog with advanced filtering</p>
        </div>
        <Button onClick={() => setIsCreateFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <ProductFilters
        onFiltersChange={setFilters}
        categories={categories}
        subcategories={subcategories}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid gap-4">
        {products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No products found matching your filters</p>
          </div>
        ) : (
          products.map((product) => (
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
                            {stockLoading[product.id] ? (
                              <span className="animate-pulse">Calculating...</span>
                            ) : (
                              productStocks[product.id] !== undefined ? productStocks[product.id] : 'Unknown'
                            )}
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
    </div>
  );
}
