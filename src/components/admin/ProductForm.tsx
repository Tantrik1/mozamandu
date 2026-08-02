import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Eye,
  X,
  ImageIcon,
  Package,
  DollarSign,
  Tag,
  Layers,
  Sparkles,
  Percent,
  CheckCircle2,
  AlertCircle,
  FileText,
  Palette,
  Ruler,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartProductVariantForm } from './SmartProductVariantForm';
import { EnhancedProductVariantForm, type EnhancedProductVariantFormRef } from './EnhancedProductVariantForm';
import { ProductFAQsManager } from './ProductFAQsManager';
import { InventoryManagementPopup } from './InventoryManagementPopup';
import { ProductAdditionalImages, type AdditionalImage, type ProductAdditionalImagesRef } from './ProductAdditionalImages';
import { ProductSEOSection } from './ProductSEOSection';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';
import { uploadToR2 } from '@/utils/r2Upload';
import { CareInstructionsInput } from './CareInstructionsInput';
import { MediaPicker } from './MediaPicker';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { useProductFormData, type Category } from '@/hooks/useProductFormData';

// ─── Shared Schema ────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(120, 'Name must be under 120 characters'),
  description: z.string().optional(),
  cost_price: z.number().min(0, 'Cost price must be positive'),
  selling_price: z.number().min(0, 'Selling price must be positive').optional(),
  category_id: z.string().min(1, 'Please select a category'),
  subcategory_id: z.string().min(1, 'Please select a subcategory'),
  is_featured: z.boolean().default(false),
  has_color_variants: z.boolean().default(false),
  has_size_variants: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  material_composition: z.string().optional(),
  care_instructions: z.union([z.string(), z.array(z.string())]).optional(),
  meta_title: z.string().max(60).optional(),
  meta_description: z.string().max(160).optional(),
  meta_keywords: z.string().optional(),
  og_title: z.string().max(60).optional(),
  og_description: z.string().max(160).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// ─── Interfaces ───────────────────────────────────────────────────────────────

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

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  onSave: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductForm({ mode, productId, onSave, onCancel }: ProductFormProps) {
  const isEdit = mode === 'edit';

  // Cached categories & subcategories (Recommendation 5)
  const { categories, subcategories } = useProductFormData();

  const [filteredSubcategories, setFilteredSubcategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(isEdit); // Only edit mode starts with loading
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showInventoryPopup, setShowInventoryPopup] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>([]);
  const additionalImagesRef = useRef<ProductAdditionalImagesRef>(null);
  const variantFormRef = useRef<EnhancedProductVariantFormRef>(null);
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
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
      material_composition: isEdit ? '' : '100% Combed Cotton blend designed for daily comfort and breathability.',
      care_instructions: isEdit ? [] : ['Machine wash cold with similar colors', 'Do not bleach', 'Tumble dry low', 'Iron on low heat if needed'],
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
  const watchedCostPrice = form.watch('cost_price') || 0;
  const watchedSellingPrice = form.watch('selling_price') || 0;

  const profitAmount = watchedSellingPrice > 0 ? watchedSellingPrice - watchedCostPrice : 0;
  const profitMarginPercent = watchedCostPrice > 0 && watchedSellingPrice > 0
    ? Math.round(((watchedSellingPrice - watchedCostPrice) / watchedCostPrice) * 100)
    : 0;

  // The effective product ID — for edit mode it's the prop, for create mode it's set after creation
  const effectiveProductId = isEdit ? productId! : createdProductId;

  // ─── Recommendation 6: Prevent form loss on page reload ─────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  // ─── Edit mode: Fetch product details ───────────────────────────────────────
  useEffect(() => {
    if (isEdit && productId) {
      fetchProductDetails();
    }
  }, [productId]);

  // ─── Filter subcategories by selected category ──────────────────────────────
  useEffect(() => {
    if (watchedCategoryId) {
      const filtered = subcategories.filter(sub => sub.category_id === watchedCategoryId);
      setFilteredSubcategories(filtered);
      // Only reset subcategory in create mode (edit should retain loaded value)
      if (!isEdit || !loading) {
        // Check if the current subcategory is still valid for the new category
        const currentSubcategoryId = form.getValues('subcategory_id');
        if (currentSubcategoryId && !filtered.some(s => s.id === currentSubcategoryId)) {
          form.setValue('subcategory_id', '');
        }
      }
    } else {
      setFilteredSubcategories([]);
    }
  }, [watchedCategoryId, subcategories]);

  // ─── Enforce: size variants require color variants ──────────────────────────
  useEffect(() => {
    if (!watchedHasColorVariants && watchedHasSizeVariants) {
      form.setValue('has_size_variants', false);
    }
  }, [watchedHasColorVariants, watchedHasSizeVariants, form]);

  // ─── Data fetching (edit mode only) ─────────────────────────────────────────
  const fetchProductDetails = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      // care_instructions is TEXT[] in PostgreSQL — Supabase returns it as string[]
      const careInstructions: string[] = Array.isArray(data.care_instructions)
        ? data.care_instructions
        : [];

      const prod = data as any;
      form.reset({
        name: prod.name || '',
        description: prod.description || '',
        cost_price: prod.cost_price || 0,
        selling_price: prod.selling_price || 0,
        category_id: prod.category_id || '',
        subcategory_id: prod.subcategory_id || '',
        is_featured: prod.is_featured || false,
        has_color_variants: prod.has_color_variants || false,
        has_size_variants: prod.color_has_size_variants || false,
        status: (prod.status as 'active' | 'inactive') || 'active',
        material_composition: prod.material_composition || '',
        care_instructions: careInstructions,
        meta_title: prod.meta_title || '',
        meta_description: prod.meta_description || '',
        meta_keywords: prod.meta_keywords || '',
        og_title: prod.og_title || '',
        og_description: prod.og_description || '',
      });

      if (data.image_url) {
        setImagePreview(data.image_url);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Image handlers ─────────────────────────────────────────────────────────
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImageAndGetUrl = async (): Promise<string | null> => {
    if (!imageFile) return null;
    try {
      const { file: optimizedFile } = await prepareImageForUpload(imageFile, PRODUCT_COMPRESSION);
      const publicUrl = await uploadToR2(optimizedFile, 'products');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to upload image to Cloudflare R2',
        variant: 'destructive',
      });
      return null;
    }
  };

  // ─── Submit handler (unified for create & edit) ─────────────────────────────
  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      let finalImageUrl = imagePreview;
      if (imageFile) {
        const uploadedUrl = await uploadImageAndGetUrl();
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      const careInstructionsValue = (Array.isArray(data.care_instructions)
        ? data.care_instructions.map(s => String(s).trim()).filter(Boolean)
        : (data.care_instructions ? [String(data.care_instructions).trim()].filter(Boolean) : null)) as any;

      if (isEdit) {
        // ─── Edit: UPDATE ─────────────────────────────────────────────────────
        const { error: productError } = await supabase
          .from('products')
          .update({
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
            image_url: finalImageUrl || null,
            material_composition: data.material_composition || null,
            care_instructions: careInstructionsValue,
            meta_title: data.meta_title || null,
            meta_description: data.meta_description || null,
            meta_keywords: data.meta_keywords || null,
            og_title: data.og_title || null,
            og_description: data.og_description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId!);

        if (productError) throw productError;

        if (additionalImagesRef.current?.hasNewImages()) {
          await additionalImagesRef.current.uploadImages(productId!);
        }

        toast({
          title: 'Product Updated',
          description: `${data.name} changes saved successfully`,
        });
      } else {
        // ─── Create: INSERT ───────────────────────────────────────────────────
        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
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
            image_url: finalImageUrl || null,
            material_composition: data.material_composition || null,
            care_instructions: careInstructionsValue,
            meta_title: data.meta_title || null,
            meta_description: data.meta_description || null,
            meta_keywords: data.meta_keywords || null,
            og_title: data.og_title || null,
            og_description: data.og_description || null,
          })
          .select()
          .single();

        if (productError) throw productError;

        const newProductId = productData.id;
        setCreatedProductId(newProductId);

        if (additionalImagesRef.current?.hasNewImages()) {
          await additionalImagesRef.current.uploadImages(newProductId);
        }

        if ((data.has_color_variants || data.has_size_variants) && colorVariants.length > 0) {
          await saveVariantsToDatabase(newProductId);
        }

        toast({
          title: 'Product Created Successfully',
          description: `${data.name} has been created and registered in the store catalog`,
        });
      }

      setShowInventoryPopup(true);
    } catch (error: any) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} product:`, error);
      toast({
        title: 'Submission Error',
        description: error.message || `Failed to ${isEdit ? 'update' : 'create'} product`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Create mode only: save variants to database ────────────────────────────
  const saveVariantsToDatabase = async (newProductId: string) => {
    try {
      const validColors = colorVariants.filter(cv => cv.color_name.trim());
      if (validColors.length === 0) return;

      const { data: insertedColors, error: colorError } = await supabase
        .from('color_variants')
        .insert(
          validColors.map(cv => ({
            product_id: newProductId,
            color_name: cv.color_name,
            color_hex: cv.color_hex || '#000000',
            image_url: cv.image_url || null,
            has_sizes: cv.has_sizes,
          }))
        )
        .select();

      if (colorError) throw colorError;

      if (insertedColors && insertedColors.length > 0) {
        for (let i = 0; i < validColors.length; i++) {
          const variant = validColors[i];
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
    } catch (error) {
      console.error('Error saving variants:', error);
      throw error;
    }
  };

  // ─── Save button click handler ──────────────────────────────────────────────
  const handleSaveClick = () => {
    if (isEdit && (watchedHasColorVariants || watchedHasSizeVariants)) {
      if (variantFormRef.current) {
        variantFormRef.current.handleSave();
      } else {
        form.handleSubmit(onSubmit)();
      }
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  const isSaving = saving;

  // ─── Loading state (edit mode only) ─────────────────────────────────────────
  if (loading && isEdit) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-16">
      {/* Sticky Top Header Banner — Locks at top of main scroll container */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 shadow-xs px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">

          {/* Left: Back Button + Product Title */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7.5 sm:h-8 w-7.5 sm:w-auto px-0 sm:px-3 hover:bg-cyan-500/10 rounded-full text-[11px] sm:text-xs font-semibold shrink-0 border border-cyan-500/20 hover:border-cyan-500/40 text-foreground transition-all active:scale-95 backdrop-blur-md shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:mr-1.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
              <div className="p-1.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <h1 className="text-xs sm:text-base font-bold tracking-tight text-foreground truncate max-w-[90px] xs:max-w-[140px] sm:max-w-xs md:max-w-md">
                {isEdit
                  ? `Edit ${form.watch('name') || 'Product'}`
                  : (form.watch('name') ? `Create ${form.watch('name')}` : 'Create New Product')}
              </h1>
            </div>
          </div>

          {/* Right: Profit Margin Badge + Cancel + Save */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Profit Margin Small Badge on left side of Cancel button */}
            {watchedSellingPrice > 0 && watchedCostPrice > 0 && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 sm:px-3.5 h-7.5 sm:h-8 rounded-full text-[11px] sm:text-xs font-extrabold transition-all shrink-0 border shadow-2xs backdrop-blur-md",
                  profitAmount >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-emerald-500/10"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-rose-500/10"
                )}
                title={`Cost: Rs. ${watchedCostPrice.toLocaleString()} | Selling: Rs. ${watchedSellingPrice.toLocaleString()} | Profit: Rs. ${profitAmount.toLocaleString()}`}
              >
                <span>{profitMarginPercent >= 0 ? `+${profitMarginPercent}%` : `${profitMarginPercent}%`} <span className="hidden xs:inline">Margin</span></span>
                <span className="text-[10px] opacity-85 hidden md:inline font-bold">
                  (Rs. {profitAmount.toLocaleString()})
                </span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-7.5 sm:h-8 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-bold rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500/60 shadow-2xs hover:shadow-xs shadow-rose-500/10 active:scale-95 transition-all backdrop-blur-md"
            >
              Cancel
            </Button>

            {/* Futuristic 21st.dev ButtonColorful Save Button */}
            <ButtonColorful
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
              className="h-7.5 sm:h-8 px-3.5 sm:px-4.5 text-[11px] sm:text-xs"
            >
              {isSaving ? (
                <>
                  <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin sm:mr-1" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1 text-white fill-white/20" />
                  <span className="hidden sm:inline">
                    {isEdit ? 'Save Variants & Inventory' : 'Save & Manage Inventory'}
                  </span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </ButtonColorful>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">

            {/* Left 2 Columns: Essential Info & Pricing */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-8">

              {/* Product Basic Information Card */}
              <Card className="shadow-sm border-border/80 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/2 to-transparent border-b border-border/60 py-3 sm:py-4 px-4 sm:px-6">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <CardTitle className="text-sm sm:text-base font-semibold">
                        {isEdit ? 'General Information' : 'General Details'}
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-xs">
                        {isEdit ? 'Product title, description, and fabric specs' : 'Title, description, and fabric details'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-1">
                      Product Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="e.g. Adidas Ankle Box Socks (4pc Pack)"
                      className="text-base font-medium h-11 focus-visible:ring-primary"
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold">
                      Product Description
                    </Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Write a clear, engaging description highlighting fabric quality, comfort, and durability..."
                      rows={4}
                      className="resize-y min-h-[100px]"
                    />
                  </div>

                  {/* Material Composition Row */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="material_composition" className="text-sm font-semibold">
                      Material Composition
                    </Label>
                    <Textarea
                      id="material_composition"
                      {...form.register('material_composition')}
                      placeholder="e.g. Premium quality fabric blend designed for comfort and durability."
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Categories Card */}
              <Card className="shadow-sm border-border/80 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent border-b border-border/60 py-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">Pricing & Category Classification</CardTitle>
                      <CardDescription className="text-xs">
                        {isEdit ? 'Financial rates and store taxonomy' : 'Set financial parameters and taxonomy'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                  {/* Price Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="cost_price" className="text-sm font-semibold flex items-center gap-1">
                        Cost Price (Rs.) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">Rs.</span>
                        <Input
                          id="cost_price"
                          type="number"
                          step="0.01"
                          {...form.register('cost_price', { valueAsNumber: true })}
                          placeholder="0.00"
                          className="pl-11 h-11 font-medium"
                        />
                      </div>
                      {form.formState.errors.cost_price && (
                        <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {form.formState.errors.cost_price.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="selling_price" className="text-sm font-semibold">
                        Selling Price (Rs.)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">Rs.</span>
                        <Input
                          id="selling_price"
                          type="number"
                          step="0.01"
                          {...form.register('selling_price', { valueAsNumber: true })}
                          placeholder="0.00"
                          className="pl-11 h-11 font-medium text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Taxonomy Category Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-semibold flex items-center gap-1">
                        Category <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.watch('category_id')}
                        onValueChange={(value) => form.setValue('category_id', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.category_id && (
                        <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {form.formState.errors.category_id.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subcategory" className="text-sm font-semibold flex items-center gap-1">
                        Subcategory <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.watch('subcategory_id')}
                        onValueChange={(value) => form.setValue('subcategory_id', value)}
                        disabled={!watchedCategoryId}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={watchedCategoryId ? "Select Subcategory" : "Select Category First"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSubcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.subcategory_id && (
                        <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {form.formState.errors.subcategory_id.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Care Instructions Card (Separate Box Below Pricing) */}
              <Card className="shadow-sm border-border/80 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent border-b border-border/60 py-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">Care Instructions</CardTitle>
                      <CardDescription className="text-xs">Washing, drying & fabric care guidelines</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <CareInstructionsInput
                    value={form.watch('care_instructions') || []}
                    onChange={(value) => form.setValue('care_instructions', value)}
                  />
                </CardContent>
              </Card>

            </div>

            {/* Right Column: Visibility FIRST, Media SECOND */}
            <div className="space-y-8">

              {/* Status & Options Toggles Card (Positioned FIRST) */}
              <Card className="shadow-sm border-border/80 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500/5 via-transparent to-transparent border-b border-border/60 py-4">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">Visibility & Options</CardTitle>
                      <CardDescription className="text-xs">
                        {isEdit ? 'Publish status and variant options' : 'Publish status and variant toggles'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Catalog Status
                    </Label>
                    <Select
                      value={form.watch('status')}
                      onValueChange={(value: 'active' | 'inactive') => form.setValue('status', value)}
                    >
                      <SelectTrigger className="h-10 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <span className="flex items-center gap-2 font-medium text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active (Visible on Store)
                          </span>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <span className="flex items-center gap-2 font-medium text-gray-500">
                            <span className="h-2 w-2 rounded-full bg-gray-400" /> Inactive (Hidden / Draft)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-px bg-border my-2" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_featured" className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          Featured Product
                        </Label>
                        <p className="text-xs text-muted-foreground">Display in hero & featured collections</p>
                      </div>
                      <Switch
                        id="is_featured"
                        checked={form.watch('is_featured')}
                        onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="has_color_variants" className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                          <Palette className="h-4 w-4 text-blue-500" />
                          Has Color Variants
                        </Label>
                        <p className="text-xs text-muted-foreground">Enable custom color swatches & images</p>
                      </div>
                      <Switch
                        id="has_color_variants"
                        checked={form.watch('has_color_variants')}
                        onCheckedChange={(checked) => {
                          form.setValue('has_color_variants', checked);
                          if (!checked) {
                            if (!isEdit) setColorVariants([]);
                            form.setValue('has_size_variants', false);
                          }
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="has_size_variants"
                          className={`text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${!watchedHasColorVariants ? 'opacity-50' : ''}`}
                        >
                          <Ruler className="h-4 w-4 text-emerald-500" />
                          Has Size Variants
                        </Label>
                        <p className="text-xs text-muted-foreground">Enable size options per color</p>
                      </div>
                      <Switch
                        id="has_size_variants"
                        checked={form.watch('has_size_variants')}
                        onCheckedChange={(checked) => form.setValue('has_size_variants', checked)}
                        disabled={!watchedHasColorVariants}
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Media Card (Positioned SECOND) */}
              <Card className="shadow-sm border-border/80 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/5 via-transparent to-transparent border-b border-border/60 py-4">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">Product Images</CardTitle>
                      <CardDescription className="text-xs">Primary cover & gallery assets</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Primary Cover Image</Label>

                    {/* Interactive Dropzone Card directly opens Media Library */}
                    {imagePreview ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-border bg-muted/30 aspect-square flex items-center justify-center">
                        <img
                          src={imagePreview}
                          alt="Product Cover Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="rounded-full h-9 w-9 bg-white/90 text-black hover:bg-white"
                            onClick={() => window.open(imagePreview, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="rounded-full h-9 w-9"
                            onClick={removeImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] border-none font-medium">
                          Primary Cover
                        </Badge>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsMediaPickerOpen(true)}
                        className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center space-y-3 group"
                      >
                        <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Click to open Media Library & Upload</p>
                          <p className="text-xs text-muted-foreground mt-1">Pick existing image or upload new file to R2</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Images Section */}
                  <div className="pt-4 border-t border-border">
                    <ProductAdditionalImages
                      ref={additionalImagesRef}
                      productId={isEdit ? productId : undefined}
                      onImagesChange={setAdditionalImages}
                      maxImages={3}
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>

          {/* Variants Section (Positioned ABOVE SEO & FAQ) */}
          {(watchedHasColorVariants || watchedHasSizeVariants) && (
            <Card className="shadow-sm border-border/80 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-transparent border-b border-border/60 py-4">
                <div className="flex items-center space-x-2">
                  <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <CardTitle className="text-base font-semibold">Product Variants & Swatches</CardTitle>
                    <CardDescription className="text-xs">
                      {isEdit ? 'Color swatches, size grids, and variant images' : 'Configure color swatches, size grids, and variant images'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isEdit ? (
                  <EnhancedProductVariantForm
                    ref={variantFormRef}
                    productId={productId!}
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
                      material_composition: form.getValues('material_composition'),
                      care_instructions: form.getValues('care_instructions'),
                      meta_title: form.getValues('meta_title'),
                      meta_description: form.getValues('meta_description'),
                      meta_keywords: form.getValues('meta_keywords'),
                      og_title: form.getValues('og_title'),
                      og_description: form.getValues('og_description'),
                    })}
                    imageFile={imageFile}
                    imagePreview={imagePreview}
                    onBeforeSave={async () => {
                      if (additionalImagesRef.current?.hasNewImages()) {
                        await additionalImagesRef.current.uploadImages(productId!);
                      }
                    }}
                    onSave={() => {
                      setShowInventoryPopup(true);
                    }}
                    onCancel={onCancel}
                  />
                ) : (
                  <SmartProductVariantForm
                    hasColorVariants={watchedHasColorVariants}
                    hasSizeVariants={watchedHasSizeVariants}
                    onVariantsChange={setColorVariants}
                    hideStockFields={true}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* SEO Settings Section */}
          <ProductSEOSection
            metaTitle={form.watch('meta_title') || ''}
            metaDescription={form.watch('meta_description') || ''}
            metaKeywords={form.watch('meta_keywords') || ''}
            ogTitle={form.watch('og_title') || ''}
            ogDescription={form.watch('og_description') || ''}
            productName={form.watch('name') || ''}
            productDescription={form.watch('description') || ''}
            sellingPrice={isEdit
              ? (form.watch('selling_price') || form.watch('cost_price'))
              : (form.watch('selling_price') || 0)}
            categoryName={categories.find(c => c.id === form.watch('category_id'))?.name}
            onMetaTitleChange={(v) => form.setValue('meta_title', v)}
            onMetaDescriptionChange={(v) => form.setValue('meta_description', v)}
            onMetaKeywordsChange={(v) => form.setValue('meta_keywords', v)}
            onOgTitleChange={(v) => form.setValue('og_title', v)}
            onOgDescriptionChange={(v) => form.setValue('og_description', v)}
          />

          {/* Product FAQs Section (Positioned BELOW SEO) */}
          {isEdit ? (
            <ProductFAQsManager productId={productId!} />
          ) : (
            createdProductId && <ProductFAQsManager productId={createdProductId} />
          )}

          {/* Unified Bottom CTA — always visible regardless of variant state */}
          {!(watchedHasColorVariants || watchedHasSizeVariants) && (
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-border">
              <Button type="button" variant="outline" size="lg" onClick={onCancel} className="w-full sm:w-auto px-6">
                Cancel
              </Button>
              <ButtonColorful
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-8 h-11 text-xs"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 text-white fill-white/20" />
                    Save & Manage Inventory
                  </>
                )}
              </ButtonColorful>
            </div>
          )}
        </form>
      </div>

      {showInventoryPopup && (isEdit ? productId : createdProductId) && (
        <InventoryManagementPopup
          productId={(isEdit ? productId : createdProductId)!}
          onClose={() => {
            setShowInventoryPopup(false);
            onSave();
          }}
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
