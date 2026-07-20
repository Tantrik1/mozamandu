import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Upload, Eye, X, Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
  isNew?: boolean;
  toDelete?: boolean;
}

interface ColorVariant {
  id?: string;
  color_name: string;
  color_hex?: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
  isNew?: boolean;
  toDelete?: boolean;
}

interface InventoryRecord {
  id?: string;
  sku: string;
  stock_quantity: number;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number;
  color_variant_id?: string;
  size_variant_id?: string;
  is_active: boolean;
}

interface ProductData {
  name?: string;
  description?: string;
  cost_price?: number;
  selling_price?: number;
  category_id?: string;
  subcategory_id?: string;
  is_featured?: boolean;
  has_color_variants?: boolean;
  has_size_variants?: boolean;
  status?: 'active' | 'inactive';
  // Phase 1: Include ALL product fields
  material_composition?: string;
  care_instructions?: string | string[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
}

interface EnhancedProductVariantFormProps {
  productId: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  getProductData: () => ProductData;
  imageFile: File | null;
  imagePreview: string | null;
  onBeforeSave?: () => Promise<void>;
  onSave: () => void;
  onCancel: () => void;
}

export function EnhancedProductVariantForm({
  productId,
  hasColorVariants,
  hasSizeVariants,
  getProductData,
  imageFile,
  imagePreview,
  onBeforeSave,
  onSave,
  onCancel,
}: EnhancedProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [productInfo, setProductInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingData();
  }, [productId]);

