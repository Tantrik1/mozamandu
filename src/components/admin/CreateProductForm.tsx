
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
import { ArrowLeft, Upload, X } from 'lucide-react';
import { CreateProductVariantForm } from './CreateProductVariantForm';
import { InventorySetupModal } from './InventorySetupModal';

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
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

interface SizeVariant {
  size_name: string;
  size_code?: string;
}

interface CreateProductFormProps {
  onSave: () => void;
  onCancel: () => void;
}

export function CreateProductForm({ onSave, onCancel }: CreateProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [createdProductData, setCreatedProductData] = useState<any>(null);
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
      status: 'active',
    },
  });

  const watchedCategoryId = form.watch('category_id');
  const watchedHasColorVariants = form.watch('has_color_variants');
  const watchedHasSizeVariants = form.watch('has_size_variants');

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    if (watchedCategoryId) {
      const filtered = subcategories.filter(sub => sub.category_id === watchedCategoryId);
      setFilteredSubcategories(filtered);
      form.setValue('subcategory_id', '');
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
        description: 'Image ready for upload',
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to process image',
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

  const saveColorVariants = async (productId: string, hasSizeVariants: boolean) => {
    try {
      for (const cv of colorVariants) {
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
      console.error('Error saving variants:', error);
      throw error;
    }
  };

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    try {
      setLoading(true);

      const imageUrl = await uploadImageAndGetUrl();

      let fallbackSellingPrice = null;
      if (!data.selling_price) {
        const { data: subcat, error: subcatError } = await supabase
          .from('subcategories')
          .select('selling_price')
          .eq('id', data.subcategory_id)
          .single();
        if (!subcatError && subcat && subcat.selling_price) {
          fallbackSellingPrice = subcat.selling_price;
        }
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: data.name,
          description: data.description,
          cost_price: data.cost_price,
          selling_price: data.selling_price || fallbackSellingPrice || null,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id,
          is_featured: data.is_featured,
          has_color_variants: data.has_color_variants,
          color_has_size_variants: data.has_size_variants,
          status: data.status,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (productError) throw productError;

      if (data.has_color_variants && colorVariants.length > 0) {
        await saveColorVariants(product.id, data.has_size_variants);
      }

      // Store product data for inventory setup
      setCreatedProductData({
        id: product.id,
        name: product.name,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        has_color_variants: data.has_color_variants,
        has_size_variants: data.has_size_variants
      });

      toast({
        title: 'Success',
        description: 'Product created successfully! Now setup inventory.',
      });

      // Open inventory setup modal
      setInventoryModalOpen(true);
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

  const handleInventoryComplete = () => {
    setInventoryModalOpen(false);
    setCreatedProductData(null);
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create New Product</h2>
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <p className="text-sm text-gray-500">Image ready for upload</p>
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
              <CreateProductVariantForm
                colorVariants={colorVariants}
                setColorVariants={setColorVariants}
                hasSizeVariants={watchedHasSizeVariants}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>

      {createdProductData && (
        <InventorySetupModal
          isOpen={inventoryModalOpen}
          onClose={() => setInventoryModalOpen(false)}
          productId={createdProductData.id}
          productName={createdProductData.name}
          costPrice={createdProductData.cost_price}
          sellingPrice={createdProductData.selling_price}
          hasColorVariants={createdProductData.has_color_variants}
          hasSizeVariants={createdProductData.has_size_variants}
          onComplete={handleInventoryComplete}
        />
      )}
    </div>
  );
}
