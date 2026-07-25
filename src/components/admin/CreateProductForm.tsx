import { useState, useEffect, useRef } from 'react';
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
import { ArrowLeft, Upload, Eye, X, ImageIcon } from 'lucide-react';
import { SmartProductVariantForm } from './SmartProductVariantForm';
import { InventoryManagementPopup } from './InventoryManagementPopup';
import { ProductAdditionalImages, type AdditionalImage, type ProductAdditionalImagesRef } from './ProductAdditionalImages';
import { ProductSEOSection } from './ProductSEOSection';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';
import { uploadToR2 } from '@/utils/r2Upload';
import { CareInstructionsInput } from './CareInstructionsInput';
import { MediaPicker } from './MediaPicker';

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
  material_composition: z.string().optional(),
  care_instructions: z.union([z.string(), z.array(z.string())]).optional(),
  // SEO fields
  meta_title: z.string().max(60).optional(),
  meta_description: z.string().max(160).optional(),
  meta_keywords: z.string().optional(),
  og_title: z.string().max(60).optional(),
  og_description: z.string().max(160).optional(),
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
  color_hex?: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

interface SizeVariant {
  id?: string;
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
  const [showInventoryPopup, setShowInventoryPopup] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>([]);
  const additionalImagesRef = useRef<ProductAdditionalImagesRef>(null);
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
      material_composition: 'Premium quality fabric blend designed for comfort and durability.',
      care_instructions: ['Machine wash cold with similar colors', 'Do not bleach', 'Tumble dry low', 'Iron on low heat if needed'],
      // SEO defaults
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_title: '',
      og_description: '',
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

  // Disable sizes when colors are disabled
  useEffect(() => {
    if (!watchedHasColorVariants && watchedHasSizeVariants) {
      form.setValue('has_size_variants', false);
    }
  }, [watchedHasColorVariants, watchedHasSizeVariants, form]);

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