  const fetchExistingData = async () => {
    setLoading(true);
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProductInfo(product);

      if (hasColorVariants) {
        await fetchExistingVariants();
      }

      await fetchExistingInventory();
    } catch (error) {
      console.error('Error fetching existing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load existing product data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingVariants = async () => {
    try {
      const { data: colorData, error: colorError } = await supabase
        .from('color_variants')
        .select('*, colors(hex_code)')
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
            color_hex: (colorVariant as any).colors?.hex_code || undefined,
            size_variants: (sizeData || []).map(sv => ({
              id: sv.id,
              size_name: sv.size_name,
              size_code: sv.size_code || '',
              isNew: false,
            })),
            isNew: false,
          };
        })
      );

      setColorVariants(variantsWithSizes);
    } catch (error) {
      console.error('Error fetching variants:', error);
    }
  };

  const fetchExistingInventory = async () => {
    try {
      const { data: inventoryData, error } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId);

      if (error) throw error;

      setInventoryRecords(inventoryData || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const generateSKU = (productName: string, colorName?: string, sizeName?: string) => {
    let sku = productName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    
    if (colorName) {
      sku += '-' + colorName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
    }
    
    if (sizeName) {
      sku += '-' + sizeName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 2);
    }
    
    const timestamp = Date.now().toString().slice(-4);
    return sku + '-' + timestamp;
  };

  const addColorVariant = () => {
    const newVariant: ColorVariant = {
      color_name: '',
      color_hex: '#000000',
      has_sizes: hasSizeVariants,
      size_variants: hasSizeVariants ? [{ size_name: '', size_code: '', isNew: true }] : [],
      isNew: true,
    };
    setColorVariants([...colorVariants, newVariant]);
  };

  const updateColorVariant = (index: number, field: keyof ColorVariant, value: any) => {
    const updated = [...colorVariants];
    updated[index] = { ...updated[index], [field]: value };
    setColorVariants(updated);
  };

  // Bug 6 fix: Use stable ID-based lookup instead of filtered index
  const markColorVariantForDeletion = (variant: ColorVariant) => {
    if (variant.id) {
      // Existing variant - mark for deletion by ID
      setColorVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, toDelete: true } : v
      ));
    } else {
      // New variant - remove immediately (find by reference)
      setColorVariants(prev => prev.filter(v => v !== variant));
    }
  };

  const addSizeVariant = (colorIndex: number) => {
    const updated = [...colorVariants];
    updated[colorIndex].size_variants.push({
      size_name: '',
      size_code: '',
      isNew: true,
    });
    setColorVariants(updated);
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, field: keyof SizeVariant, value: any) => {
    const updated = [...colorVariants];
    updated[colorIndex].size_variants[sizeIndex] = {
      ...updated[colorIndex].size_variants[sizeIndex],
      [field]: value,
    };
    setColorVariants(updated);
  };

  const markSizeVariantForDeletion = (colorIndex: number, sizeIndex: number) => {
    const sizeVariant = colorVariants[colorIndex].size_variants[sizeIndex];
    if (sizeVariant.id) {
      const updated = [...colorVariants];
      updated[colorIndex].size_variants[sizeIndex] = {
        ...updated[colorIndex].size_variants[sizeIndex],
        toDelete: true,
      };
      setColorVariants(updated);
    } else {
      const updated = [...colorVariants];
      updated[colorIndex].size_variants = updated[colorIndex].size_variants.filter((_, i) => i !== sizeIndex);
      setColorVariants(updated);
    }
  };

  // Phase 1: Use WebP optimization for color variant images
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, colorIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadKey = `color-${colorIndex}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      // Optimize image to WebP before uploading
      const { file: optimizedFile } = await prepareImageForUpload(file, PRODUCT_COMPRESSION);
      const fileName = `product-${productId}-color-${colorIndex}-${Date.now()}.webp`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, optimizedFile, {
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      updateColorVariant(colorIndex, 'image_url', urlData.publicUrl);

      toast({
        title: 'Success',
        description: 'Image uploaded successfully (optimized to WebP)',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const removeImage = (colorIndex: number) => {
    updateColorVariant(colorIndex, 'image_url', null);
  };

  // Phase 1: Use WebP optimization for main product image
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
        description: 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Phase 1: Save ALL product fields including SEO, care instructions, material
  const updateProductInformation = async () => {
    try {
      const productData = getProductData();
      console.log('Product data received:', productData);
      
      let imageUrl = imagePreview;
      if (imageFile) {
        const newImageUrl = await uploadImageAndGetUrl();
        if (newImageUrl) {
          imageUrl = newImageUrl;
        }
      }

      // Convert care_instructions to array for DB
      const careInstructionsArray = productData.care_instructions
        ? (Array.isArray(productData.care_instructions)
            ? productData.care_instructions.filter(Boolean)
            : String(productData.care_instructions).split('\n').filter(Boolean))
        : null;

      // Convert meta_keywords string to array for DB
      const metaKeywordsArray = productData.meta_keywords
        ? productData.meta_keywords.split(',').map(k => k.trim()).filter(Boolean)
        : null;

      const updateData = {
        name: productData.name,
        description: productData.description,
        cost_price: productData.cost_price,
        selling_price: productData.selling_price,
        category_id: productData.category_id,
        subcategory_id: productData.subcategory_id,
        is_featured: productData.is_featured,
        has_color_variants: productData.has_color_variants,
        color_has_size_variants: productData.has_size_variants,
        status: productData.status,
        image_url: imageUrl,
        material_composition: productData.material_composition || null,
        care_instructions: careInstructionsArray,
        meta_title: productData.meta_title || null,
        meta_description: productData.meta_description || null,
        meta_keywords: metaKeywordsArray,
        og_title: productData.og_title || null,
        og_description: productData.og_description || null,
        updated_at: new Date().toISOString(),
      };

      console.log('Update data being sent:', updateData);

      const { error } = await supabase
        .from('products')
        .update(updateData as any)
        .eq('id', productId);

      if (error) throw error;

      console.log('Product information updated successfully');
    } catch (error) {
      console.error('Error updating product information:', error);
      throw error;
    }
  };

  // Phase 5: Validate variants before saving
  const validateVariants = (): string | null => {
    const activeVariants = colorVariants.filter(v => !v.toDelete);
    
    if (activeVariants.length === 0) {
      return 'At least one color variant is required.';
    }

    const colorNames = new Set<string>();
    for (const variant of activeVariants) {
      const name = variant.color_name.trim();
      if (!name) {
        return 'All color variants must have a name.';
      }
      const lowerName = name.toLowerCase();
      if (colorNames.has(lowerName)) {
        return `Duplicate color name: "${name}". Each color must be unique.`;
      }
      colorNames.add(lowerName);

      if (hasSizeVariants) {
        const activeSizes = variant.size_variants.filter(s => !s.toDelete);
        if (activeSizes.length === 0) {
          return `Color "${name}" must have at least one size variant.`;
        }
        const sizeNames = new Set<string>();
        for (const size of activeSizes) {
          const sizeName = size.size_name.trim();
          if (!sizeName) {
            return `All size variants for color "${name}" must have a name.`;
          }
          const lowerSize = sizeName.toLowerCase();
          if (sizeNames.has(lowerSize)) {
            return `Duplicate size "${sizeName}" in color "${name}".`;
          }
          sizeNames.add(lowerSize);
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    // Phase 5: Run validation first
    const validationError = validateVariants();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (onBeforeSave) {
        console.log('Running onBeforeSave callback...');
        await onBeforeSave();
      }

      console.log('Updating product information...');
      await updateProductInformation();

      console.log('Handling variant deletions...');
      await handleDeletions();

      console.log('Handling variant upserts...');
      await handleUpserts();

      toast({
        title: 'Success',
        description: 'Product information and variants updated successfully',
      });

      console.log('Triggering inventory management...');
      onSave();
    } catch (error) {
      console.error('Error saving product and variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product information and variants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Fix deletion to clean up ALL size variants for deleted colors
  // Helper: clean up all FK references to inventory IDs, then delete the inventory records
  // Soft-delete inventory: deactivate and unlink from variants (avoids FK constraint issues)
  const softDeleteInventory = async (inventoryIds: string[]) => {
    if (inventoryIds.length === 0) return;

    // 1. Soft-delete: set is_active=false, nullify variant links
    const { error: softDeleteErr } = await supabase
      .from('product_inventory')
      .update({
        is_active: false,
        color_variant_id: null,
        size_variant_id: null,
      })
      .in('id', inventoryIds);
    if (softDeleteErr) throw new Error(`Failed to soft-delete inventory: ${softDeleteErr.message}`);

    // 2. Clean up inventory_transactions (no downstream FKs)
    const { error: txnErr } = await supabase
      .from('inventory_transactions')
      .delete()
      .in('inventory_id', inventoryIds);
    if (txnErr) {
      console.warn('Non-critical: failed to delete inventory transactions:', txnErr.message);
    }
  };

  const handleDeletions = async () => {
    for (const colorVariant of colorVariants) {
      if (colorVariant.toDelete && colorVariant.id) {
        // Fetch ALL product_inventory IDs for this color variant
        const { data: inventoryRecords, error: fetchErr } = await supabase
          .from('product_inventory')
          .select('id')
          .eq('color_variant_id', colorVariant.id);
        if (fetchErr) throw new Error(`Failed to fetch inventory for color variant: ${fetchErr.message}`);

        const inventoryIds = (inventoryRecords || []).map(r => r.id);

        // Clean up FK references and delete inventory
        await softDeleteInventory(inventoryIds);

        // Delete all size variants belonging to this color
        const { error: sizeErr } = await supabase
          .from('size_variants')
          .delete()
          .eq('color_variant_id', colorVariant.id);
        if (sizeErr) throw new Error(`Failed to delete size variants: ${sizeErr.message}`);

        // Delete the color variant itself
        const { error: colorErr } = await supabase
          .from('color_variants')
          .delete()
          .eq('id', colorVariant.id);
        if (colorErr) throw new Error(`Failed to delete color variant: ${colorErr.message}`);

        console.log(`Deleted color variant ${colorVariant.color_name} (${colorVariant.id})`);
      } else {
        // Color is NOT being deleted - only delete individually marked sizes
        for (const sizeVariant of colorVariant.size_variants) {
          if (sizeVariant.toDelete && sizeVariant.id) {
            // Fetch inventory IDs for this specific size variant
            const { data: sizeInvRecords, error: fetchErr } = await supabase
              .from('product_inventory')
              .select('id')
              .eq('size_variant_id', sizeVariant.id);
            if (fetchErr) throw new Error(`Failed to fetch inventory for size variant: ${fetchErr.message}`);

            const sizeInvIds = (sizeInvRecords || []).map(r => r.id);
            await softDeleteInventory(sizeInvIds);

            const { error: sizeErr } = await supabase
              .from('size_variants')
              .delete()
              .eq('id', sizeVariant.id);
            if (sizeErr) throw new Error(`Failed to delete size variant: ${sizeErr.message}`);

            console.log(`Deleted size variant ${sizeVariant.size_name} (${sizeVariant.id})`);
          }
        }
      }
    }
  };

  const handleUpserts = async () => {
    const activeColorVariants = colorVariants
      .filter(v => !v.toDelete)
      .map(v => ({
        ...v,
        color_name: v.color_name.trim(),
        color_hex: v.color_hex?.trim() || null,
      }))
      .filter(v => v.color_name);

    const uniqueColorNames = Array.from(new Set(activeColorVariants.map(v => v.color_name)));
    const colorIdByName = new Map<string, string>();

    for (const name of uniqueColorNames) {
      const hex = activeColorVariants.find(v => v.color_name === name)?.color_hex || null;
      const { data: upsertedColor, error: upsertColorError } = await supabase
        .from('colors')
        .upsert(
          {
            name,
            hex_code: hex,
          },
          { onConflict: 'name' }
        )
        .select('id')
        .single();

      if (upsertColorError) throw upsertColorError;
      if (upsertedColor?.id) {
        colorIdByName.set(name, upsertedColor.id);
      }
    }

    for (const colorVariant of colorVariants) {
      if (colorVariant.toDelete) continue;

      let colorVariantId = colorVariant.id;
      const normalizedColorName = colorVariant.color_name.trim();
      const colorId = normalizedColorName ? (colorIdByName.get(normalizedColorName) || null) : null;

      if (colorVariant.isNew || !colorVariantId) {
        const { data: newColor, error } = await supabase
          .from('color_variants')
          .insert({
            product_id: productId,
            color_name: normalizedColorName,
            color_id: colorId,
            image_url: colorVariant.image_url || null,
            has_sizes: hasSizeVariants,
          })
          .select('id')
          .single();

        if (error) throw error;
        colorVariantId = newColor.id;
      } else {
        const { error } = await supabase
          .from('color_variants')
          .update({
            color_name: normalizedColorName,
            color_id: colorId,
            image_url: colorVariant.image_url || null,
            has_sizes: hasSizeVariants,
          })
          .eq('id', colorVariantId);

        if (error) throw error;
      }

      for (const sizeVariant of colorVariant.size_variants) {
        if (sizeVariant.toDelete) continue;

        if (sizeVariant.isNew || !sizeVariant.id) {
          const { error } = await supabase
            .from('size_variants')
            .insert({
              color_variant_id: colorVariantId,
              size_name: sizeVariant.size_name,
              size_code: sizeVariant.size_code || null,
            });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('size_variants')
            .update({
              size_name: sizeVariant.size_name,
              size_code: sizeVariant.size_code || null,
            })
            .eq('id', sizeVariant.id);

          if (error) throw error;
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading variant data...</p>
        </div>
      </div>
    );
  }

  if (!hasColorVariants) {
    return null;
  }

  // Bug 6 fix: Get actual index in full array for update functions
  const visibleVariants = colorVariants
    .map((v, originalIndex) => ({ variant: v, originalIndex }))
    .filter(({ variant }) => !variant.toDelete);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Product Variants</CardTitle>
            <Button type="button" onClick={addColorVariant} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Color
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {visibleVariants.map(({ variant: colorVariant, originalIndex }, displayIndex) => (
              <div key={colorVariant.id || `new-${originalIndex}`} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Color {displayIndex + 1}</Badge>
                    {colorVariant.isNew && <Badge variant="secondary">New</Badge>}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => markColorVariantForDeletion(colorVariant)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Color Name *</Label>
                    <Input
                      value={colorVariant.color_name}
                      onChange={(e) => updateColorVariant(originalIndex, 'color_name', e.target.value)}
                      placeholder="Enter color name"
                    />

                    <div className="mt-3">
                      <Label>Color *</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          value={colorVariant.color_hex || '#000000'}
                          onChange={(e) => updateColorVariant(originalIndex, 'color_hex', e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={colorVariant.color_hex || ''}
                          onChange={(e) => updateColorVariant(originalIndex, 'color_hex', e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Color Image</Label>
                    <div className="space-y-2">
                      <input
                        id={`image-upload-${originalIndex}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, originalIndex)}
                        className="hidden"
                      />
                      <label
                        htmlFor={`image-upload-${originalIndex}`}
                        className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 ${uploading[`color-${originalIndex}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading[`color-${originalIndex}`] ? 'Uploading...' : 'Upload Image'}
                      </label>

                      {colorVariant.image_url && (
                        <div className="relative">
                          <img
                            src={colorVariant.image_url}
                            alt="Color preview"
                            className="w-full max-w-sm h-32 object-cover rounded-lg border"
                          />
                          <div className="absolute top-2 right-2 space-x-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(colorVariant.image_url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => removeImage(originalIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {hasSizeVariants && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Sizes</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSizeVariant(originalIndex)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Size
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {colorVariant.size_variants
                        .map((sv, sizeOrigIdx) => ({ sv, sizeOrigIdx }))
                        .filter(({ sv }) => !sv.toDelete)
                        .map(({ sv: sizeVariant, sizeOrigIdx }) => (
                        <div key={sizeVariant.id || `new-size-${sizeOrigIdx}`} className="flex items-center space-x-2">
                          <Input
                            placeholder="Size name"
                            value={sizeVariant.size_name}
                            onChange={(e) => updateSizeVariant(originalIndex, sizeOrigIdx, 'size_name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Size code"
                            value={sizeVariant.size_code || ''}
                            onChange={(e) => updateSizeVariant(originalIndex, sizeOrigIdx, 'size_code', e.target.value)}
                            className="w-24"
                          />
                          {sizeVariant.isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => markSizeVariantForDeletion(originalIndex, sizeOrigIdx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {visibleVariants.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No color variants added yet.</p>
                <Button type="button" onClick={addColorVariant} className="mt-2">
                  Add First Color
                </Button>
              </div>
            )}

            {colorVariants.some(v => v.toDelete) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some variants are marked for deletion. Associated inventory records will also be removed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving Variants...' : 'Save Variants & Manage Inventory'}
        </Button>
      </div>
    </div>
  );
}
