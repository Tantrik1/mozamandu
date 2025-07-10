import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
}

interface RobustProductVariantFormProps {
  productId: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
}

export function RobustProductVariantForm({ productId, hasColorVariants, hasSizeVariants }: RobustProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchExistingVariants();
    }
  }, [productId]);

  const fetchExistingVariants = async () => {
    try {
      const { data: colors, error: colorError } = await supabase
        .from('color_variants')
        .select(`
          *,
          size_variants(*)
        `)
        .eq('product_id', productId);

      if (colorError) throw colorError;

      if (colors) {
        const formattedColors = colors.map(color => ({
          id: color.id,
          color_name: color.color_name,
          image_url: color.image_url || '',
          has_sizes: color.has_sizes || false,
          size_variants: color.size_variants?.map((size: any) => ({
            id: size.id,
            size_name: size.size_name,
            size_code: size.size_code || ''
          })) || []
        }));
        setColorVariants(formattedColors);
      } else {
        setColorVariants([]);
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
    }
  };

  const addColorVariant = () => {
    setColorVariants(prev => [...prev, {
      id: uuidv4(),
      color_name: '',
      image_url: '',
      has_sizes: hasSizeVariants,
      size_variants: hasSizeVariants ? [{ id: uuidv4(), size_name: '', size_code: '' }] : []
    }]);
  };

  const updateColorVariant = (id: string, field: string, value: any) => {
    setColorVariants(prev => prev.map(variant => {
      if (variant.id === id) {
        return { ...variant, [field]: value };
      }
      return variant;
    }));
  };

  const removeColorVariant = (id: string) => {
    setColorVariants(prev => prev.filter(variant => variant.id !== id));
  };

  const addSizeVariant = (colorId: string) => {
    setColorVariants(prev => prev.map(variant => {
      if (variant.id === colorId) {
        return {
          ...variant,
          size_variants: [...variant.size_variants, { id: uuidv4(), size_name: '', size_code: '' }]
        };
      }
      return variant;
    }));
  };

  const updateSizeVariant = (colorId: string, sizeId: string, field: string, value: any) => {
    setColorVariants(prev => prev.map(variant => {
      if (variant.id === colorId) {
        return {
          ...variant,
          size_variants: variant.size_variants.map(size => {
            if (size.id === sizeId) {
              return { ...size, [field]: value };
            }
            return size;
          })
        };
      }
      return variant;
    }));
  };

  const removeSizeVariant = (colorId: string, sizeId: string) => {
    setColorVariants(prev => prev.map(variant => {
      if (variant.id === colorId) {
        return {
          ...variant,
          size_variants: variant.size_variants.filter(size => size.id !== sizeId)
        };
      }
      return variant;
    }));
  };

  const saveVariantsToDatabase = async () => {
    try {
      // Delete existing variants
      const { error: deleteError } = await supabase
        .from('color_variants')
        .delete()
        .eq('product_id', productId);

      if (deleteError) throw deleteError;

      // Insert new variants
      for (const color of colorVariants) {
        const { id: colorId, size_variants, ...colorData } = color;
        const { data: insertedColor, error: colorError } = await supabase
          .from('color_variants')
          .insert({
            product_id: productId,
            ...colorData,
            has_sizes: hasSizeVariants
          })
          .select()
          .single();

        if (colorError) throw colorError;

        if (hasSizeVariants && size_variants) {
          for (const size of size_variants) {
            const { error: sizeError } = await supabase
              .from('size_variants')
              .insert({
                color_variant_id: insertedColor.id,
                size_name: size.size_name,
                size_code: size.size_code
              });

            if (sizeError) throw sizeError;
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Variants saved successfully',
      });
    } catch (error) {
      console.error('Error saving variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to save variants',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Color Variants</h3>
      {colorVariants.map((color) => (
        <Card key={color.id}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`color-name-${color.id}`}>Color Name</Label>
                <Input
                  type="text"
                  id={`color-name-${color.id}`}
                  value={color.color_name}
                  onChange={(e) => updateColorVariant(color.id as string, 'color_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`color-image-${color.id}`}>Image URL</Label>
                <Input
                  type="text"
                  id={`color-image-${color.id}`}
                  value={color.image_url || ''}
                  onChange={(e) => updateColorVariant(color.id as string, 'image_url', e.target.value)}
                />
              </div>
            </div>

            {hasSizeVariants && (
              <div className="space-y-2">
                <h4 className="text-lg font-medium">Size Variants</h4>
                {color.size_variants.map((size) => (
                  <div key={size.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <Label htmlFor={`size-name-${size.id}`}>Size Name</Label>
                      <Input
                        type="text"
                        id={`size-name-${size.id}`}
                        value={size.size_name}
                        onChange={(e) => updateSizeVariant(color.id as string, size.id as string, 'size_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`size-code-${size.id}`}>Size Code</Label>
                      <Input
                        type="text"
                        id={`size-code-${size.id}`}
                        value={size.size_code || ''}
                        onChange={(e) => updateSizeVariant(color.id as string, size.id as string, 'size_code', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSizeVariant(color.id as string, size.id as string)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => addSizeVariant(color.id as string)}>
                  Add Size Variant
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="destructive"
              onClick={() => removeColorVariant(color.id as string)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Color Variant
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button type="button" onClick={addColorVariant}>
        Add Color Variant
      </Button>

      <Button type="button" onClick={saveVariantsToDatabase}>
        Save Variants
      </Button>
    </div>
  );
}
