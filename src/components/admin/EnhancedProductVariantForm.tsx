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

interface EnhancedProductVariantFormProps {
  productId: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EnhancedProductVariantForm({
  productId,
  hasColorVariants,
  hasSizeVariants,
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
      // Fetch product info
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProductInfo(product);

      // Fetch existing color variants and size variants
      if (hasColorVariants) {
        await fetchExistingVariants();
      }

      // Fetch existing inventory records
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
    
    // Add unique identifier
    const timestamp = Date.now().toString().slice(-4);
    return sku + '-' + timestamp;
  };

  const addColorVariant = () => {
    const newVariant: ColorVariant = {
      color_name: '',
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

  const markColorVariantForDeletion = (index: number) => {
    const variant = colorVariants[index];
    if (variant.id) {
      // Existing variant - mark for deletion
      const updated = [...colorVariants];
      updated[index] = { ...updated[index], toDelete: true };
      setColorVariants(updated);
    } else {
      // New variant - remove immediately
      const updated = colorVariants.filter((_, i) => i !== index);
      setColorVariants(updated);
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
      // Existing variant - mark for deletion
      const updated = [...colorVariants];
      updated[colorIndex].size_variants[sizeIndex] = {
        ...updated[colorIndex].size_variants[sizeIndex],
        toDelete: true,
      };
      setColorVariants(updated);
    } else {
      // New variant - remove immediately
      const updated = [...colorVariants];
      updated[colorIndex].size_variants = updated[colorIndex].size_variants.filter((_, i) => i !== sizeIndex);
      setColorVariants(updated);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, colorIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadKey = `color-${colorIndex}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `product-${productId}-color-${colorIndex}-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      updateColorVariant(colorIndex, 'image_url', urlData.publicUrl);

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
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const removeImage = (colorIndex: number) => {
    updateColorVariant(colorIndex, 'image_url', null);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // First, handle deletions
      await handleDeletions();

      // Then handle updates and creates
      await handleUpserts();

      // Finally, manage inventory records
      await manageInventoryRecords();

      toast({
        title: 'Success',
        description: 'Product variants and inventory updated successfully',
      });

      onSave();
    } catch (error) {
      console.error('Error saving variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product variants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletions = async () => {
    // Delete marked size variants first
    for (const colorVariant of colorVariants) {
      for (const sizeVariant of colorVariant.size_variants) {
        if (sizeVariant.toDelete && sizeVariant.id) {
          // Delete associated inventory records
          await supabase
            .from('product_inventory')
            .delete()
            .eq('size_variant_id', sizeVariant.id);

          // Delete size variant
          await supabase
            .from('size_variants')
            .delete()
            .eq('id', sizeVariant.id);
        }
      }
    }

    // Delete marked color variants
    for (const colorVariant of colorVariants) {
      if (colorVariant.toDelete && colorVariant.id) {
        // Delete associated inventory records
        await supabase
          .from('product_inventory')
          .delete()
          .eq('color_variant_id', colorVariant.id);

        // Delete color variant (will cascade to size variants)
        await supabase
          .from('color_variants')
          .delete()
          .eq('id', colorVariant.id);
      }
    }
  };

  const handleUpserts = async () => {
    for (const colorVariant of colorVariants) {
      if (colorVariant.toDelete) continue;

      let colorVariantId = colorVariant.id;

      if (colorVariant.isNew || !colorVariantId) {
        // Create new color variant
        const { data: newColor, error } = await supabase
          .from('color_variants')
          .insert({
            product_id: productId,
            color_name: colorVariant.color_name,
            image_url: colorVariant.image_url || null,
            has_sizes: hasSizeVariants,
          })
          .select('id')
          .single();

        if (error) throw error;
        colorVariantId = newColor.id;
      } else {
        // Update existing color variant
        const { error } = await supabase
          .from('color_variants')
          .update({
            color_name: colorVariant.color_name,
            image_url: colorVariant.image_url || null,
            has_sizes: hasSizeVariants,
          })
          .eq('id', colorVariantId);

        if (error) throw error;
      }

      // Handle size variants
      for (const sizeVariant of colorVariant.size_variants) {
        if (sizeVariant.toDelete) continue;

        if (sizeVariant.isNew || !sizeVariant.id) {
          // Create new size variant
          const { error } = await supabase
            .from('size_variants')
            .insert({
              color_variant_id: colorVariantId,
              size_name: sizeVariant.size_name,
              size_code: sizeVariant.size_code || null,
            });

          if (error) throw error;
        } else {
          // Update existing size variant
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

  const manageInventoryRecords = async () => {
    // After saving variants, automatically trigger inventory management
    // This will be called after variants are saved successfully
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
            {colorVariants.filter(v => !v.toDelete).map((colorVariant, colorIndex) => (
              <div key={colorVariant.id || colorIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Color {colorIndex + 1}</Badge>
                    {colorVariant.isNew && <Badge variant="secondary">New</Badge>}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => markColorVariantForDeletion(colorIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Color Name *</Label>
                    <Input
                      value={colorVariant.color_name}
                      onChange={(e) => updateColorVariant(colorIndex, 'color_name', e.target.value)}
                      placeholder="Enter color name"
                    />
                  </div>

                  <div>
                    <Label>Color Image</Label>
                    <div className="space-y-2">
                      <input
                        id={`image-upload-${colorIndex}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, colorIndex)}
                        className="hidden"
                      />
                      <label
                        htmlFor={`image-upload-${colorIndex}`}
                        className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 ${uploading[`color-${colorIndex}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading[`color-${colorIndex}`] ? 'Uploading...' : 'Upload Image'}
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
                              onClick={() => removeImage(colorIndex)}
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
                        onClick={() => addSizeVariant(colorIndex)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Size
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {colorVariant.size_variants.filter(s => !s.toDelete).map((sizeVariant, sizeIndex) => (
                        <div key={sizeVariant.id || sizeIndex} className="flex items-center space-x-2">
                          <Input
                            placeholder="Size name"
                            value={sizeVariant.size_name}
                            onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Size code"
                            value={sizeVariant.size_code || ''}
                            onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_code', e.target.value)}
                            className="w-24"
                          />
                          {sizeVariant.isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => markSizeVariantForDeletion(colorIndex, sizeIndex)}
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
            
            {colorVariants.filter(v => !v.toDelete).length === 0 && (
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
