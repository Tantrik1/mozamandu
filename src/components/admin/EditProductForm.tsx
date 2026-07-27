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
  Ruler
} from 'lucide-react';
import { EnhancedProductVariantForm, type EnhancedProductVariantFormRef } from './EnhancedProductVariantForm';
import { ProductFAQsManager } from './ProductFAQsManager';
import { InventoryManagementPopup } from './InventoryManagementPopup';
import { ProductAdditionalImages, type AdditionalImage, type ProductAdditionalImagesRef } from './ProductAdditionalImages';
import { ProductSEOSection } from './ProductSEOSection';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';
import { uploadToR2 } from '@/utils/r2Upload';
import { CareInstructionsInput } from './CareInstructionsInput';
import { MediaPicker } from './MediaPicker';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showInventoryPopup, setShowInventoryPopup] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>([]);
  const additionalImagesRef = useRef<ProductAdditionalImagesRef>(null);
  const variantFormRef = useRef<EnhancedProductVariantFormRef>(null);
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
      care_instructions: [],
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

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    fetchProductDetails();
  }, [productId]);

  useEffect(() => {
    if (watchedCategoryId) {
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

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      let careInstructions: string[] = [];
      if (data.care_instructions) {
        if (typeof data.care_instructions === 'string') {
          try {
            careInstructions = JSON.parse(data.care_instructions);
          } catch {
            careInstructions = [data.care_instructions];
          }
        } else if (Array.isArray(data.care_instructions)) {
          careInstructions = data.care_instructions;
        }
      }

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

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    setSaving(true);
    try {
      let finalImageUrl = imagePreview;
      if (imageFile) {
        const uploadedUrl = await uploadImageAndGetUrl();
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

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
          care_instructions: Array.isArray(data.care_instructions) 
            ? JSON.stringify(data.care_instructions) 
            : data.care_instructions || null,
          meta_title: data.meta_title || null,
          meta_description: data.meta_description || null,
          meta_keywords: data.meta_keywords || null,
          og_title: data.og_title || null,
          og_description: data.og_description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (productError) throw productError;

      if (additionalImagesRef.current?.hasNewImages()) {
        await additionalImagesRef.current.uploadImages(productId);
      }

      toast({
        title: 'Product Updated',
        description: `${data.name} changes saved successfully`,
      });

      if (data.has_color_variants || data.has_size_variants) {
        setShowInventoryPopup(true);
      } else {
        setShowInventoryPopup(true);
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: 'Submission Error',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-16">
      {/* Sticky Top Header Banner */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 shadow-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onCancel} className="hover:bg-accent rounded-lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Edit Product
                  <Badge variant={form.watch('status') === 'active' ? "default" : "secondary"} className="text-[10px] uppercase font-bold">
                    {form.watch('status')}
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{form.watch('name')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {watchedSellingPrice > 0 && watchedCostPrice > 0 && (
              <Badge variant={profitMarginPercent >= 0 ? "secondary" : "destructive"} className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs">
                <Percent className="h-3.5 w-3.5" />
                Profit: <span className="font-bold">+{profitMarginPercent}%</span> (Rs. {profitAmount})
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (watchedHasColorVariants || watchedHasSizeVariants) {
                  if (variantFormRef.current) {
                    variantFormRef.current.handleSave();
                  } else {
                    form.handleSubmit(onSubmit)();
                  }
                } else {
                  form.handleSubmit(onSubmit)();
                }
              }}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 shadow-md font-semibold px-5"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Save Variants & Manage Inventory
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Columns: Essential Info & Pricing */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Product Basic Information Card */}
              <Card className="shadow-sm border-border/80 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/2 to-transparent border-b border-border/60 py-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base font-semibold">General Information</CardTitle>
                      <CardDescription className="text-xs">Product title, description, and fabric specs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
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
                      <CardDescription className="text-xs">Financial rates and store taxonomy</CardDescription>
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
                      <CardDescription className="text-xs">Publish status and variant options</CardDescription>
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
                      <CardTitle className="text-base font-semibold font-semibold">Product Images</CardTitle>
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
                      productId={productId}
                      onImagesChange={setAdditionalImages}
                      maxImages={3}
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>

          {/* Variants Section (Positioned FIRST before SEO & FAQs) */}
          {(watchedHasColorVariants || watchedHasSizeVariants) && (
            <Card className="shadow-sm border-border/80 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-transparent border-b border-border/60 py-4">
                <div className="flex items-center space-x-2">
                  <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <CardTitle className="text-base font-semibold">Product Variants & Swatches</CardTitle>
                    <CardDescription className="text-xs">Color swatches, size grids, and variant images</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <EnhancedProductVariantForm
                  ref={variantFormRef}
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
                      await additionalImagesRef.current.uploadImages(productId);
                    }
                  }}
                  onSave={() => {
                    setShowInventoryPopup(true);
                  }}
                  onCancel={onCancel}
                />
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
            productName={form.watch('name')}
            productDescription={form.watch('description') || ''}
            sellingPrice={form.watch('selling_price') || form.watch('cost_price')}
            categoryName={categories.find(c => c.id === form.watch('category_id'))?.name}
            onMetaTitleChange={(value) => form.setValue('meta_title', value)}
            onMetaDescriptionChange={(value) => form.setValue('meta_description', value)}
            onMetaKeywordsChange={(value) => form.setValue('meta_keywords', value)}
            onOgTitleChange={(value) => form.setValue('og_title', value)}
            onOgDescriptionChange={(value) => form.setValue('og_description', value)}
          />

          {/* Product FAQs Manager Section (Positioned BELOW SEO) */}
          <ProductFAQsManager productId={productId} />

          {/* Unified Bottom CTA — always visible regardless of variant state */}
          {!(watchedHasColorVariants || watchedHasSizeVariants) && (
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
              <Button type="button" variant="outline" size="lg" onClick={onCancel} className="px-6">
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="lg" 
                disabled={saving} 
                className="bg-primary hover:bg-primary/90 px-8 font-semibold shadow-md"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4 mr-2" />
                    Save Variants & Manage Inventory
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>

      {showInventoryPopup && (
        <InventoryManagementPopup
          productId={productId}
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
