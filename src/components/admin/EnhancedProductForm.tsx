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
import { ArrowLeft, Upload, Eye, X } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
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
  const [product, setProduct] = useState<Product | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    if (mode === 'edit' && productId) {
      fetchProduct();
      fetchProductVariants();
    }
  }, [mode, productId]);

  useEffect(() => {
    if (watchedCategoryId) {
      const filtered = subcategories.filter(sub => sub.category_id === watchedCategoryId);
      setFilteredSubcategories(filtered);
      if (mode === 'create') {
        form.setValue('subcategory_id', '');
      }
    } else {
      setFilteredSubcategories([]);
    }
  }, [watchedCategoryId, subcategories, form, mode]);

  const fetchProduct = async () => {
    if (!productId) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      
      setProduct(data);
      setImagePreview(data.image_url);
      
      form.reset({
        name: data.name,
        description: data.description || '',
        cost_price: data.cost_price,
        selling_price: data.selling_price || 0,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        is_featured: data.is_featured,
        has_color_variants: data.has_color_variants,
        color_has_size_variants: data.color_has_size_variants || false,
        status: data.status,
      });
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const fetchProductVariants = async () => {
    if (!productId) return;

    try {
      const { data: colorData, error: colorError } = await supabase
        .from('color_variants')
        .select('*')
        .eq('product_id', productId);

      if (colorError) throw colorError;

      const variantsWithSizes = await Promise.all(
        (colorData || []).map(async (colorVariant) => {
          const { data: sizeData, error: sizeError } = await supabase
            .from('size_variants')
            .select('*')
            .eq('color_variant_id', colorVariant.id);

          if (sizeError) throw sizeError;

          return {
            ...colorVariant,
            size_variants: (sizeData || []).map(sv => ({
              id: sv.id,
              size_name: sv.size_name,
              size_code: sv.size_code || '',
              stock_quantity: 0, // Will be populated from inventory if needed
            })),
            stock_quantity: 0, // Will be populated from inventory if needed
          };
        })
      );

      setColorVariants(variantsWithSizes);
    } catch (error) {
      console.error('Error fetching variants:', error);
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
        .select('id, name, category_id')
        .eq('status', 'on')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
      
      toast({
        title: 'Success',
        description: 'Image selected successfully',
      });
    } catch (error) {
      console.error('Error handling image:', error);
      toast({
        title: 'Error',
        description: 'Failed to handle image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(product?.image_url || null);
  };

  const uploadImageAndGetUrl = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `product-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

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
      let imageUrl = product?.image_url;
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

        // Create inventory records for new product
        await createProductInventory(productResult.id, data);
      } else if (mode === 'edit' && productId) {
        const { error } = await supabase
          .from('products')
          .update({ ...productData, updated_at: new Date().toISOString() })
          .eq('id', productId);

        if (error) throw error;
        productResult = { id: productId, ...productData };
      }

      // Save variants if enabled
      if (data.has_color_variants && colorVariants.length > 0) {
        await saveColorVariants(productResult.id, data.color_has_size_variants);
      }

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

  const createProductInventory = async (productId: string, formData: z.infer<typeof productSchema>) => {
    try {
      // Get category and subcategory names
      const category = categories.find(c => c.id === formData.category_id);
      const subcategory = subcategories.find(s => s.id === formData.subcategory_id);

      if (!category || !subcategory) {
        throw new Error('Category or subcategory not found');
      }

      // If no variants, create a simple inventory record
      if (!formData.has_color_variants && !formData.color_has_size_variants) {
        await createInventoryRecord(
          productId,
          formData.name,
          category.name,
          subcategory.name,
          formData.cost_price,
          formData.selling_price,
          undefined,
          undefined,
          undefined,
          undefined,
          0
        );
      }
    } catch (error) {
      console.error('Error creating product inventory:', error);
    }
  };

  const saveColorVariants = async (productId: string, hasSizeVariants: boolean) => {
    try {
      const validVariants = colorVariants.filter(cv => cv.color_name.trim());
      if (validVariants.length === 0) return;

      // For edit mode, we might want to update existing variants
      // For now, let's handle create mode
      if (mode === 'create') {
        const { data: insertedColors, error: colorError } = await supabase
          .from('color_variants')
          .insert(
            validVariants.map(cv => ({
              product_id: productId,
              color_name: cv.color_name,
              image_url: cv.image_url || null,
              has_sizes: hasSizeVariants,
            }))
          )
          .select('id, color_name');

        if (colorError) throw colorError;

        // Insert size variants if applicable
        if (hasSizeVariants && insertedColors) {
          for (let i = 0; i < validVariants.length; i++) {
            const variant = validVariants[i];
            const insertedColor = insertedColors[i];
            
            if (variant.size_variants && variant.size_variants.length > 0) {
              const validSizes = variant.size_variants.filter(sv => sv.size_name.trim());
              if (validSizes.length > 0) {
                const { error: sizeError } = await supabase
                  .from('size_variants')
                  .insert(
                    validSizes.map(sv => ({
                      color_variant_id: insertedColor.id,
                      size_name: sv.size_name,
                      size_code: sv.size_code || null,
                    }))
                  );

                if (sizeError) throw sizeError;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving color variants:', error);
      throw error;
    }
  };

  const addColorVariant = () => {
    const newVariant: ColorVariant = {
      color_name: '',
      has_sizes: watchedHasSizeVariants,
      stock_quantity: watchedHasSizeVariants ? 0 : 0,
      size_variants: []
    };
    setColorVariants([...colorVariants, newVariant]);
  };

  const updateColorVariant = (index: number, field: keyof ColorVariant, value: any) => {
    const updated = [...colorVariants];
    updated[index] = { ...updated[index], [field]: value };
    setColorVariants(updated);
  };

  const removeColorVariant = (index: number) => {
    const updated = colorVariants.filter((_, i) => i !== index);
    setColorVariants(updated);
  };

  const addSizeVariant = (colorIndex: number) => {
    const updated = [...colorVariants];
    const newSizeVariant: SizeVariant = {
      size_name: '',
      size_code: '',
      stock_quantity: 0
    };
    updated[colorIndex].size_variants.push(newSizeVariant);
    setColorVariants(updated);
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, field: keyof SizeVariant, value: any) => {
    const updated = [...colorVariants];
    updated[colorIndex].size_variants[sizeIndex] = {
      ...updated[colorIndex].size_variants[sizeIndex],
      [field]: value
    };
    setColorVariants(updated);
  };

  const removeSizeVariant = (colorIndex: number, sizeIndex: number) => {
    const updated = [...colorVariants];
    updated[colorIndex].size_variants = updated[colorIndex].size_variants.filter((_, i) => i !== sizeIndex);
    setColorVariants(updated);
  };

  if (mode === 'edit' && !product) {
    return <div className="flex justify-center p-8">Loading product...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
                          setColorVariants([]);
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
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingImage ? 'Processing...' : mode === 'create' ? 'Upload Image' : 'Change Image'}
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
                        {(imageFile || mode === 'create') && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={removeImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variant management section would go here */}
        {watchedHasColorVariants && (
          <Card>
            <CardHeader>
              <CardTitle>Product Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button type="button" onClick={addColorVariant} variant="outline">
                  Add Color Variant
                </Button>
                
                {colorVariants.map((variant, index) => (
                  <div key={index} className="border p-4 rounded">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Color Name</Label>
                        <Input
                          value={variant.color_name}
                          onChange={(e) => updateColorVariant(index, 'color_name', e.target.value)}
                          placeholder="e.g., Red, Blue"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeColorVariant(index)}
                        >
                          Remove Color
                        </Button>
                      </div>
                    </div>
                    
                    {watchedHasSizeVariants && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Size Variants</Label>
                          <Button
                            type="button"
                            onClick={() => addSizeVariant(index)}
                            size="sm"
                            variant="outline"
                          >
                            Add Size
                          </Button>
                        </div>
                        
                        {variant.size_variants.map((sizeVariant, sizeIndex) => (
                          <div key={sizeIndex} className="grid grid-cols-4 gap-2 mb-2">
                            <Input
                              placeholder="Size (S, M, L)"
                              value={sizeVariant.size_name}
                              onChange={(e) => updateSizeVariant(index, sizeIndex, 'size_name', e.target.value)}
                            />
                            <Input
                              placeholder="Code"
                              value={sizeVariant.size_code || ''}
                              onChange={(e) => updateSizeVariant(index, sizeIndex, 'size_code', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Stock"
                              value={sizeVariant.stock_quantity}
                              onChange={(e) => updateSizeVariant(index, sizeIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeSizeVariant(index, sizeIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
