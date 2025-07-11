
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Eye, X, Plus, Trash2 } from 'lucide-react';
import { useInventoryManager } from '@/hooks/useInventoryManager';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  cost_price: z.number().min(0, 'Cost price must be positive'),
  selling_price: z.number().min(0, 'Selling price must be positive').optional(),
  category_id: z.string().min(1, 'Category is required'),
  subcategory_id: z.string().min(1, 'Subcategory is required'),
  is_featured: z.boolean().default(false),
  has_color_variants: z.boolean().default(false),
  color_has_size_variants: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
});

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface Color {
  id: string;
  name: string;
  hex_code: string;
}

interface Size {
  id: string;
  name: string;
  code: string;
  sort_order: number;
}

interface SKUVariant {
  id?: string;
  sku: string;
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
  stock_quantity: number;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number;
}

interface EnhancedProductFormProps {
  productId?: string;
  onSave: () => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

export function EnhancedProductForm({ productId, onSave, onCancel, mode }: EnhancedProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [skuVariants, setSkuVariants] = useState<SKUVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { createInventoryRecord } = useInventoryManager();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      cost_price: 0,
      selling_price: 0,
      category_id: '',
      subcategory_id: '',
      is_featured: false,
      has_color_variants: false,
      color_has_size_variants: false,
      status: 'active',
    },
  });

  const watchedCategoryId = form.watch('category_id');
  const watchedHasColorVariants = form.watch('has_color_variants');
  const watchedHasSizeVariants = form.watch('color_has_size_variants');
  const watchedProductName = form.watch('name');

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    fetchColors();
    fetchSizes();
    if (mode === 'edit' && productId) {
      fetchProduct();
    }
  }, [mode, productId]);

  useEffect(() => {
    if (watchedCategoryId) {
      const filtered = subcategories.filter(sub => sub.category_id === watchedCategoryId);
      setFilteredSubcategories(filtered);
      if (mode === 'create') {
        form.setValue('subcategory_id', '');
      }
    }
  }, [watchedCategoryId, subcategories, form, mode]);

  useEffect(() => {
    generateSKUVariants();
  }, [watchedHasColorVariants, watchedHasSizeVariants, watchedProductName]);

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

  const fetchColors = async () => {
    try {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setColors(data || []);
    } catch (error) {
      console.error('Error fetching colors:', error);
    }
  };

  const fetchSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      setSizes(data || []);
    } catch (error) {
      console.error('Error fetching sizes:', error);
    }
  };

  const fetchProduct = async () => {
    if (!productId) return;
    
    try {
      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      
      setImagePreview(product.image_url);
      form.reset({
        name: product.name,
        description: product.description || '',
        cost_price: product.cost_price,
        selling_price: product.selling_price || 0,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        is_featured: product.is_featured,
        has_color_variants: product.has_color_variants,
        color_has_size_variants: product.color_has_size_variants || false,
        status: product.status,
      });

      // Fetch existing SKU variants
      const { data: variants, error: variantsError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId);

      if (variantsError) throw variantsError;

      const existingVariants: SKUVariant[] = (variants || []).map(v => ({
        id: v.id,
        sku: v.sku,
        color_name: v.color_name,
        size_name: v.size_name,
        stock_quantity: v.stock_quantity,
        cost_price: v.cost_price,
        selling_price: v.selling_price || 0,
        low_stock_threshold: v.low_stock_threshold || 10,
      }));

      setSkuVariants(existingVariants);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const generateSKUVariants = () => {
    if (mode === 'edit') return; // Don't auto-generate for edit mode
    
    const variants: SKUVariant[] = [];
    const productName = watchedProductName || 'Product';

    if (!watchedHasColorVariants && !watchedHasSizeVariants) {
      // Simple product - single SKU
      variants.push({
        sku: `${productName.toUpperCase().replace(/\s+/g, '')}-001`,
        stock_quantity: 0,
        cost_price: form.getValues('cost_price') || 0,
        selling_price: form.getValues('selling_price') || 0,
        low_stock_threshold: 10,
      });
    } else if (watchedHasColorVariants && !watchedHasSizeVariants) {
      // Color variants only
      colors.forEach((color, index) => {
        variants.push({
          sku: `${productName.toUpperCase().replace(/\s+/g, '')}-${color.name.toUpperCase().replace(/\s+/g, '')}-${String(index + 1).padStart(3, '0')}`,
          color_id: color.id,
          color_name: color.name,
          stock_quantity: 0,
          cost_price: form.getValues('cost_price') || 0,
          selling_price: form.getValues('selling_price') || 0,
          low_stock_threshold: 10,
        });
      });
    } else if (watchedHasColorVariants && watchedHasSizeVariants) {
      // Color and size variants
      let counter = 1;
      colors.forEach(color => {
        sizes.forEach(size => {
          variants.push({
            sku: `${productName.toUpperCase().replace(/\s+/g, '')}-${color.name.toUpperCase().replace(/\s+/g, '')}-${size.code || size.name.toUpperCase()}-${String(counter).padStart(3, '0')}`,
            color_id: color.id,
            size_id: size.id,
            color_name: color.name,
            size_name: size.name,
            stock_quantity: 0,
            cost_price: form.getValues('cost_price') || 0,
            selling_price: form.getValues('selling_price') || 0,
            low_stock_threshold: 10,
          });
          counter++;
        });
      });
    }

    setSkuVariants(variants);
  };

  const updateSKUVariant = (index: number, field: keyof SKUVariant, value: any) => {
    const updated = [...skuVariants];
    updated[index] = { ...updated[index], [field]: value };
    setSkuVariants(updated);
  };

  const addCustomSKU = () => {
    const newSKU: SKUVariant = {
      sku: `${watchedProductName.toUpperCase().replace(/\s+/g, '')}-CUSTOM-${String(skuVariants.length + 1).padStart(3, '0')}`,
      stock_quantity: 0,
      cost_price: form.getValues('cost_price') || 0,
      selling_price: form.getValues('selling_price') || 0,
      low_stock_threshold: 10,
    };
    setSkuVariants([...skuVariants, newSKU]);
  };

  const removeSKU = (index: number) => {
    const updated = skuVariants.filter((_, i) => i !== index);
    setSkuVariants(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setImageFile(file);
  };

  const uploadImageAndGetUrl = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `product-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageFile);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    setLoading(true);
    try {
      let imageUrl = imagePreview;
      if (imageFile) {
        const newImageUrl = await uploadImageAndGetUrl();
        if (newImageUrl) {
          imageUrl = newImageUrl;
        }
      }

      const productData = {
        name: data.name,
        description: data.description || null,
        cost_price: data.cost_price,
        selling_price: data.selling_price || null,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        is_featured: data.is_featured,
        has_color_variants: data.has_color_variants,
        color_has_size_variants: data.color_has_size_variants,
        status: data.status,
        image_url: imageUrl,
      };

      let productResult;
      
      if (mode === 'create') {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        productResult = newProduct;
      } else if (mode === 'edit' && productId) {
        const { error } = await supabase
          .from('products')
          .update({ ...productData, updated_at: new Date().toISOString() })
          .eq('id', productId);

        if (error) throw error;
        productResult = { id: productId, ...productData };
      }

      // Save variants and create inventory records
      await saveVariants(productResult.id, data);

      toast({
        title: 'Success',
        description: `Product ${mode === 'create' ? 'created' : 'updated'} successfully`,
      });

      onSave();
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} product:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${mode === 'create' ? 'create' : 'update'} product`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveVariants = async (productId: string, formData: z.infer<typeof productSchema>) => {
    try {
      const category = categories.find(c => c.id === formData.category_id);
      const subcategory = subcategories.find(s => s.id === formData.subcategory_id);

      if (!category || !subcategory) {
        throw new Error('Category or subcategory not found');
      }

      // Create color variants if needed
      const colorVariantMap: Record<string, string> = {};
      if (formData.has_color_variants) {
        const uniqueColors = [...new Set(skuVariants.map(v => v.color_name).filter(Boolean))];
        
        for (const colorName of uniqueColors) {
          const color = colors.find(c => c.name === colorName);
          if (color) {
            const { data: colorVariant, error } = await supabase
              .from('color_variants')
              .upsert({
                product_id: productId,
                color_name: colorName,
                color_id: color.id,
                has_sizes: formData.color_has_size_variants,
              })
              .select()
              .single();

            if (error) throw error;
            colorVariantMap[colorName] = colorVariant.id;
          }
        }
      }

      // Create size variants if needed
      const sizeVariantMap: Record<string, string> = {};
      if (formData.color_has_size_variants) {
        for (const variant of skuVariants) {
          if (variant.size_name && variant.color_name) {
            const size = sizes.find(s => s.name === variant.size_name);
            if (size && colorVariantMap[variant.color_name]) {
              const { data: sizeVariant, error } = await supabase
                .from('size_variants')
                .upsert({
                  color_variant_id: colorVariantMap[variant.color_name],
                  size_name: variant.size_name,
                  size_id: size.id,
                  size_code: size.code,
                })
                .select()
                .single();

              if (error) throw error;
              sizeVariantMap[`${variant.color_name}-${variant.size_name}`] = sizeVariant.id;
            }
          }
        }
      }

      // Create/update inventory records for each SKU
      for (const variant of skuVariants) {
        const inventoryData = {
          sku: variant.sku,
          product_id: productId,
          product_name: formData.name,
          category_name: category.name,
          subcategory_name: subcategory.name,
          color_name: variant.color_name || null,
          size_name: variant.size_name || null,
          color_variant_id: variant.color_name ? colorVariantMap[variant.color_name] : null,
          size_variant_id: variant.color_name && variant.size_name ? sizeVariantMap[`${variant.color_name}-${variant.size_name}`] : null,
          stock_quantity: variant.stock_quantity,
          cost_price: variant.cost_price,
          selling_price: variant.selling_price,
          low_stock_threshold: variant.low_stock_threshold,
          is_active: true,
        };

        if (variant.id) {
          // Update existing
          const { error } = await supabase
            .from('product_inventory')
            .update(inventoryData)
            .eq('id', variant.id);
          if (error) throw error;
        } else {
          // Create new
          const { error } = await supabase
            .from('product_inventory')
            .insert(inventoryData);
          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Error saving variants:', error);
      throw error;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">
            {mode === 'create' ? 'Create New Product' : 'Edit Product'}
          </h2>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter product name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost_price">Cost Price (Rs) *</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      {...form.register('cost_price', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {form.formState.errors.cost_price && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.cost_price.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="selling_price">Selling Price (Rs)</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      {...form.register('selling_price', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={form.watch('category_id')}
                      onValueChange={(value) => form.setValue('category_id', value)}
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
                    {form.formState.errors.category_id && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.category_id.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="subcategory">Subcategory *</Label>
                    <Select
                      value={form.watch('subcategory_id')}
                      onValueChange={(value) => form.setValue('subcategory_id', value)}
                      disabled={!watchedCategoryId}
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
                    {form.formState.errors.subcategory_id && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.subcategory_id.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_featured"
                      checked={form.watch('is_featured')}
                      onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                    />
                    <Label htmlFor="is_featured">Featured</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_color_variants"
                      checked={form.watch('has_color_variants')}
                      onCheckedChange={(checked) => {
                        form.setValue('has_color_variants', checked);
                        if (!checked) {
                          form.setValue('color_has_size_variants', false);
                        }
                      }}
                    />
                    <Label htmlFor="has_color_variants">Colors</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="color_has_size_variants"
                      checked={form.watch('color_has_size_variants')}
                      onCheckedChange={(checked) => {
                        form.setValue('color_has_size_variants', checked);
                      }}
                      disabled={!watchedHasColorVariants}
                    />
                    <Label htmlFor="color_has_size_variants">Sizes</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value: 'active' | 'inactive') => form.setValue('status', value)}
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
                <Label>Product Image</Label>
                <div className="mt-2 space-y-4">
                  <div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {mode === 'create' ? 'Upload Image' : 'Change Image'}
                    </label>
                  </div>

                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full max-w-sm h-48 object-cover rounded-lg border"
                      />
                      <div className="absolute top-2 right-2 space-x-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(imagePreview, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setImagePreview(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SKU Management Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>SKU Management</CardTitle>
              <Button type="button" onClick={addCustomSKU} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom SKU
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skuVariants.map((variant, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg">
                  <div className="col-span-3">
                    <Label>SKU</Label>
                    <Input
                      value={variant.sku}
                      onChange={(e) => updateSKUVariant(index, 'sku', e.target.value)}
                      placeholder="Enter SKU"
                    />
                  </div>
                  
                  {variant.color_name && (
                    <div className="col-span-2">
                      <Label>Color</Label>
                      <Input value={variant.color_name} disabled />
                    </div>
                  )}
                  
                  {variant.size_name && (
                    <div className="col-span-2">
                      <Label>Size</Label>
                      <Input value={variant.size_name} disabled />
                    </div>
                  )}
                  
                  <div className="col-span-1">
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={variant.stock_quantity}
                      onChange={(e) => updateSKUVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Label>Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.cost_price}
                      onChange={(e) => updateSKUVariant(index, 'cost_price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.selling_price}
                      onChange={(e) => updateSKUVariant(index, 'selling_price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      value={variant.low_stock_threshold}
                      onChange={(e) => updateSKUVariant(index, 'low_stock_threshold', parseInt(e.target.value) || 0)}
                      placeholder="10"
                    />
                  </div>
                  
                  <div className="col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSKU(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {skuVariants.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No SKUs configured. Configure product variants above to generate SKUs automatically.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create Product' : 'Update Product')}
          </Button>
        </div>
      </form>
    </div>
  );
}
