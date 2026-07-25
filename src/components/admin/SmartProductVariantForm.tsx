import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Upload, Eye, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface SmartProductVariantFormProps {
  productId?: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onVariantsChange: (variants: ColorVariant[]) => void;
  hideStockFields?: boolean;
}

export function SmartProductVariantForm({ 
  productId, 
  hasColorVariants, 
  hasSizeVariants, 
  onVariantsChange,
  hideStockFields = false
}: SmartProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (hasColorVariants && colorVariants.length === 0) {
      // Initialize with one empty color variant
      setColorVariants([{
        color_name: '',
        color_hex: '#000000',
        image_url: '',
        has_sizes: hasSizeVariants,
        size_variants: hasSizeVariants ? [{ size_name: '', size_code: '' }] : [],
      }]);
    } else if (!hasColorVariants) {
      setColorVariants([]);
    }
  }, [hasColorVariants, hasSizeVariants]);

  useEffect(() => {
    // Update has_sizes property when hasSizeVariants changes
    const updatedVariants = colorVariants.map(variant => ({
      ...variant,
      has_sizes: hasSizeVariants,
      size_variants: hasSizeVariants ? 
        (variant.size_variants.length === 0 ? [{ size_name: '', size_code: '' }] : variant.size_variants) :
        [],
    }));
    setColorVariants(updatedVariants);
  }, [hasSizeVariants]);

  useEffect(() => {
    onVariantsChange(colorVariants);
  }, [colorVariants, onVariantsChange]);

  const addColorVariant = () => {
    setColorVariants([
      ...colorVariants,
      {
        color_name: '',
        color_hex: '#000000',
        image_url: '',
        has_sizes: hasSizeVariants,
        size_variants: hasSizeVariants ? [{ size_name: '', size_code: '' }] : [],
      },
    ]);
  };

  const removeColorVariant = (index: number) => {
    const updatedVariants = [...colorVariants];
    updatedVariants.splice(index, 1);
    setColorVariants(updatedVariants);
  };

  const updateColorVariant = (index: number, field: keyof ColorVariant, value: any) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setColorVariants(updatedVariants);
  };

  const addSizeVariant = (colorIndex: number) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[colorIndex] = {
      ...updatedVariants[colorIndex],
      size_variants: [...updatedVariants[colorIndex].size_variants, { size_name: '', size_code: '' }],
    };
    setColorVariants(updatedVariants);
  };

  const removeSizeVariant = (colorIndex: number, sizeIndex: number) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[colorIndex] = {
      ...updatedVariants[colorIndex],
      size_variants: updatedVariants[colorIndex].size_variants.filter((_, i) => i !== sizeIndex),
    };
    setColorVariants(updatedVariants);
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, field: keyof SizeVariant, value: any) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[colorIndex] = {
      ...updatedVariants[colorIndex],
      size_variants: updatedVariants[colorIndex].size_variants.map((size, i) =>
        i === sizeIndex ? { ...size, [field]: value } : size
      ),
    };
    setColorVariants(updatedVariants);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, colorIndex: number) => {
    const file = event.target.files?.[0];
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

    setUploadingImages(prev => ({ ...prev, [colorIndex]: true }));

    try {
      const { prepareImageForUpload, PRODUCT_COMPRESSION } = await import('@/utils/imageOptimizer');
      
      // Optimize image with aggressive compression (~250KB)
      const { file: optimizedFile } = await prepareImageForUpload(file, PRODUCT_COMPRESSION);
      const { uploadToR2, ensureUploadedUrl } = await import('@/utils/r2Upload');
      let imageUrl = await uploadToR2(optimizedFile, 'color_variants');
      imageUrl = (await ensureUploadedUrl(imageUrl, 'color_variants')) || imageUrl;
      updateColorVariant(colorIndex, 'image_url', imageUrl);

      toast({
        title: 'Success',
        description: 'Image optimized and uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImages(prev => ({ ...prev, [colorIndex]: false }));
    }
  };

  const removeImage = (colorIndex: number) => {
    updateColorVariant(colorIndex, 'image_url', null);
  };

  if (!hasColorVariants) {
    return null;
  }

  return (
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
          {colorVariants.map((colorVariant, colorIndex) => (
            <div key={colorIndex} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline">Color {colorIndex + 1}</Badge>
                {colorVariants.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeColorVariant(colorIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Color Name *</Label>
                  <Input
                    value={colorVariant.color_name}
                    onChange={(e) => updateColorVariant(colorIndex, 'color_name', e.target.value)}
                    placeholder="Enter color name"
                  />

                  <div className="mt-3">
                    <Label>Color *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="color"
                        value={colorVariant.color_hex || '#000000'}
                        onChange={(e) => updateColorVariant(colorIndex, 'color_hex', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={colorVariant.color_hex || ''}
                        onChange={(e) => updateColorVariant(colorIndex, 'color_hex', e.target.value)}
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
                      id={`image-upload-${colorIndex}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, colorIndex)}
                      className="hidden"
                    />
                    <label
                      htmlFor={`image-upload-${colorIndex}`}
                      className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 ${uploadingImages[colorIndex] ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingImages[colorIndex] ? 'Uploading...' : 'Upload Image'}
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
                    {colorVariant.size_variants.map((sizeVariant, sizeIndex) => (
                      <div key={sizeIndex} className="flex items-center space-x-2">
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
                        {colorVariant.size_variants.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSizeVariant(colorIndex, sizeIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {colorVariants.length === 0 && hasColorVariants && (
            <div className="text-center py-8 text-gray-500">
              <p>No color variants added yet.</p>
              <Button type="button" onClick={addColorVariant} className="mt-2">
                Add First Color
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
