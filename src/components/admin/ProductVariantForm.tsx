
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
}

interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

interface ProductVariantFormProps {
  productId: string;
  onVariantsChange: () => void;
}

export function ProductVariantForm({ productId, onVariantsChange }: ProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    try {
      const { data: colors, error: colorError } = await supabase
        .from('color_variants')
        .select('*')
        .eq('product_id', productId);

      if (colorError) throw colorError;

      const variants: ColorVariant[] = [];
      
      for (const color of colors || []) {
        const { data: sizes, error: sizeError } = await supabase
          .from('size_variants')
          .select('*')
          .eq('color_variant_id', color.id);

        if (sizeError) throw sizeError;

        variants.push({
          id: color.id,
          color_name: color.color_name,
          image_url: color.image_url,
          has_sizes: color.has_sizes || false,
          size_variants: sizes?.map(size => ({
            id: size.id,
            size_name: size.size_name,
            size_code: size.size_code || undefined
          })) || []
        });
      }

      setColorVariants(variants);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch product variants',
        variant: 'destructive',
      });
    }
  };

  const addColorVariant = () => {
    setColorVariants(prev => [...prev, {
      color_name: '',
      has_sizes: false,
      size_variants: []
    }]);
  };

  const updateColorVariant = (index: number, field: string, value: any) => {
    setColorVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const removeColorVariant = async (index: number) => {
    const variant = colorVariants[index];
    if (variant.id) {
      try {
        setLoading(true);
        
        // Delete size variants first
        for (const size of variant.size_variants) {
          if (size.id) {
            await supabase.from('size_variants').delete().eq('id', size.id);
          }
        }
        
        // Delete color variant
        await supabase.from('color_variants').delete().eq('id', variant.id);
        
        toast({
          title: 'Success',
          description: 'Color variant deleted successfully',
        });
        
        onVariantsChange();
      } catch (error) {
        console.error('Error deleting variant:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete variant',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    setColorVariants(prev => prev.filter((_, i) => i !== index));
  };

  const addSizeVariant = (colorIndex: number) => {
    setColorVariants(prev => prev.map((variant, i) => 
      i === colorIndex 
        ? { ...variant, size_variants: [...variant.size_variants, { size_name: '', size_code: '' }] }
        : variant
    ));
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, field: string, value: string) => {
    setColorVariants(prev => prev.map((variant, i) => 
      i === colorIndex 
        ? {
            ...variant,
            size_variants: variant.size_variants.map((size, j) => 
              j === sizeIndex ? { ...size, [field]: value } : size
            )
          }
        : variant
    ));
  };

  const removeSizeVariant = async (colorIndex: number, sizeIndex: number) => {
    const sizeVariant = colorVariants[colorIndex].size_variants[sizeIndex];
    
    if (sizeVariant.id) {
      try {
        await supabase.from('size_variants').delete().eq('id', sizeVariant.id);
        toast({
          title: 'Success',
          description: 'Size variant deleted successfully',
        });
        onVariantsChange();
      } catch (error) {
        console.error('Error deleting size variant:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete size variant',
          variant: 'destructive',
        });
      }
    }
    
    setColorVariants(prev => prev.map((variant, i) => 
      i === colorIndex 
        ? { ...variant, size_variants: variant.size_variants.filter((_, j) => j !== sizeIndex) }
        : variant
    ));
  };

  const saveVariants = async () => {
    try {
      setLoading(true);

      for (const variant of colorVariants) {
        if (!variant.color_name.trim()) continue;

        let colorId = variant.id;
        
        if (colorId) {
          // Update existing color variant
          await supabase
            .from('color_variants')
            .update({
              color_name: variant.color_name,
              image_url: variant.image_url,
              has_sizes: variant.has_sizes
            })
            .eq('id', colorId);
        } else {
          // Create new color variant
          const { data: newColor, error: colorError } = await supabase
            .from('color_variants')
            .insert({
              product_id: productId,
              color_name: variant.color_name,
              image_url: variant.image_url,
              has_sizes: variant.has_sizes
            })
            .select()
            .single();

          if (colorError) throw colorError;
          colorId = newColor.id;
        }

        // Handle size variants
        if (variant.has_sizes) {
          for (const size of variant.size_variants) {
            if (!size.size_name.trim()) continue;

            if (size.id) {
              // Update existing size variant
              await supabase
                .from('size_variants')
                .update({
                  size_name: size.size_name,
                  size_code: size.size_code
                })
                .eq('id', size.id);
            } else {
              // Create new size variant
              await supabase
                .from('size_variants')
                .insert({
                  color_variant_id: colorId,
                  size_name: size.size_name,
                  size_code: size.size_code
                });
            }
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Product variants saved successfully',
      });

      onVariantsChange();
      fetchVariants();
    } catch (error) {
      console.error('Error saving variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to save variants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Variants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {colorVariants.map((variant, colorIndex) => (
          <div key={colorIndex} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Color Variant {colorIndex + 1}</h4>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeColorVariant(colorIndex)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color Name</Label>
                <Input
                  value={variant.color_name}
                  onChange={(e) => updateColorVariant(colorIndex, 'color_name', e.target.value)}
                  placeholder="Enter color name"
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={variant.image_url || ''}
                  onChange={(e) => updateColorVariant(colorIndex, 'image_url', e.target.value)}
                  placeholder="Enter image URL"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={variant.has_sizes}
                onChange={(e) => updateColorVariant(colorIndex, 'has_sizes', e.target.checked)}
              />
              <Label>Has Size Variants</Label>
            </div>

            {variant.has_sizes && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Size Variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSizeVariant(colorIndex)}
                  >
                    Add Size
                  </Button>
                </div>

                {variant.size_variants.map((size, sizeIndex) => (
                  <div key={sizeIndex} className="flex items-center space-x-2">
                    <Input
                      value={size.size_name}
                      onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_name', e.target.value)}
                      placeholder="Size name (e.g., Small)"
                      className="flex-1"
                    />
                    <Input
                      value={size.size_code || ''}
                      onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_code', e.target.value)}
                      placeholder="Size code (e.g., S)"
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSizeVariant(colorIndex, sizeIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={addColorVariant}>
            Add Color Variant
          </Button>
          <Button onClick={saveVariants} disabled={loading}>
            {loading ? 'Saving...' : 'Save Variants'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
