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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Eye, X, Check, Package, ImageIcon, DollarSign, FolderOpen, Sparkles, Star, Palette, Ruler, Shirt, FileText } from 'lucide-react';
import { EnhancedProductVariantForm } from './EnhancedProductVariantForm';
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

interface EditProductFormProps {
  productId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EditProductForm({ productId, onSave, onCancel }: EditProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showInventoryPopup, setShowInventoryPopup] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>([]);
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
      material_composition: '',
      care_instructions: '',
    },
  });

  const watchedCategoryId = form.watch('category_id');
  const watchedHasColorVariants = form.watch('has_color_variants');
  const watchedHasSizeVariants = form.watch('has_size_variants');

  useEffect(() => {
    const initializeData = async () => {
      setLoadingData(true);
      try {
        await Promise.all([
          fetchCategories(),
          fetchSubcategories(),
          fetchProduct()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    initializeData();
  }, [productId]);

  useEffect(() => {
    if (watchedCategoryId && subcategories.length > 0) {
      const filtered = subcategories.filter(sub => sub.category_id === watchedCategoryId);
      setFilteredSubcategories(filtered);
    } else {
      setFilteredSubcategories([]);
    }
  }, [watchedCategoryId, subcategories]);

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
        has_size_variants: product.color_has_size_variants || false,
        status: (product.status === 'active' || product.status === 'inactive') ? product.status : 'active',
        material_composition: product.material_composition || '',
        care_instructions: product.care_instructions || '',
      });

      setImagePreview(product.image_url);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product',
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: `File size exceeds 2MB limit`,
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
        description: 'Will be optimized on save',
      });
    } catch (error) {
      console.error('Error preparing image:', error);
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

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, optimizedFile, { contentType: 'image/webp' });

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

  const uploadAdditionalImages = async (): Promise<void> => {
    const newImages = additionalImages.filter(img => img.isNew && img.file);
    
    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      if (!img.file) continue;

      try {
        const { file: optimizedFile } = await prepareImageForUpload(img.file, PRODUCT_COMPRESSION);
        const fileName = `product-additional-${productId}-${Date.now()}-${i}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, optimizedFile, { contentType: 'image/webp' });

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
        color_has_size_variants: data.has_size_variants,
        status: data.status,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
        material_composition: data.material_composition || null,
        care_instructions: data.care_instructions || null,
      };

      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId);

      if (error) throw error;

      if (additionalImages.some(img => img.isNew)) {
        await uploadAdditionalImages();
      }

      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });

      if (!data.has_color_variants && !data.has_size_variants) {
        setShowInventoryPopup(true);
      } else {
        onSave();
      }
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

  const handleInventoryClose = () => {
    setShowInventoryPopup(false);
    onSave();
  };

  // Section Card Component
  const SectionCard = ({ 
    icon: Icon, 
    title, 
    description, 
    children 
  }: { 
    icon: React.ElementType; 
    title: string; 
    description?: string; 
    children: React.ReactNode;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </motion.div>
  );

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 border-3 border-primary/30 border-t-primary rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Loading product...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onCancel}
                className="h-9 w-9 rounded-xl hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Edit Product
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Update your product details</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} className="hidden sm:flex rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={loading}
                className="rounded-xl bg-primary shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Info */}
            <SectionCard icon={FileText} title="Basic Information" description="Product name and description">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product Name *</Label>
                  <Input
                    {...form.register('name')}
                    placeholder="Enter product name"
                    className="rounded-xl h-11 border-border/50 focus:border-primary"
                  />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-xs mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label>
                  <Textarea
                    {...form.register('description')}
                    placeholder="Describe your product..."
                    rows={4}
                    className="rounded-xl border-border/50 focus:border-primary resize-none"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Product Details */}
            <SectionCard icon={Shirt} title="Product Details" description="Material and care instructions">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Material Composition</Label>
                  <Textarea
                    {...form.register('material_composition')}
                    placeholder="e.g., 100% Cotton, Premium fabric blend..."
                    rows={2}
                    className="rounded-xl border-border/50 focus:border-primary resize-none"
                  />
                </div>

                <CareInstructionsInput
                  value={form.watch('care_instructions') || ''}
                  onChange={(value) => form.setValue('care_instructions', value)}
                />
              </div>
            </SectionCard>

            {/* Pricing */}
            <SectionCard icon={DollarSign} title="Pricing" description="Cost and selling prices">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cost Price (Rs) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('cost_price', { valueAsNumber: true })}
                      placeholder="0.00"
                      className="rounded-xl h-11 pl-8 border-border/50 focus:border-primary"
                    />
                  </div>
                  {form.formState.errors.cost_price && (
                    <p className="text-destructive text-xs mt-1">{form.formState.errors.cost_price.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Selling Price (Rs)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('selling_price', { valueAsNumber: true })}
                      placeholder="0.00"
                      className="rounded-xl h-11 pl-8 border-border/50 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Organization */}
            <SectionCard icon={FolderOpen} title="Organization" description="Category and subcategory">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category *</Label>
                  <Select
                    value={form.watch('category_id')}
                    onValueChange={(value) => {
                      form.setValue('category_id', value);
                      form.setValue('subcategory_id', '');
                    }}
                  >
                    <SelectTrigger className="rounded-xl h-11 border-border/50">
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
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subcategory *</Label>
                  <Select
                    value={form.watch('subcategory_id')}
                    onValueChange={(value) => form.setValue('subcategory_id', value)}
                    disabled={!watchedCategoryId || filteredSubcategories.length === 0}
                  >
                    <SelectTrigger className="rounded-xl h-11 border-border/50">
                      <SelectValue placeholder={
                        !watchedCategoryId 
                          ? "Select category first" 
                          : "Select subcategory"
                      } />
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
              </div>
            </SectionCard>

            {/* Variants Section */}
            {(watchedHasColorVariants || watchedHasSizeVariants) && (
              <EnhancedProductVariantForm
                productId={productId}
                hasColorVariants={watchedHasColorVariants}
                hasSizeVariants={watchedHasSizeVariants}
                getProductData={() => ({
                  name: form.getValues('name'),
                  description: form.getValues('description'),
                  cost_price: form.getValues('cost_price'),
                  selling_price: form.getValues('selling_price'),
                  category_id: form.getValues('category_id'),
                  subcategory_id: form.getValues('subcategory_id'),
                  is_featured: form.getValues('is_featured'),
                  has_color_variants: form.getValues('has_color_variants'),
                  has_size_variants: form.getValues('has_size_variants'),
                  status: form.getValues('status'),
                })}
                imageFile={imageFile}
                imagePreview={imagePreview}
                onSave={() => setShowInventoryPopup(true)}
                onCancel={onCancel}
              />
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            
            {/* Status & Visibility */}
            <SectionCard icon={Sparkles} title="Status">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value: 'active' | 'inactive') => form.setValue('status', value)}
                  >
                    <SelectTrigger className="rounded-xl h-11 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Active
                        </span>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                          Inactive
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Featured Product</span>
                  </div>
                  <Switch
                    checked={form.watch('is_featured')}
                    onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Variants Toggle */}
            <SectionCard icon={Palette} title="Variants" description="Color and size options">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Color Variants</span>
                  </div>
                  <Switch
                    checked={form.watch('has_color_variants')}
                    onCheckedChange={(checked) => {
                      form.setValue('has_color_variants', checked);
                      if (!checked) form.setValue('has_size_variants', false);
                    }}
                  />
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl border border-border/50 transition-all ${
                  watchedHasColorVariants ? 'bg-muted/50' : 'bg-muted/20 opacity-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-primary" />
                    <div>
                      <span className="text-sm font-medium">Size Variants</span>
                      {!watchedHasColorVariants && (
                        <p className="text-[10px] text-muted-foreground">Enable colors first</p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={form.watch('has_size_variants')}
                    onCheckedChange={(checked) => form.setValue('has_size_variants', checked)}
                    disabled={!watchedHasColorVariants}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Media */}
            <SectionCard icon={ImageIcon} title="Media" description="Product images">
              <div className="space-y-4">
                {/* Main Image */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Main Image</Label>
                  {imagePreview ? (
                    <div className="relative">
                      <div className="aspect-square w-full overflow-hidden rounded-xl border-2 border-border bg-muted/30">
                        <img
                          src={imagePreview}
                          alt="Product"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-sm shadow-sm"
                          onClick={() => window.open(imagePreview, '_blank')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 rounded-lg shadow-sm"
                          onClick={removeImage}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <span className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded-md font-medium">
                          1:1
                        </span>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="image-upload" className="cursor-pointer block">
                      <div className="aspect-square w-full border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-medium">Upload Image</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">1:1 ratio • max 2MB</p>
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
                  {imagePreview && (
                    <label
                      htmlFor="image-upload"
                      className="mt-2 cursor-pointer inline-flex items-center justify-center w-full px-3 py-2 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Change Image
                    </label>
                  )}
                </div>

                {/* Additional Images */}
                <div className="pt-4 border-t border-border/50">
                  <ProductAdditionalImages
                    productId={productId}
                    onImagesChange={setAdditionalImages}
                    maxImages={3}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Bottom Save Button for Mobile */}
        {!(watchedHasColorVariants || watchedHasSizeVariants) && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border">
            <Button 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={loading}
              className="w-full rounded-xl h-12 bg-primary shadow-lg shadow-primary/25"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>

      {showInventoryPopup && (
        <InventoryManagementPopup
          productId={productId}
          onClose={handleInventoryClose}
          isOpen={showInventoryPopup}
        />
      )}
    </div>
  );
}
