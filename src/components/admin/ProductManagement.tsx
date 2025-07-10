import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category, Subcategory } from '@/types/product';
import { Loader2, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { InventorySetupModal } from './InventorySetupModal';
import { EditProductForm } from './EditProductForm';

interface ProductFormProps {
  onProductCreated: () => void;
}

function ProductForm({ onProductCreated }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost_price: '',
    selling_price: '',
    category_id: '',
    subcategory_id: '',
    is_featured: false,
    has_color_variants: false,
    color_has_size_variants: false,
    status: 'active' as 'active' | 'inactive',
    image_url: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
    }
  }, [formData.category_id]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('status', 'on')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .eq('status', 'on')
      .order('name');

    if (error) {
      console.error('Error fetching subcategories:', error);
    } else {
      setSubcategories(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          cost_price: parseFloat(formData.cost_price),
          selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id,
          is_featured: formData.is_featured,
          has_color_variants: formData.has_color_variants,
          color_has_size_variants: formData.color_has_size_variants,
          status: formData.status,
          image_url: formData.image_url
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product created successfully',
      });

      onProductCreated();
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to create product',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="selling_price">Selling Price (Optional)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value, subcategory_id: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory_id: value }))}
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "inactive") => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
              />
              <span>Featured Product</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.has_color_variants}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  has_color_variants: e.target.checked,
                  color_has_size_variants: e.target.checked ? prev.color_has_size_variants : false
                }))}
              />
              <span>Has Color Variants</span>
            </label>

            {formData.has_color_variants && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.color_has_size_variants}
                  onChange={(e) => setFormData(prev => ({ ...prev, color_has_size_variants: e.target.checked }))}
                />
                <span>Colors Have Sizes</span>
              </label>
            )}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showInventorySetup, setShowInventorySetup] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string | null>(null);
  const [selectedProductCostPrice, setSelectedProductCostPrice] = useState<number | null>(null);
  const [selectedProductSellingPrice, setSelectedProductSellingPrice] = useState<number | null>(null);
  const [selectedProductHasColorVariants, setSelectedProductHasColorVariants] = useState<boolean | null>(null);
  const [selectedProductColorHasSizeVariants, setSelectedProductColorHasSizeVariants] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

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
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'cost_price',
      header: 'Cost Price',
    },
    {
      accessorKey: 'selling_price',
      header: 'Selling Price',
    },
    {
      accessorKey: 'category_id',
      header: 'Category ID',
    },
    {
      accessorKey: 'subcategory_id',
      header: 'Subcategory ID',
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => showEditForm(row.original)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const showEditForm = (product: Product) => {
    setSelectedProduct(product);
    setShowEdit(true);
    setShowCreate(false);
  };

  const handleCreateSuccess = () => {
    setShowCreate(false);
    fetchProducts();
  };

  const handleInventorySetup = (product: Product) => {
    setSelectedProductId(product.id);
    setSelectedProductName(product.name);
    setSelectedProductCostPrice(product.cost_price);
    setSelectedProductSellingPrice(product.selling_price || product.cost_price * 1.5);
    setSelectedProductHasColorVariants(product.has_color_variants);
    setSelectedProductColorHasSizeVariants(product.color_has_size_variants);
    setShowInventorySetup(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Products</CardTitle>
            <Button onClick={() => { setShowCreate(true); setShowEdit(false); }}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <ProductForm onProductCreated={handleCreateSuccess} />
          )}
        </CardContent>
      </Card>

      {showEdit && selectedProduct && (
        <EditProductForm
          product={selectedProduct}
          onSave={() => {
            setShowEdit(false);
            setSelectedProduct(null);
            fetchProducts();
          }}
          onCancel={() => {
            setShowEdit(false);
            setSelectedProduct(null);
          }}
        />
      )}

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Loading products...
            </div>
          ) : (
            <DataTable columns={columns} data={products} />
          )}
        </CardContent>
      </Card>

      <InventorySetupModal
        isOpen={showInventorySetup}
        onClose={() => setShowInventorySetup(false)}
        productId={selectedProductId || ''}
        productName={selectedProductName || ''}
        costPrice={selectedProductCostPrice || 0}
        sellingPrice={selectedProductSellingPrice || 0}
        hasColorVariants={selectedProductHasColorVariants || false}
        hasSizeVariants={selectedProductColorHasSizeVariants || false}
        onComplete={() => {
          setSelectedProductId(null);
          setSelectedProductName(null);
          setSelectedProductCostPrice(null);
          setSelectedProductSellingPrice(null);
          setSelectedProductHasColorVariants(null);
          setSelectedProductColorHasSizeVariants(null);
        }}
      />
    </div>
  );
}
