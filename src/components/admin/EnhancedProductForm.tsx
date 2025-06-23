
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Upload, X, Eye } from 'lucide-react';

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
  stock_quantity: z.number().min(0, 'Stock quantity must be positive').optional(),
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
  id: string;
  color_name: string;
  stock_quantity: number;
  image_url?: string;
  has_sizes: boolean;
}

interface SizeVariant {
  id: string;
  size_name: string;
  size_code?: string;
  stock_quantity: number;
  color_variant_id: string;
}

interface ProductFormProps {
  productId?: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EnhancedProductForm({ productId, onSave, onCancel }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
      has_size_variants: false,
      stock_quantity: 0,
      status: 'active',
    },
  });

  const watchedCategoryId = form.watch('category_id');
  const watchedHasColorVariants = form.watch('has_color_variants');
  const watchedHasSizeVariants = form.watch('has_size_variants');

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  useEffect(() => {
    if (watchedCategoryId) {
      const filtered = subcategories.filter(sub => sub.category_id === watchedCategoryId);
      setFilteredSubcategories(filtered);
      if (!filtered.find(sub => sub.id === form.getValues('subcategory_id'))) {
        form.setValue('subcategory_id', '');
      }
    } else {
      setFilteredSubcategories([]);
    }
  }, [watchedCategoryId, subcategories, form]);

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

  const fetchProduct = async () => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      form.reset({
        name: product.name,
        description: product.description || '',
        cost_price: product.cost_price,
        selling_price: product.selling_price || 0,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        is_featured: product.is_featured,
        has_color_variants: product.has_color_variants,
        has_size_variants: product.has_size_variants,
        stock_quantity: product.stock_quantity || 0,
        status: product.status,
      });

      if (product.image_url) {
        setImagePreview(product.image_url);
      }

      // Fetch color variants if they exist
      if (product.has_color_variants) {
        await fetchColorVariants();
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch product details',
        variant: 'destructive',
      });
    }
  };

  const fetchColorVariants = async () => {
    if (!productId) return;

    try {
      const { data, error } = await supabase
        .from('color_variants')
        .select('*')
        .eq('product_id', productId)
        .order('color_name');

      if (error) throw error;
      setColorVariants(data || []);

      // If product has size variants, fetch them too
      if (watchedHasSizeVariants && data && data.length > 0) {
        await fetchSizeVariants();
      }
    } catch (error) {
      console.error('Error fetching color variants:', error);
    }
  };

  const fetchSizeVariants = async () => {
    if (!productId || colorVariants.length === 0) return;

    try {
      const colorVariantIds = colorVariants.map(cv => cv.id);
      const { data, error } = await supabase
        .from('size_variants')
        .select('*')
        .in('color_variant_id', colorVariantIds)
        .order('size_name');

      if (error) throw error;
      setSizeVariants(data || []);
    } catch (error) {
      console.error('Error fetching size variants:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVariantImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateColorVariant(index, 'image_url', e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeVariantImage = (index: number) => {
    updateColorVariant(index, 'image_url', '');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    }
  };

  const addColorVariant = () => {
    const newVariant: ColorVariant = {
      id: `temp-${Date.now()}`,
      color_name: '',
      stock_quantity: 0,
      has_sizes: watchedHasSizeVariants,
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

  const addSizeVariant = (colorVariantIndex: number) => {
    const colorVariantId = colorVariants[colorVariantIndex].id;
    const newSize: SizeVariant = {
      id: `temp-${Date.now()}`,
      size_name: '',
      size_code: '',
      stock_quantity: 0,
      color_variant_id: colorVariantId,
    };
    setSizeVariants([...sizeVariants, newSize]);
  };

  const updateSizeVariant = (index: number, field: keyof SizeVariant, value: any) => {
    const updated = [...sizeVariants];
    updated[index] = { ...updated[index], [field]: value };
    setSizeVariants(updated);
  };

  const removeSizeVariant = (index: number) => {
    const updated = sizeVariants.filter((_, i) => i !== index);
    setSizeVariants(updated);
  };

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    setLoading(true);
    try {
      let imageUrl = imagePreview;

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Ensure all required fields are present and properly typed
      const productData = {
        name: data.name,
        description: data.description || null,
        cost_price: data.cost_price,
        selling_price: data.selling_price || null,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        is_featured: data.is_featured,
        has_color_variants: data.has_color_variants,
        has_size_variants: data.has_size_variants,
        stock_quantity: data.stock_quantity || null,
        status: data.status,
        image_url: imageUrl,
      };

      let currentProductId = productId;

      if (productId) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);

        if (error) throw error;
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        currentProductId = newProduct.id;
      }

      // Save color variants if enabled
      if (data.has_color_variants && colorVariants.length > 0 && currentProductId) {
        await saveColorVariants(currentProductId);
      }

      toast({
        title: 'Success',
        description: productId ? 'Product updated successfully' : 'Product created successfully',
      });

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveColorVariants = async (currentProductId: string) => {
    try {
      // Delete existing variants
      await supabase
        .from('color_variants')
        .delete()
        .eq('product_id', currentProductId);

      // Insert new variants
      const validVariants = colorVariants.filter(cv => cv.color_name.trim());
      if (validVariants.length > 0) {
        const { error } = await supabase
          .from('color_variants')
          .insert(
            validVariants.map(cv => ({
              product_id: currentProductId,
              color_name: cv.color_name,
              stock_quantity: cv.stock_quantity,
              image_url: cv.image_url || null,
              has_sizes: cv.has_sizes,
            }))
          );

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving color variants:', error);
      throw error;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">
            {productId ? 'Edit Product' : 'Create Product'}
          </h2>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Product Information</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
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
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
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
                        <Label htmlFor="subcategory">Subcategory</Label>
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
                        <Label htmlFor="is_featured">Featured Product</Label>
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
                        <Label htmlFor="has_color_variants">Color Variants</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="has_size_variants"
                          checked={form.watch('has_size_variants')}
                          onCheckedChange={(checked) => {
                            form.setValue('has_size_variants', checked);
                            if (!checked) {
                              setSizeVariants([]);
                            }
                          }}
                        />
                        <Label htmlFor="has_size_variants">Size Variants</Label>
                      </div>
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
                          Upload Image
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
                              onClick={removeImage}
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
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost_price">Cost Price (Rs)</Label>
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

                {!watchedHasColorVariants && (
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      {...form.register('stock_quantity', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                )}

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
          </TabsContent>

          <TabsContent value="variants" className="space-y-6">
            {watchedHasColorVariants ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Color & Size Variants</CardTitle>
                    <Button type="button" onClick={addColorVariant} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Color
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {colorVariants.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No color variants added yet</p>
                  ) : (
                    <div className="space-y-6">
                      {colorVariants.map((variant, index) => (
                        <div key={variant.id} className="border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-lg">Color Variant {index + 1}</h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeColorVariant(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Color Name</Label>
                                  <Input
                                    value={variant.color_name}
                                    onChange={(e) => updateColorVariant(index, 'color_name', e.target.value)}
                                    placeholder="e.g., Red, Blue, Green"
                                  />
                                </div>
                                <div>
                                  <Label>Stock Quantity</Label>
                                  <Input
                                    type="number"
                                    value={variant.stock_quantity}
                                    onChange={(e) => updateColorVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                  />
                                </div>
                              </div>

                              {watchedHasSizeVariants && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <Label>Size Variants</Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addSizeVariant(index)}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Size
                                    </Button>
                                  </div>
                                  {sizeVariants
                                    .filter(sv => sv.color_variant_id === variant.id)
                                    .map((size, sizeIndex) => (
                                      <div key={size.id} className="grid grid-cols-3 gap-2 mb-2">
                                        <Input
                                          placeholder="Size (S, M, L)"
                                          value={size.size_name}
                                          onChange={(e) => updateSizeVariant(sizeIndex, 'size_name', e.target.value)}
                                        />
                                        <Input
                                          placeholder="Code (optional)"
                                          value={size.size_code || ''}
                                          onChange={(e) => updateSizeVariant(sizeIndex, 'size_code', e.target.value)}
                                        />
                                        <div className="flex space-x-1">
                                          <Input
                                            type="number"
                                            placeholder="Stock"
                                            value={size.stock_quantity}
                                            onChange={(e) => updateSizeVariant(sizeIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                                          />
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeSizeVariant(sizeIndex)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <Label>Variant Image</Label>
                              <div className="mt-2 space-y-4">
                                <div>
                                  <input
                                    id={`variant-image-${index}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleVariantImageUpload(e, index)}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`variant-image-${index}`}
                                    className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Variant Image
                                  </label>
                                </div>

                                {variant.image_url && (
                                  <div className="relative">
                                    <img
                                      src={variant.image_url}
                                      alt={`${variant.color_name} variant`}
                                      className="w-full h-32 object-cover rounded-lg border"
                                    />
                                    <div className="absolute top-2 right-2 space-x-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => window.open(variant.image_url, '_blank')}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => removeVariantImage(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">Enable color variants to manage different colors and sizes</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4 mt-8">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