    // Validate file size (max 10MB - will be compressed automatically)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 10MB`,
        variant: 'destructive',
      });
      return;
    }

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select a valid image file',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    
    try {
      setImagePreview(URL.createObjectURL(file));
      setImageFile(file);
      
      toast({
        title: 'Success',
        description: 'Image ready for upload (will be optimized to WebP)',
      });
    } catch (error) {
      console.error('Error preparing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to prepare image',
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
      // Optimize image with aggressive compression (~250KB)
      const { file: optimizedFile } = await prepareImageForUpload(imageFile, PRODUCT_COMPRESSION);
      const publicUrl = await uploadToR2(optimizedFile, 'products');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    }
  };

  const uploadAdditionalImages = async (productId: string): Promise<void> => {
    // Use the ref to upload images through the component
    if (additionalImagesRef.current?.hasNewImages()) {
      await additionalImagesRef.current.uploadImages(productId);
    }
  };

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    setLoading(true);
    try {
      console.log('Creating product with data:', data);

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImageAndGetUrl();
      } else if (imagePreview) {
        imageUrl = imagePreview;
      }

      const { ensureUploadedUrl } = await import('@/utils/r2Upload');
      imageUrl = await ensureUploadedUrl(imageUrl, 'products');

      // Convert care_instructions to array for Supabase text[] column
      const careInstructionsArray = data.care_instructions
        ? (Array.isArray(data.care_instructions)
            ? data.care_instructions.filter(Boolean)
            : data.care_instructions.split('\n').filter(Boolean))
        : ['Machine wash cold with similar colors', 'Do not bleach', 'Tumble dry low', 'Iron on low heat if needed'];

      // Convert meta_keywords string to array for Supabase text[] column
      const metaKeywordsArray = data.meta_keywords
        ? data.meta_keywords.split(',').map(k => k.trim()).filter(Boolean)
        : null;

      const productData = {
        name: data.name,
        description: data.description || null,
        cost_price: data.cost_price,
        selling_price: data.selling_price || null,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        is_featured: data.is_featured,
        has_color_variants: data.has_color_variants,
        color_has_size_variants: data.has_size_variants,
        status: data.status,
        image_url: imageUrl,
        material_composition: data.material_composition || 'Premium quality fabric blend designed for comfort and durability.',
        care_instructions: careInstructionsArray,
        // SEO fields
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        meta_keywords: metaKeywordsArray,
        og_title: data.og_title || null,
        og_description: data.og_description || null,
      };

      console.log('Product data to insert:', productData);

      // Cast to bypass TypeScript - actual Supabase schema has care_instructions as text[]
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(productData as any)
        .select()
        .single();

      if (error) throw error;

      console.log('Created product:', newProduct);
      setCreatedProductId(newProduct.id);

      // Create color variants and size variants first
      if (data.has_color_variants && colorVariants.length > 0) {
        await saveColorVariants(newProduct.id, data.has_size_variants);
      }

      // Upload additional images
      if (additionalImages.some(img => img.isNew)) {
        await uploadAdditionalImages(newProduct.id);
      }

      // Show inventory management popup
      setShowInventoryPopup(true);

      toast({
        title: 'Success',
        description: 'Product created successfully. Please configure inventory.',
      });

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

  const saveColorVariants = async (productId: string, hasSizeVariants: boolean) => {
    try {
      console.log('Saving color variants for product:', productId);
      
      const validVariants = colorVariants.filter(cv => cv.color_name.trim());
      if (validVariants.length === 0) return;

      const normalized = validVariants.map(cv => ({
        ...cv,
        color_name: cv.color_name.trim(),
        color_hex: cv.color_hex?.trim() || null,
      }));

      const uniqueColorNames = Array.from(new Set(normalized.map(v => v.color_name)));
      const colorIdByName = new Map<string, string>();

      for (const name of uniqueColorNames) {
        const hex = normalized.find(v => v.color_name === name)?.color_hex || null;
        const { data: upsertedColor, error: upsertColorError } = await supabase
          .from('colors')
          .upsert(
            {
              name,
              hex_code: hex,
            },
            { onConflict: 'name' }
          )
          .select('id, name')
          .single();

        if (upsertColorError) throw upsertColorError;
        if (upsertedColor?.id) {
          colorIdByName.set(name, upsertedColor.id);
        }
      }

      const { data: insertedColors, error: colorError } = await supabase
        .from('color_variants')
        .insert(
          normalized.map(cv => ({
            product_id: productId,
            color_name: cv.color_name,
            color_id: colorIdByName.get(cv.color_name) || null,
            image_url: cv.image_url || null,
            has_sizes: hasSizeVariants,
          }))
        )
        .select('id, color_name');

      if (colorError) throw colorError;

      console.log('Inserted color variants:', insertedColors);

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
              console.log('Inserted size variants for color:', insertedColor.color_name);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving color variants:', error);
      throw error;
    }
  };

  const handleInventoryComplete = () => {
    setShowInventoryPopup(false);
    onSave();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">Create New Product</h2>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="material_composition">Material Composition</Label>
                    <Textarea
                      id="material_composition"
                      {...form.register('material_composition')}
                      placeholder="e.g., Premium quality fabric blend designed for comfort and durability."
                      rows={2}
                    />
                  </div>
                  <div>
                    <CareInstructionsInput
                      value={form.watch('care_instructions') || []}
                      onChange={(value) => form.setValue('care_instructions', value)}
                    />
                  </div>
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
                          form.setValue('has_size_variants', false);
                        }
                      }}
                    />
                    <Label htmlFor="has_color_variants">Colors</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_size_variants"
                      checked={form.watch('has_size_variants')}
                      onCheckedChange={(checked) => {
                        form.setValue('has_size_variants', checked);
                      }}
                      disabled={!watchedHasColorVariants}
                    />
                    <Label htmlFor="has_size_variants" className={!watchedHasColorVariants ? 'text-gray-400' : ''}>
                      Sizes {!watchedHasColorVariants && '(Enable Colors first)'}
                    </Label>
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
                  <div className="flex gap-2 items-center">
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
                      {uploadingImage ? 'Preparing...' : 'Upload Image'}
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsMediaPickerOpen(true)}
                    >
                      <ImageIcon className="h-4 w-4 mr-2 text-primary" />
                      Media Library
                    </Button>
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

                {/* Additional Images Section */}
                <div className="mt-6 pt-4 border-t border-border">
                  <ProductAdditionalImages
                    ref={additionalImagesRef}
                    onImagesChange={setAdditionalImages}
                    maxImages={3}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEO Settings Section */}
        <ProductSEOSection
          metaTitle={form.watch('meta_title') || ''}
          metaDescription={form.watch('meta_description') || ''}
          metaKeywords={form.watch('meta_keywords') || ''}
          ogTitle={form.watch('og_title') || ''}
          ogDescription={form.watch('og_description') || ''}
          productName={form.watch('name') || ''}
          productDescription={form.watch('description') || ''}
          sellingPrice={form.watch('selling_price') || 0}
          categoryName={categories.find(c => c.id === form.watch('category_id'))?.name}
          onMetaTitleChange={(v) => form.setValue('meta_title', v)}
          onMetaDescriptionChange={(v) => form.setValue('meta_description', v)}
          onMetaKeywordsChange={(v) => form.setValue('meta_keywords', v)}
          onOgTitleChange={(v) => form.setValue('og_title', v)}
          onOgDescriptionChange={(v) => form.setValue('og_description', v)}
        />

        {(watchedHasColorVariants || watchedHasSizeVariants) && (
          <SmartProductVariantForm
            hasColorVariants={watchedHasColorVariants}
            hasSizeVariants={watchedHasSizeVariants}
            onVariantsChange={setColorVariants}
            hideStockFields={true}
          />
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>

      {showInventoryPopup && createdProductId && (
        <InventoryManagementPopup
          productId={createdProductId}
          onClose={handleInventoryComplete}
          isOpen={showInventoryPopup}
        />
      )}

      <MediaPicker
        open={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        folder="products"
        onSelect={(url) => {
          setImagePreview(url);
          setImageFile(null);
        }}
      />
    </div>
  );
}
