
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
  stock_quantity: number;
}

interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  stock_quantity?: number;
  size_variants: SizeVariant[];
}

interface ProductVariantFormProps {
  productId?: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onVariantsChange: (variants: ColorVariant[]) => void;
  initialVariants?: ColorVariant[];
}

export function ProductVariantForm({
  productId,
  hasColorVariants,
  hasSizeVariants,
  onVariantsChange,
  initialVariants = []
}: ProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [uploadingImages, setUploadingImages] = useState<{[key: number]: boolean}>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('ProductVariantForm useEffect triggered', {
      productId,
      hasColorVariants,
      hasSizeVariants,
      initialVariants: initialVariants.length
    });

    if (initialVariants && initialVariants.length > 0) {
      console.log('Using provided initial variants:', initialVariants);
      setColorVariants(initialVariants);
    } else if (productId && (hasColorVariants || hasSizeVariants)) {
      console.log('Fetching variants for productId:', productId);
      fetchExistingVariants();
    } else {
      console.log('Clearing variants - no conditions met');
      setColorVariants([]);
    }
  }, [productId, hasColorVariants, hasSizeVariants]);

  useEffect(() => {
    console.log('Color variants changed, notifying parent:', colorVariants);
    onVariantsChange(colorVariants);
  }, [colorVariants, onVariantsChange]);

  const fetchExistingVariants = async () => {
    if (!productId) {
      console.log('No productId provided, skipping fetch');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching variants for product:', productId);
      
      // Fetch color variants
      const { data: colorData, error: colorError } = await supabase
        .from('color_variants')
        .select('*')
        .eq('product_id', productId)
        .order('color_name');

      if (colorError) {
        console.error('Error fetching color variants:', colorError);
        setColorVariants([]);
        return;
      }

      console.log('Fetched color variants:', colorData);

      if (!colorData || colorData.length === 0) {
        console.log('No color variants found');
        setColorVariants([]);
        return;
      }

      // For each color variant, fetch its size variants
      const variantsWithSizes = await Promise.all(
        colorData.map(async (colorVariant) => {
          let sizeVariants: SizeVariant[] = [];
          
          if (hasSizeVariants && colorVariant.has_sizes) {
            console.log('Fetching size variants for color variant:', colorVariant.id);
            const { data: sizeData, error: sizeError } = await supabase
              .from('size_variants')
              .select('*')
              .eq('color_variant_id', colorVariant.id)
              .order('size_name');

            if (sizeError) {
              console.error('Error fetching size variants:', sizeError);
            } else {
              sizeVariants = sizeData || [];
              console.log('Fetched size variants for color', colorVariant.color_name, ':', sizeVariants);
            }
          }

          return {
            id: colorVariant.id,
            color_name: colorVariant.color_name,
            image_url: colorVariant.image_url,
            has_sizes: Boolean(colorVariant.has_sizes),
            stock_quantity: colorVariant.stock_quantity || 0,
            size_variants: sizeVariants
          };
        })
      );

      console.log('Final variants with sizes:', variantsWithSizes);
      setColorVariants(variantsWithSizes);
    } catch (error) {
      console.error('Error in fetchExistingVariants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load existing variants',
        variant: 'destructive',
      });
      setColorVariants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addColorVariant = () => {
    const newVariant: ColorVariant = {
      color_name: '',
      has_sizes: hasSizeVariants,
      stock_quantity: hasSizeVariants ? 0 : 0,
      size_variants: []
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

  const addSizeVariant = (colorIndex: number) => {
    const updated = [...colorVariants];
    const newSizeVariant: SizeVariant = {
      size_name: '',
      size_code: '',
      stock_quantity: 0
    };
    updated[colorIndex].size_variants.push(newSizeVariant);
    setColorVariants(updated);
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, field: keyof SizeVariant, value: any) => {
    const updated = [...colorVariants];
    updated[colorIndex].size_variants[sizeIndex] = {
      ...updated[colorIndex].size_variants[sizeIndex],
      [field]: value
    };
    setColorVariants(updated);
  };

  const removeSizeVariant = (colorIndex: number, sizeIndex: number) => {
    const updated = [...colorVariants];
    updated[colorIndex].size_variants = updated[colorIndex].size_variants.filter((_, i) => i !== sizeIndex);
    setColorVariants(updated);
  };

  const handleImageUpload = async (file: File, colorIndex: number) => {
    if (!file) return;

    setUploadingImages(prev => ({ ...prev, [colorIndex]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `color-variant-${Date.now()}-${colorIndex}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      updateColorVariant(colorIndex, 'image_url', urlData.publicUrl);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(prev => ({ ...prev, [colorIndex]: false }));
    }
  };

  const calculateTotalStock = () => {
    return colorVariants.reduce((total, variant) => {
      if (hasSizeVariants && variant.size_variants.length > 0) {
        // Sum all size variant stocks within this color
        return total + variant.size_variants.reduce((sum, size) => sum + size.stock_quantity, 0);
      }
      // Use color variant stock if no size variants
      return total + (variant.stock_quantity || 0);
    }, 0);
  };

  const calculateColorStock = (variant: ColorVariant) => {
    if (hasSizeVariants && variant.size_variants.length > 0) {
      return variant.size_variants.reduce((sum, size) => sum + size.stock_quantity, 0);
    }
    return variant.stock_quantity || 0;
  };

  if (!hasColorVariants && !hasSizeVariants) {
    return null;
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading variants...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Product Variants</h3>
          <p className="text-sm text-gray-600">
            Total Stock: <Badge variant="outline">{calculateTotalStock()}</Badge>
          </p>
        </div>
        {hasColorVariants && (
          <Button type="button" onClick={addColorVariant} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Color
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {colorVariants.map((variant, colorIndex) => (
          <Card key={colorIndex} className="p-4">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-base">
                    {hasColorVariants ? `${variant.color_name || `Color ${colorIndex + 1}`}` : 'Sizes'}
                  </CardTitle>
                  <Badge variant="secondary">
                    Stock: {calculateColorStock(variant)}
                  </Badge>
                </div>
                {hasColorVariants && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeColorVariant(colorIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasColorVariants && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Color Name *</Label>
                    <Input
                      value={variant.color_name}
                      onChange={(e) => updateColorVariant(colorIndex, 'color_name', e.target.value)}
                      placeholder="e.g., Red, Blue, Black"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Color Image</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, colorIndex);
                        }}
                        disabled={uploadingImages[colorIndex]}
                      />
                      {uploadingImages[colorIndex] && (
                        <div className="text-sm text-gray-500">Uploading...</div>
                      )}
                    </div>
                    {variant.image_url && (
                      <div className="mt-2">
                        <img 
                          src={variant.image_url} 
                          alt={variant.color_name}
                          className="w-16 h-16 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!hasSizeVariants && hasColorVariants && (
                <div>
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={variant.stock_quantity || 0}
                    onChange={(e) => updateColorVariant(colorIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
              )}

              {hasSizeVariants && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Size Variants</Label>
                    <Button
                      type="button"
                      onClick={() => addSizeVariant(colorIndex)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Size
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {variant.size_variants && variant.size_variants.length > 0 ? (
                      variant.size_variants.map((sizeVariant, sizeIndex) => (
                        <div key={sizeIndex} className="grid grid-cols-12 gap-2 items-center p-3 border rounded">
                          <div className="col-span-3">
                            <Input
                              placeholder="Size name (S, M, L)"
                              value={sizeVariant.size_name}
                              onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_name', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder="Code"
                              value={sizeVariant.size_code || ''}
                              onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_code', e.target.value)}
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Stock"
                              value={sizeVariant.stock_quantity}
                              onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-4 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSizeVariant(colorIndex, sizeIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No sizes added yet. Click "Add Size" to get started.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {hasColorVariants && colorVariants.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No color variants added yet.</p>
          <Button type="button" onClick={addColorVariant} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add First Color Variant
          </Button>
        </Card>
      )}
    </div>
  );
}
