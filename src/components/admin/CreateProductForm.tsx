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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Eye, X, Package, Image, Palette, Check, Sparkles, Tag, DollarSign, Layers } from 'lucide-react';
import { SmartProductVariantForm } from './SmartProductVariantForm';
import { InventoryManagementPopup } from './InventoryManagementPopup';
import { ProductAdditionalImages, type AdditionalImage } from './ProductAdditionalImages';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';
import { CareInstructionsInput } from './CareInstructionsInput';
import { motion, AnimatePresence } from 'framer-motion';

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
  care_instructions: z.string().optional(),
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
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>([]);
  const additionalImagesRef = useRef<{ uploadImages: (productId: string) => Promise<boolean> } | null>(null);
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
      care_instructions: 'Machine wash cold with similar colors\nDo not bleach\nTumble dry low\nIron on low heat if needed',
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

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 2MB`,
        variant: 'destructive',
      });
      return;
    }

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
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setImageFile(file);
      
      toast({
        title: 'Image ready!',
        description: 'Will be optimized to WebP on save',
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
      const { file: optimizedFile } = await prepareImageForUpload(imageFile, PRODUCT_COMPRESSION);

      const fileName = `product-${Date.now()}.webp`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, optimizedFile, {
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
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
    const newImages = additionalImages.filter(img => img.isNew && img.file);
    
    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      if (!img.file) continue;

      try {
        const { file: optimizedFile } = await prepareImageForUpload(img.file, PRODUCT_COMPRESSION);

        const fileName = `product-additional-${productId}-${Date.now()}-${i}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, optimizedFile, {
            contentType: 'image/webp',
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: urlData.publicUrl,
            storage_path: fileName,
            is_primary: false,
            image_type: 'additional',
          });
      } catch (error) {
        console.error('Error uploading additional image:', error);
      }
    }
  };

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    setLoading(true);
    try {
      console.log('Creating product with data:', data);

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImageAndGetUrl();
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
        color_has_size_variants: data.has_size_variants,
        status: data.status,
        image_url: imageUrl,
        material_composition: data.material_composition || 'Premium quality fabric blend designed for comfort and durability.',
        care_instructions: data.care_instructions || 'Machine wash cold with similar colors\nDo not bleach\nTumble dry low\nIron on low heat if needed',
      };

      console.log('Product data to insert:', productData);

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;

      console.log('Created product:', newProduct);
      setCreatedProductId(newProduct.id);

      if (data.has_color_variants && colorVariants.length > 0) {
        await saveColorVariants(newProduct.id, data.has_size_variants);
      }

      if (additionalImages.some(img => img.isNew)) {
        await uploadAdditionalImages(newProduct.id);
      }

      setShowInventoryPopup(true);

      toast({
        title: '🎉 Product created!',
        description: 'Now configure your inventory.',
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onCancel}
                className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  New Product
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Fill in the details to add your product</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="hidden sm:flex rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={loading}
                className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-sm sm:text-base px-4 sm:px-6"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    />
                    <span className="hidden sm:inline">Creating...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Product</span>
                    <span className="sm:hidden">Create</span>
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Left Column - Images */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            {/* Main Image */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl sm:rounded-3xl border border-border/50 p-4 sm:p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Image className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Main Image</h3>
                  <p className="text-xs text-muted-foreground">1:1 square ratio</p>
                </div>
              </div>
              
              <div className="relative">
                {imagePreview ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative group"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl border-2 border-border bg-muted/30">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-xl sm:rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/90 hover:bg-white shadow-lg"
                          onClick={() => window.open(imagePreview, '_blank')}
                        >
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-lg"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3">
                      <span className="text-[10px] sm:text-xs bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full font-medium shadow-lg">
                        ✓ Ready
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <label htmlFor="image-upload" className="block cursor-pointer">
                    <div className="aspect-square w-full border-2 border-dashed border-primary/30 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all">
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4"
                      >
                        <Upload className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                      </motion.div>
                      <p className="text-sm sm:text-base font-semibold text-foreground">Drop image here</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">or click to browse</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3 bg-muted px-2 sm:px-3 py-1 rounded-full">Max 2MB • Auto-optimized</p>
                    </div>
                  </label>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </div>
            </motion.div>

            {/* Additional Images */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl sm:rounded-3xl border border-border/50 p-4 sm:p-6 shadow-sm"
            >
              <ProductAdditionalImages
                onImagesChange={setAdditionalImages}
                maxImages={3}
              />
            </motion.div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            {/* Basic Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl sm:rounded-3xl border border-border/50 p-4 sm:p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Basic Details</h3>
                  <p className="text-xs text-muted-foreground">Name, description & more</p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-5">
                {/* Product Name */}
                <div>
                  <Label htmlFor="name" className="text-xs sm:text-sm font-medium flex items-center gap-1 mb-1.5 sm:mb-2">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="e.g., Premium Cotton Socks"
                    className="h-10 sm:h-12 rounded-xl text-sm sm:text-base border-border/50 focus:border-primary"
                  />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-xs mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Describe your product..."
                    rows={3}
                    className="rounded-xl text-sm sm:text-base resize-none border-border/50 focus:border-primary"
                  />
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium flex items-center gap-1 mb-1.5 sm:mb-2">
                      <Tag className="h-3 w-3" /> Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.watch('category_id')}
                      onValueChange={(value) => form.setValue('category_id', value)}
                    >
                      <SelectTrigger className="h-10 sm:h-12 rounded-xl border-border/50 text-sm sm:text-base">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id} className="rounded-lg">
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category_id && (
                      <p className="text-destructive text-xs mt-1">{form.formState.errors.category_id.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium flex items-center gap-1 mb-1.5 sm:mb-2">
                      <Layers className="h-3 w-3" /> Subcategory <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.watch('subcategory_id')}
                      onValueChange={(value) => form.setValue('subcategory_id', value)}
                      disabled={!watchedCategoryId}
                    >
                      <SelectTrigger className="h-10 sm:h-12 rounded-xl border-border/50 text-sm sm:text-base">
                        <SelectValue placeholder={watchedCategoryId ? "Select subcategory" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {filteredSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id} className="rounded-lg">
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.subcategory_id && (
                      <p className="text-destructive text-xs mt-1">{form.formState.errors.subcategory_id.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Pricing */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl sm:rounded-3xl border border-border/50 p-4 sm:p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Pricing</h3>
                  <p className="text-xs text-muted-foreground">Set your prices</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="cost_price" className="text-xs sm:text-sm font-medium flex items-center gap-1 mb-1.5 sm:mb-2">
                    Cost Price <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm sm:text-base">Rs</span>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      {...form.register('cost_price', { valueAsNumber: true })}
                      placeholder="0"
                      className="h-10 sm:h-12 pl-9 sm:pl-12 rounded-xl text-sm sm:text-base border-border/50 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="selling_price" className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Selling Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm sm:text-base">Rs</span>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      {...form.register('selling_price', { valueAsNumber: true })}
                      placeholder="0"
                      className="h-10 sm:h-12 pl-9 sm:pl-12 rounded-xl text-sm sm:text-base border-border/50 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Variants & Options */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl sm:rounded-3xl border border-border/50 p-4 sm:p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Options & Variants</h3>
                  <p className="text-xs text-muted-foreground">Colors, sizes & status</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Toggle Cards */}
                <div 
                  onClick={() => form.setValue('is_featured', !form.watch('is_featured'))}
                  className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.watch('is_featured') 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center ${
                        form.watch('is_featured') ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <Sparkles className={`h-4 w-4 sm:h-5 sm:w-5 ${form.watch('is_featured') ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm">Featured</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Show on homepage</p>
                      </div>
                    </div>
                    <Switch
                      checked={form.watch('is_featured')}
                      onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                    />
                  </div>
                </div>

                <div 
                  onClick={() => {
                    const newValue = !form.watch('has_color_variants');
                    form.setValue('has_color_variants', newValue);
                    if (!newValue) {
                      setColorVariants([]);
                      form.setValue('has_size_variants', false);
                    }
                  }}
                  className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.watch('has_color_variants') 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center ${
                        form.watch('has_color_variants') ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <Palette className={`h-4 w-4 sm:h-5 sm:w-5 ${form.watch('has_color_variants') ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm">Colors</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Multiple colors</p>
                      </div>
                    </div>
                    <Switch
                      checked={form.watch('has_color_variants')}
                      onCheckedChange={(checked) => {
                        form.setValue('has_color_variants', checked);
                        if (!checked) {
                          setColorVariants([]);
                          form.setValue('has_size_variants', false);
                        }
                      }}
                    />
                  </div>
                </div>

                <div 
                  onClick={() => {
                    if (watchedHasColorVariants) {
                      form.setValue('has_size_variants', !form.watch('has_size_variants'));
                    }
                  }}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    !watchedHasColorVariants 
                      ? 'opacity-50 cursor-not-allowed border-border/30' 
                      : form.watch('has_size_variants')
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : 'border-border/50 hover:border-primary/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center ${
                        form.watch('has_size_variants') && watchedHasColorVariants ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <Layers className={`h-4 w-4 sm:h-5 sm:w-5 ${form.watch('has_size_variants') && watchedHasColorVariants ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm">Sizes</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {!watchedHasColorVariants ? 'Enable colors first' : 'Multiple sizes'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={form.watch('has_size_variants')}
                      onCheckedChange={(checked) => form.setValue('has_size_variants', checked)}
                      disabled={!watchedHasColorVariants}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="p-3 sm:p-4 rounded-xl border-2 border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-muted flex items-center justify-center">
                        <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${form.watch('status') === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm">Status</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Product visibility</p>
                      </div>
                    </div>
                    <Select
                      value={form.watch('status')}
                      onValueChange={(value: 'active' | 'inactive') => form.setValue('status', value)}
                    >
                      <SelectTrigger className="w-24 sm:w-28 h-8 sm:h-9 rounded-lg text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="active" className="rounded-lg text-xs sm:text-sm">Active</SelectItem>
                        <SelectItem value="inactive" className="rounded-lg text-xs sm:text-sm">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Material & Care */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl sm:rounded-3xl border border-border/50 p-4 sm:p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Material & Care</h3>
                  <p className="text-xs text-muted-foreground">Product details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="material_composition" className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Material</Label>
                  <Textarea
                    id="material_composition"
                    {...form.register('material_composition')}
                    placeholder="e.g., 100% Cotton"
                    rows={3}
                    className="rounded-xl text-sm sm:text-base resize-none border-border/50 focus:border-primary"
                  />
                </div>
                <CareInstructionsInput
                  value={form.watch('care_instructions') || ''}
                  onChange={(value) => form.setValue('care_instructions', value)}
                />
              </div>
            </motion.div>

            {/* Variants Form */}
            <AnimatePresence>
              {(watchedHasColorVariants || watchedHasSizeVariants) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <SmartProductVariantForm
                    hasColorVariants={watchedHasColorVariants}
                    hasSizeVariants={watchedHasSizeVariants}
                    onVariantsChange={setColorVariants}
                    hideStockFields={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Create Button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border/50 z-20">
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-base font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Create Product
              </span>
            )}
          </Button>
        </div>

        {/* Add padding for mobile fixed button */}
        <div className="lg:hidden h-20" />
      </form>

      {showInventoryPopup && createdProductId && (
        <InventoryManagementPopup
          productId={createdProductId}
          onClose={handleInventoryComplete}
          isOpen={showInventoryPopup}
        />
      )}
    </div>
  );
}
