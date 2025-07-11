
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Plus, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  stock_quantity: number;
  has_sizes: boolean;
  sizes: SizeVariant[];
}

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
  stock_quantity: number;
}

interface ProductFormProps {
  productId?: string;
  onSave: () => void;
  onCancel: () => void;
}

export function ProductForm({ productId, onSave, onCancel }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
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
    has_size_variants: false,
    stock_quantity: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  useEffect(() => {
    if (formData.category_id) {
      setFilteredSubcategories(
        subcategories.filter(sub => sub.category_id === formData.category_id)
      );
    } else {
      setFilteredSubcategories([]);
    }
  }, [formData.category_id, subcategories]);

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

  const fetchProductData = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      
      // Fetch product data
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      if (product) {
        setFormData({
          name: product.name || '',
          description: product.description || '',
          cost_price: product.cost_price?.toString() || '',
          selling_price: product.selling_price?.toString() || '',
          category_id: product.category_id || '',
          subcategory_id: product.subcategory_id || '',
          image_url: product.image_url || '',
          is_featured: product.is_featured || false,
          has_color_variants: product.has_color_variants || false,
          has_size_variants: product.has_size_variants || false,
          stock_quantity: product.stock_quantity?.toString() || '',
          status: product.status || 'active',
        });

        // Fetch color variants if product has them
        if (product.has_color_variants) {
          const { data: colorVariantsData, error: colorError } = await supabase
            .from('color_variants')
            .select('*')
            .eq('product_id', productId);

          if (colorError) throw colorError;

          const colorVariantsWithSizes = await Promise.all(
            (colorVariantsData || []).map(async (colorVariant) => {
              let sizes: SizeVariant[] = [];
              
              if (product.has_size_variants && colorVariant.has_sizes) {
                const { data: sizesData, error: sizesError } = await supabase
                  .from('size_variants')
                  .select('*')
                  .eq('color_variant_id', colorVariant.id);

                if (sizesError) throw sizesError;
                sizes = sizesData || [];
              }

              return {
                id: colorVariant.id,
                color_name: colorVariant.color_name,
                image_url: colorVariant.image_url,
                stock_quantity: colorVariant.stock_quantity || 0,
                has_sizes: colorVariant.has_sizes || false,
                sizes,
              };
            })
          );

          setColorVariants(colorVariantsWithSizes);
        }
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Starting product save process...');
      
      const productData = {
        name: formData.name,
        description: formData.description,
        cost_price: parseFloat(formData.cost_price),
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        image_url: formData.image_url || null,
        is_featured: formData.is_featured,
        has_color_variants: formData.has_color_variants,
        has_size_variants: formData.has_size_variants,
        stock_quantity: formData.has_color_variants ? 0 : parseInt(formData.stock_quantity) || 0,
        status: formData.status,
      };

      let savedProductId = productId;

      if (productId) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);

        if (updateError) throw updateError;
        console.log('Product updated successfully');
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (insertError) throw insertError;
        savedProductId = newProduct.id;
        console.log('Product created with ID:', savedProductId);
      }

      // Handle color variants
      if (formData.has_color_variants && colorVariants.length > 0) {
        console.log('Saving color variants...');
        
        // Delete existing variants if updating
        if (productId) {
          const { error: deleteError } = await supabase
            .from('color_variants')
            .delete()
            .eq('product_id', productId);

          if (deleteError) throw deleteError;
        }

        // Insert new color variants
        for (const colorVariant of colorVariants) {
          const { data: savedColorVariant, error: colorError } = await supabase
            .from('color_variants')
            .insert([{
              product_id: savedProductId,
              color_name: colorVariant.color_name,
              image_url: colorVariant.image_url || null,
              stock_quantity: colorVariant.has_sizes ? 0 : colorVariant.stock_quantity,
              has_sizes: colorVariant.has_sizes,
            }])
            .select()
            .single();

          if (colorError) throw colorError;
          console.log('Color variant saved:', savedColorVariant);

          // Handle size variants for this color
          if (formData.has_size_variants && colorVariant.has_sizes && colorVariant.sizes.length > 0) {
            console.log('Saving size variants for color:', colorVariant.color_name);
            
            const sizeVariantsData = colorVariant.sizes.map(size => ({
              color_variant_id: savedColorVariant.id,
              size_name: size.size_name,
              size_code: size.size_code || null,
              stock_quantity: size.stock_quantity,
            }));

            const { error: sizeError } = await supabase
              .from('size_variants')
              .insert(sizeVariantsData);

            if (sizeError) throw sizeError;
            console.log('Size variants saved for color:', colorVariant.color_name);
          }
        }
      }

      toast({
        title: 'Success',
        description: `Product ${productId ? 'updated' : 'created'} successfully!`,
      });

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addColorVariant = () => {
    setColorVariants([
      ...colorVariants,
      {
        color_name: '',
        stock_quantity: 0,
        has_sizes: formData.has_size_variants,
        sizes: [],
      },
    ]);
  };

  const removeColorVariant = (index: number) => {
    setColorVariants(colorVariants.filter((_, i) => i !== index));
  };

  const updateColorVariant = (index: number, field: keyof ColorVariant, value: any) => {
    const updated = [...colorVariants];
    updated[index] = { ...updated[index], [field]: value };
    setColorVariants(updated);
  };

  const addSizeVariant = (colorIndex: number) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizes.push({
      size_name: '',
      size_code: '',
      stock_quantity: 0,
    });
    setColorVariants(updated);
  };

  const removeSizeVariant = (colorIndex: number, sizeIndex: number) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizes = updated[colorIndex].sizes.filter((_, i) => i !== sizeIndex);
    setColorVariants(updated);
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, field: keyof SizeVariant, value: any) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizes[sizeIndex] = { ...updated[colorIndex].sizes[sizeIndex], [field]: value };
    setColorVariants(updated);
  };

  if (loading && productId) {
    return <div className="flex justify-center p-8">Loading product data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{productId ? 'Edit Product' : 'Add New Product'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="variants">Variants</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost_price">Cost Price (Rs) *</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="Enter cost price"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="selling_price">Selling Price (Rs)</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      placeholder="Enter selling price"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, category_id: value, subcategory_id: '' });
                      }}
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
                      onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
                      disabled={!formData.category_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
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
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label htmlFor="is_featured">Featured Product</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_color_variants"
                      checked={formData.has_color_variants}
                      onCheckedChange={(checked) => {
                        setFormData({ ...formData, has_color_variants: checked });
                        if (!checked) {
                          setColorVariants([]);
                        }
                      }}
                    />
                    <Label htmlFor="has_color_variants">Has Color Variants</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_size_variants"
                      checked={formData.has_size_variants}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_size_variants: checked })}
                    />
                    <Label htmlFor="has_size_variants">Has Size Variants</Label>
                  </div>
                </div>

                {!formData.has_color_variants && (
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="Enter stock quantity"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="variants" className="space-y-4">
                {formData.has_color_variants ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Color Variants</h3>
                      <Button type="button" onClick={addColorVariant} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Color
                      </Button>
                    </div>
                    
                    {colorVariants.map((colorVariant, colorIndex) => (
                      <Card key={colorIndex}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Color {colorIndex + 1}</CardTitle>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeColorVariant(colorIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Color Name *</Label>
                              <Input
                                value={colorVariant.color_name}
                                onChange={(e) => updateColorVariant(colorIndex, 'color_name', e.target.value)}
                                placeholder="Enter color name"
                                required
                              />
                            </div>
                            <div>
                              <Label>Image URL</Label>
                              <Input
                                value={colorVariant.image_url || ''}
                                onChange={(e) => updateColorVariant(colorIndex, 'image_url', e.target.value)}
                                placeholder="Enter image URL"
                              />
                            </div>
                            {!formData.has_size_variants && (
                              <div>
                                <Label>Stock Quantity</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={colorVariant.stock_quantity}
                                  onChange={(e) => updateColorVariant(colorIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                                  placeholder="Enter stock quantity"
                                />
                              </div>
                            )}
                            {formData.has_size_variants && (
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={colorVariant.has_sizes}
                                  onCheckedChange={(checked) => updateColorVariant(colorIndex, 'has_sizes', checked)}
                                />
                                <Label>Has Size Variants</Label>
                              </div>
                            )}
                          </div>

                          {formData.has_size_variants && colorVariant.has_sizes && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium">Size Variants</h4>
                                <Button
                                  type="button"
                                  onClick={() => addSizeVariant(colorIndex)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Size
                                </Button>
                              </div>
                              
                              {colorVariant.sizes.map((size, sizeIndex) => (
                                <div key={sizeIndex} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                  <div>
                                    <Label>Size Name *</Label>
                                    <Input
                                      value={size.size_name}
                                      onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_name', e.target.value)}
                                      placeholder="e.g., Small, Medium"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label>Size Code</Label>
                                    <Input
                                      value={size.size_code || ''}
                                      onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_code', e.target.value)}
                                      placeholder="e.g., S, M, L"
                                    />
                                  </div>
                                  <div>
                                    <Label>Stock</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={size.stock_quantity}
                                      onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                                      placeholder="Stock"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeSizeVariant(colorIndex, sizeIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Enable "Has Color Variants" in Basic Info to manage color variants here.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="images" className="space-y-4">
                <div>
                  <Label htmlFor="main_image">Main Product Image URL</Label>
                  <Input
                    id="main_image"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="Enter main image URL"
                  />
                </div>
                {formData.image_url && (
                  <div>
                    <Label>Preview</Label>
                    <img
                      src={formData.image_url}
                      alt="Product preview"
                      className="mt-2 max-w-xs rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (productId ? 'Update Product' : 'Create Product')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
