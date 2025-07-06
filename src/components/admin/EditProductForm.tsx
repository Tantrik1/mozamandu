import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Save, ArrowLeft, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SmartProductVariantForm } from './SmartProductVariantForm';
import { InventoryVariantForm } from './InventoryVariantForm';
import { Product, ColorVariant, InventoryItem, InventorySummary } from '@/types/admin';

interface EditProductFormProps {
  productId: string;
  onSave: () => void;
  onCancel: () => void;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  selling_price: number;
}

export function EditProductForm({ productId, onSave, onCancel }: EditProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({
    total_stock: 0,
    available_stock: 0,
    reserved_stock: 0,
    variant_count: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost_price: 0,
    selling_price: 0,
    category_id: '',
    subcategory_id: '',
    is_featured: false,
    has_color_variants: false,
    color_has_size_variants: false,
    status: 'active' as 'active' | 'inactive',
    image_url: '',
  });

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchSubcategories();
  }, [productId]);

  useEffect(() => {
    if (formData.category_id) {
      const filtered = subcategories.filter(sub => sub.id === formData.category_id);
      setFilteredSubcategories(filtered);
    }
  }, [formData.category_id, subcategories]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name || '',
        description: data.description || '',
        cost_price: data.cost_price || 0,
        selling_price: data.selling_price || 0,
        category_id: data.category_id || '',
        subcategory_id: data.subcategory_id || '',
        is_featured: data.is_featured || false,
        has_color_variants: data.has_color_variants || false,
        color_has_size_variants: data.color_has_size_variants || false,
        status: data.status || 'active',
        image_url: data.image_url || '',
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch product data',
        variant: 'destructive',
      });
    }
  };

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
        .select('id, name, selling_price, category_id')
        .eq('status', 'on')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFile = event.target.files?.[0];
    if (!uploadFile) return;

    setUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `product-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update product
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description,
          cost_price: formData.cost_price,
          selling_price: formData.selling_price || null,
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id,
          is_featured: formData.is_featured,
          has_color_variants: formData.has_color_variants,
          color_has_size_variants: formData.color_has_size_variants,
          status: formData.status,
          image_url: formData.image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (productError) throw productError;

      // Handle variants if they exist
      if (formData.has_color_variants && colorVariants.length > 0) {
        // Delete existing variants
        await supabase.from('color_variants').delete().eq('product_id', productId);
        await supabase.from('size_variants').delete().in('color_variant_id', 
          colorVariants.map(v => v.id).filter(Boolean)
        );

        // Create new variants
        for (const variant of colorVariants) {
          const { data: colorVariant, error: colorError } = await supabase
            .from('color_variants')
            .insert({
              product_id: productId,
              color_name: variant.color_name,
              image_url: variant.image_url,
              has_sizes: variant.has_sizes,
            })
            .select()
            .single();

          if (colorError) throw colorError;

          // Create size variants if they exist
          if (variant.has_sizes && variant.size_variants.length > 0) {
            for (const sizeVariant of variant.size_variants) {
              const { error: sizeError } = await supabase
                .from('size_variants')
                .insert({
                  color_variant_id: colorVariant.id,
                  size_name: sizeVariant.size_name,
                  size_code: sizeVariant.size_code,
                });

              if (sizeError) throw sizeError;
            }
          }
        }
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
      setLoading(false);
    }
  };

  const handleInventoryChange = (summary: InventorySummary) => {
    setInventorySummary(summary);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
          <p className="text-gray-600">Update product information and manage variants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'active' | 'inactive') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
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
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost_price">Cost Price *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="selling_price">Selling Price (Optional)</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, selling_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
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
                <Label htmlFor="subcategory">Subcategory *</Label>
                <Select 
                  value={formData.subcategory_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory_id: value }))}
                  disabled={!formData.category_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name} - Rs. {subcategory.selling_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: !!checked }))}
              />
              <Label htmlFor="is_featured">Featured Product</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_color_variants"
                  checked={formData.has_color_variants}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    has_color_variants: !!checked,
                    color_has_size_variants: !!checked ? prev.color_has_size_variants : false
                  }))}
                />
                <Label htmlFor="has_color_variants">Has Color Variants</Label>
              </div>
              {formData.has_color_variants && (
                <div className="flex items-center space-x-2 ml-6">
                  <Checkbox
                    id="color_has_size_variants"
                    checked={formData.color_has_size_variants}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, color_has_size_variants: !!checked }))}
                  />
                  <Label htmlFor="color_has_size_variants">Color variants have sizes</Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Image */}
        <Card>
          <CardHeader>
            <CardTitle>Product Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="image">Upload Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>
            {formData.image_url && (
              <div>
                <Label>Current Image</Label>
                <img
                  src={formData.image_url}
                  alt="Product preview"
                  className="mt-2 w-32 h-32 object-cover rounded border"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Variants */}
        {formData.has_color_variants && (
          <SmartProductVariantForm
            productId={productId}
            hasColorVariants={formData.has_color_variants}
            hasSizeVariants={formData.color_has_size_variants}
            onVariantsChange={setColorVariants}
          />
        )}

        {/* Inventory Management */}
        <InventoryVariantForm
          productId={productId}
          productName={formData.name}
          hasColorVariants={formData.has_color_variants}
          hasSizeVariants={formData.color_has_size_variants}
          costPrice={formData.cost_price}
          sellingPrice={formData.selling_price}
          onInventoryChange={handleInventoryChange}
        />
      </form>
    </div>
  );
}
