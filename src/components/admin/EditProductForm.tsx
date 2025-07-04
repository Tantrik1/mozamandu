
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, X } from 'lucide-react';
import { ProductEditBlockedModal } from './ProductEditBlockedModal';
import { validateProductEditability } from '@/utils/productEditValidation';
import { ProductVariantForm } from './ProductVariantForm';

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

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
  stock_quantity: number;
}

interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  stock_quantity?: number;
  size_variants: SizeVariant[];
}

interface EditProductFormProps {
  productId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EditProductForm({ productId, onSave, onCancel }: EditProductFormProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [editBlockedModal, setEditBlockedModal] = useState<{
    isOpen: boolean;
    reason: string;
    pendingOrdersCount?: number;
  }>({
    isOpen: false,
    reason: '',
    pendingOrdersCount: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost_price: '',
    selling_price: '',
    category_id: '',
    subcategory_id: '',
    image_url: '',
    is_featured: false,
    has_color_variants: false,
    color_has_size_variants: false,
    stock_quantity: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchSubcategories();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      if (data) {
        setProduct(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          cost_price: data.cost_price?.toString() || '',
          selling_price: data.selling_price?.toString() || '',
          category_id: data.category_id || '',
          subcategory_id: data.subcategory_id || '',
          image_url: data.image_url || '',
          is_featured: data.is_featured || false,
          has_color_variants: data.has_color_variants || false,
          color_has_size_variants: data.color_has_size_variants || false,
          stock_quantity: data.stock_quantity?.toString() || '',
          status: data.status || 'active'
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch product details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

  const filteredSubcategories = subcategories.filter(
    sub => sub.category_id === formData.category_id
  );

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'category_id') {
      setFormData(prev => ({
        ...prev,
        subcategory_id: ''
      }));
    }
  };

  const handleVariantsChange = (variants: ColorVariant[]) => {
    setColorVariants(variants);
  };

  const saveVariants = async (newProductId: string) => {
    if (!formData.has_color_variants && !formData.color_has_size_variants) {
      return;
    }

    // Delete existing variants first
    await supabase.from('size_variants').delete().in('color_variant_id', 
      await supabase.from('color_variants').select('id').eq('product_id', newProductId).then(res => 
        res.data?.map(cv => cv.id) || []
      )
    );
    await supabase.from('color_variants').delete().eq('product_id', newProductId);

    // Save new variants
    for (const colorVariant of colorVariants) {
      const { data: savedColorVariant, error: colorError } = await supabase
        .from('color_variants')
        .insert({
          product_id: newProductId,
          color_name: colorVariant.color_name,
          image_url: colorVariant.image_url,
          has_sizes: formData.color_has_size_variants,
          stock_quantity: formData.color_has_size_variants ? 0 : (colorVariant.stock_quantity || 0)
        })
        .select()
        .single();

      if (colorError) throw colorError;

      if (formData.color_has_size_variants && colorVariant.size_variants?.length > 0) {
        const sizeVariantsToInsert = colorVariant.size_variants.map(sizeVariant => ({
          color_variant_id: savedColorVariant.id,
          size_name: sizeVariant.size_name,
          size_code: sizeVariant.size_code,
          stock_quantity: sizeVariant.stock_quantity
        }));

        const { error: sizeError } = await supabase
          .from('size_variants')
          .insert(sizeVariantsToInsert);

        if (sizeError) throw sizeError;
      }
    }
  };

  const handleSave = async () => {
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

    try {
      setSaving(true);

      const updateData = {
        name: formData.name,
        description: formData.description,
        cost_price: parseFloat(formData.cost_price),
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        image_url: formData.image_url,
        is_featured: formData.is_featured,
        has_color_variants: formData.has_color_variants,
        color_has_size_variants: formData.color_has_size_variants,
        stock_quantity: (!formData.has_color_variants && !formData.color_has_size_variants) ? 
          (formData.stock_quantity ? parseInt(formData.stock_quantity) : null) : null,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (error) throw error;

      // Save variants if they exist
      if (formData.has_color_variants || formData.color_has_size_variants) {
        await saveVariants(productId);
      }

      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });

      onSave();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const closeEditBlockedModal = () => {
    setEditBlockedModal({
      isOpen: false,
      reason: '',
      pendingOrdersCount: 0
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading product...</div>;
  }

  if (!product) {
    return <div className="flex justify-center p-8">Product not found.</div>;
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h2 className="text-2xl font-bold">Edit Product</h2>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Name */}
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Category and Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  className="w-full border rounded px-3 py-2"
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="subcategory">Subcategory *</Label>
                <select
                  id="subcategory"
                  className="w-full border rounded px-3 py-2"
                  value={formData.subcategory_id}
                  onChange={(e) => handleInputChange('subcategory_id', e.target.value)}
                  required
                  disabled={!formData.category_id}
                >
                  <option value="">Select Subcategory</option>
                  {filteredSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost_price">Cost Price *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => handleInputChange('selling_price', e.target.value)}
                />
              </div>
            </div>

            {/* Product Image */}
            <div>
              <Label htmlFor="image_url">Product Image</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                placeholder="Enter image URL"
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img 
                    src={formData.image_url} 
                    alt="Product preview"
                    className="w-32 h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            {/* Stock Quantity (only if no variants) */}
            {!formData.has_color_variants && !formData.color_has_size_variants && (
              <div>
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                />
              </div>
            )}

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_featured">Featured Product</Label>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleInputChange('is_featured', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="has_color_variants">Has Color Variants</Label>
                <Switch
                  id="has_color_variants"
                  checked={formData.has_color_variants}
                  onCheckedChange={(checked) => {
                    handleInputChange('has_color_variants', checked);
                    if (!checked) {
                      setColorVariants([]);
                    }
                  }}
                />
              </div>

              {formData.has_color_variants && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="color_has_size_variants">Color Variants Have Sizes</Label>
                  <Switch
                    id="color_has_size_variants"
                    checked={formData.color_has_size_variants}
                    onCheckedChange={(checked) => handleInputChange('color_has_size_variants', checked)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="status">Active Status</Label>
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => handleInputChange('status', checked ? 'active' : 'inactive')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Variants Section */}
        {(formData.has_color_variants || formData.color_has_size_variants) && (
          <ProductVariantForm
            productId={productId}
            hasColorVariants={formData.has_color_variants}
            hasSizeVariants={formData.color_has_size_variants}
            onVariantsChange={handleVariantsChange}
          />
        )}
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
