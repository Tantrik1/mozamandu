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

interface ProductFormProps {
  productId?: string;
  onSave: () => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

export function ProductForm({ productId, onSave, onCancel, mode }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
              stock_quantity: 0,
            })),
            stock_quantity: 0,
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

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    setLoading(true);
    try {
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

  const saveColorVariants = async (productId: string, hasSizeVariants: boolean) => {
    try {
      const validVariants = colorVariants.filter(cv => cv.color_name.trim());
      if (validVariants.length === 0) return;

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

  if (mode === 'edit' && !product) {
    return <div className="flex justify-center p-8">Loading product...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {mode === 'create' ? 'Create New Product' : 'Edit Product'}
        </h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
