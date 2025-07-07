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
import { EditProductVariantForm } from './EditProductVariantForm';
import { ProductEditBlockedModal } from './ProductEditBlockedModal';
import { validateProductEditability } from '@/utils/productEditValidation';
import { getProductInventory, updateInventoryItem, createInventoryItem, InventoryItem } from '@/utils/inventoryManager';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  cost_price: z.number().min(0, 'Cost price must be positive'),
  selling_price: z.number().min(0, 'Selling price must be positive').optional(),
  category_id: z.string().min(1, 'Category is required'),
  subcategory_id: z.string().min(1, 'Subcategory is required'),
  is_featured: z.boolean().default(false),
  has_color_variants: z.boolean().default(false),
  has_size_variants: z.boolean().default(false),
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

interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
}

interface EditProductFormProps {
  productId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EditProductForm({ productId, onSave, onCancel }: EditProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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
  const [inventoryRows, setInventoryRows] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

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
      has_size_variants: false,
      status: 'active',
    },
  });

  const watchedCategoryId = form.watch('category_id');
  const watchedHasColorVariants = form.watch('has_color_variants');
  const watchedHasSizeVariants = form.watch('has_size_variants');

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchSubcategories();
    if (productId) {
      setInventoryLoading(true);
      getProductInventory(productId)
        .then(setInventoryRows)
        .finally(() => setInventoryLoading(false));
    }
  }, [productId]);

  useEffect(() => {
    if (watchedCategoryId) {
      const filtered = subcategories.filter(sub => sub.category_id === watchedCategoryId);
      setFilteredSubcategories(filtered);
      if (!form.getValues('subcategory_id') || !filtered.find(sub => sub.id === form.getValues('subcategory_id'))) {
        form.setValue('subcategory_id', '');
      }
    } else {
      setFilteredSubcategories([]);
    }
  }, [watchedCategoryId, subcategories, form]);

  // Update color variants when variant settings change
  useEffect(() => {
    console.log('Variant settings changed:', {
      hasColorVariants: watchedHasColorVariants,
      hasSizeVariants: watchedHasSizeVariants,
      currentVariants: colorVariants
    });

    // If color variants are disabled, clear the variants
    if (!watchedHasColorVariants && colorVariants.length > 0) {
      console.log('Color variants disabled, clearing variants');
      setColorVariants([]);
    }
  }, [watchedHasColorVariants, watchedHasSizeVariants, colorVariants]);

  const fetchProduct = async () => {
    try {
      setLoading(true);

      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      if (product) {
        // Set form values
        form.reset({
          name: product.name || '',
          description: product.description || '',
          cost_price: product.cost_price || 0,
          selling_price: product.selling_price || 0,
          category_id: product.category_id || '',
          subcategory_id: product.subcategory_id || '',
          is_featured: product.is_featured || false,
          has_color_variants: product.has_color_variants || false,
          has_size_variants: product.color_has_size_variants || false,
          status: product.status || 'active',
        });

        // Set image preview if exists
        if (product.image_url) {
          setImagePreview(product.image_url);
        }

        // Fetch color variants if product has them
        if (product.has_color_variants) {
          console.log('Product has color variants, fetching them...');
          await fetchColorVariants();
        } else {
          console.log('Product does not have color variants');
          setColorVariants([]);
        }
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

  const fetchColorVariants = async () => {
    try {
      console.log('Fetching color variants for product:', productId);

      // First, fetch all color variants for the product
      const { data: colorVariantsData, error: colorError } = await supabase
        .from('color_variants')
        .select('*')
        .eq('product_id', productId)
        .order('color_name');

      if (colorError) throw colorError;

      console.log('Found color variants:', colorVariantsData);

      // For each color variant, fetch its size variants if it has sizes
      const variantsWithSizes = await Promise.all(
        (colorVariantsData || []).map(async (cv) => {
          let sizeVariants: any[] = [];

          if (cv.has_sizes) {
            const { data: sizeData, error: sizeError } = await supabase
              .from('size_variants')
              .select('*')
              .eq('color_variant_id', cv.id)
              .order('size_name');

            if (sizeError) {
              console.error('Error fetching size variants for color:', cv.id, sizeError);
            } else {
              sizeVariants = sizeData || [];
            }
          }

          return {
            id: cv.id,
            color_name: cv.color_name,
            image_url: cv.image_url,
            has_sizes: cv.has_sizes,
            size_variants: sizeVariants.map(sv => ({
              id: sv.id,
              size_name: sv.size_name,
              size_code: sv.size_code,
            }))
          };
        })
      );

      console.log('Processed variants with sizes:', variantsWithSizes);
      setColorVariants(variantsWithSizes);
    } catch (error) {
      console.error('Error fetching color variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch product variants',
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

    console.log('Starting image upload for file:', file.name);
    setUploadingImage(true);

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `product-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setImageFile(file);

      console.log('Image uploaded successfully:', urlData.publicUrl);
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImageAndGetUrl = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `product-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

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

  // Handler for stock/sku edits
  const handleInventoryChange = (idx: number, field: string, value: any) => {
    setInventoryRows(rows => {
      const newRows = [...rows];
      newRows[idx] = { ...newRows[idx], [field]: value };
      return newRows;
    });
  };

  // Handler to add a new row (for new variation)
  const handleAddInventoryRow = () => {
    setInventoryRows(rows => [
      ...rows,
      { 
        id: '', 
        product_id: productId, 
        sku: '', 
        product_name: form.getValues('name'), 
        color_name: '', 
        size_name: '', 
        size_code: '', 
        stock_quantity: 0, 
        reserved_stock: 0, 
        available_stock: 0, 
        low_stock_threshold: 10,
        is_active: true, 
        created_at: '', 
        updated_at: '' 
      }
    ]);
  };

  // Enhanced onSubmit to handle inventory updates
  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    try {
      setSaving(true);
      // Check for reserved stock if name/variation changes
      for (const row of inventoryRows) {
        if (row.reserved_stock > 0 && (row.product_name !== data.name || row.color_name !== row.color_name || row.size_name !== row.size_name)) {
          toast({ title: 'Edit Blocked', description: 'Cannot change product/variation with reserved stock.', variant: 'destructive' });
          return;
        }
      }

      console.log('Updating product with data:', data);

      // Upload image if exists
      const imageUrl = await uploadImageAndGetUrl();

      // Update product
      const updateData: any = {
        name: data.name,
        description: data.description,
        cost_price: data.cost_price,
        selling_price: data.selling_price,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        is_featured: data.is_featured,
        has_color_variants: data.has_color_variants,
        color_has_size_variants: data.has_size_variants,
        status: data.status,
      };

      if (imageUrl) {
        updateData.image_url = imageUrl;
      }

      const { error: productError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (productError) throw productError;

      // Update color variants if any
      if (data.has_color_variants && colorVariants.length > 0) {
        await updateColorVariants(data.has_size_variants);
      } else if (!data.has_color_variants) {
        // Remove all variants if color variants are disabled
        await removeAllVariants();
      }

      // Save inventory changes
      for (const row of inventoryRows) {
        const updateData = {
          product_id: row.product_id,
          sku: row.sku,
          color_variant_id: row.color_variant_id,
          size_variant_id: row.size_variant_id,
          product_name: row.product_name,
          color_name: row.color_name,
          size_name: row.size_name,
          size_code: row.size_code,
          stock_quantity: row.stock_quantity,
          reserved_stock: row.reserved_stock,
          available_stock: row.stock_quantity - row.reserved_stock,
          low_stock_threshold: row.low_stock_threshold,
          cost_price: row.cost_price,
          selling_price: row.selling_price,
          is_active: row.is_active
        };

        if (row.id) {
          await updateInventoryItem(row.id, updateData);
        } else {
          await createInventoryItem(updateData);
        }
      }

      toast({
        title: 'Success',
        description: 'Product and inventory updated!',
      });

      onSave();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product/inventory',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateColorVariants = async (hasSizeVariants: boolean) => {
    try {
      console.log('Updating color variants:', colorVariants);

      // Get existing color variant IDs
      const existingColorIds = colorVariants
        .filter(cv => cv.id)
        .map(cv => cv.id!);

      // Remove color variants that are no longer in the list
      if (existingColorIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('color_variants')
          .delete()
          .in('id', existingColorIds);

        if (deleteError) throw deleteError;
      }

      // Create new color variants
      for (const cv of colorVariants) {
        // Create color variant
        const { data: insertedColor, error: colorError } = await supabase
          .from('color_variants')
          .insert({
            product_id: productId,
            color_name: cv.color_name,
            image_url: cv.image_url,
            has_sizes: hasSizeVariants,
          })
          .select()
          .single();

        if (colorError) throw colorError;

        // Create size variants if needed
        if (hasSizeVariants && cv.size_variants.length > 0) {
          for (const sv of cv.size_variants) {
            const { error: sizeError } = await supabase
              .from('size_variants')
              .insert({
                color_variant_id: insertedColor.id,
                size_name: sv.size_name,
                size_code: sv.size_code,
              });

            if (sizeError) throw sizeError;
          }
        }
      }
    } catch (error) {
      console.error('Error updating color variants:', error);
      throw error;
    }
  };

  const removeAllVariants = async () => {
    try {
      console.log('Removing all variants for product:', productId);

      // Get all color variant IDs for this product
      const { data: colorVariants, error: colorError } = await supabase
        .from('color_variants')
        .select('id')
        .eq('product_id', productId);

      if (colorError) throw colorError;

      if (colorVariants && colorVariants.length > 0) {
        const colorIds = colorVariants.map(cv => cv.id);

        // Delete size variants first (due to foreign key constraint)
        const { error: sizeDeleteError } = await supabase
          .from('size_variants')
          .delete()
          .in('color_variant_id', colorIds);

        if (sizeDeleteError) throw sizeDeleteError;

        // Delete color variants
        const { error: colorDeleteError } = await supabase
          .from('color_variants')
          .delete()
          .in('id', colorIds);

        if (colorDeleteError) throw colorDeleteError;
      }
    } catch (error) {
      console.error('Error removing variants:', error);
      throw error;
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Product</h2>
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
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
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
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
                  <Label htmlFor="cost_price">Cost Price *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    {...form.register('cost_price', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.cost_price && (
                    <p className="text-sm text-red-500">{form.formState.errors.cost_price.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="selling_price">Selling Price</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    {...form.register('selling_price', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.selling_price && (
                    <p className="text-sm text-red-500">{form.formState.errors.selling_price.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_id">Category *</Label>
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
                    <p className="text-sm text-red-500">{form.formState.errors.category_id.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="subcategory_id">Subcategory *</Label>
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
                    <p className="text-sm text-red-500">{form.formState.errors.subcategory_id.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={form.watch('is_featured')}
                  onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                />
                <Label htmlFor="is_featured">Featured Product</Label>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive')}
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

          {/* Product Image */}
          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">Image uploaded successfully</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">Click to upload</span> or drag and drop
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Variants Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Variants Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="has_color_variants"
                checked={form.watch('has_color_variants')}
                onCheckedChange={(checked) => {
                  form.setValue('has_color_variants', checked);
                  if (!checked) {
                    form.setValue('has_size_variants', false);
                    setColorVariants([]);
                  }
                }}
              />
              <Label htmlFor="has_color_variants">Has Color Variants</Label>
            </div>

            {watchedHasColorVariants && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="has_size_variants"
                  checked={form.watch('has_size_variants')}
                  onCheckedChange={(checked) => form.setValue('has_size_variants', checked)}
                />
                <Label htmlFor="has_size_variants">Color Variants Have Sizes</Label>
              </div>
            )}

            {watchedHasColorVariants && (
              <EditProductVariantForm
                colorVariants={colorVariants}
                setColorVariants={setColorVariants}
                hasSizeVariants={watchedHasSizeVariants}
              />
            )}
          </CardContent>
        </Card>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Color</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Reserved</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryRows.map((row, idx) => (
              <TableRow key={row.id || idx}>
                <TableCell><Input value={row.sku} onChange={e => handleInventoryChange(idx, 'sku', e.target.value)} /></TableCell>
                <TableCell>{row.color_name || '-'}</TableCell>
                <TableCell>{row.size_name || '-'}</TableCell>
                <TableCell><Input type="number" value={row.stock_quantity} onChange={e => handleInventoryChange(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                <TableCell>{row.reserved_stock}</TableCell>
                <TableCell>{row.id ? null : <Button onClick={() => setInventoryRows(rows => rows.filter((_, i) => i !== idx))}>Remove</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button onClick={handleAddInventoryRow}>Add Variation</Button>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <ProductEditBlockedModal
        isOpen={editBlockedModal.isOpen}
        reason={editBlockedModal.reason}
        pendingOrdersCount={editBlockedModal.pendingOrdersCount}
        onClose={closeEditBlockedModal}
      />
    </div>
  );
}
