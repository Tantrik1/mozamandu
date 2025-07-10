
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ColorVariant, SizeVariant } from '@/types/product';

interface EditProductVariantFormProps {
  productId: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onVariantsChange: () => void;
}

export function EditProductVariantForm({
  productId,
  hasColorVariants,
  hasSizeVariants,
  onVariantsChange
}: EditProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (hasColorVariants) {
      fetchColorVariants();
    }
  }, [productId, hasColorVariants]);

  const fetchColorVariants = async () => {
    const { data, error } = await supabase
      .from('color_variants')
      .select(`
        *,
        size_variants (*)
      `)
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching color variants:', error);
    } else {
      setColorVariants(data || []);
    }
  };

  const addColorVariant = () => {
    const newVariant: ColorVariant = {
      color_name: '',
      image_url: '',
      has_sizes: hasSizeVariants,
      size_variants: []
    };
    setColorVariants([...colorVariants, newVariant]);
  };

  const updateColorVariant = (index: number, field: keyof ColorVariant, value: any) => {
    const updated = [...colorVariants];
    updated[index] = { ...updated[index], [field]: value };
    setColorVariants(updated);
  };

  const addSizeVariant = (colorIndex: number) => {
    const updated = [...colorVariants];
    if (!updated[colorIndex].size_variants) {
      updated[colorIndex].size_variants = [];
    }
    updated[colorIndex].size_variants.push({
      size_name: '',
      size_code: ''
    });
    setColorVariants(updated);
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, field: keyof SizeVariant, value: string) => {
    const updated = [...colorVariants];
    if (!updated[colorIndex].size_variants) {
      updated[colorIndex].size_variants = [];
    }
    updated[colorIndex].size_variants[sizeIndex] = {
      ...updated[colorIndex].size_variants[sizeIndex],
      [field]: value
    };
    setColorVariants(updated);
  };

  const saveVariants = async () => {
    setLoading(true);
    try {
      // Save each color variant
      for (const variant of colorVariants) {
        if (variant.color_name.trim()) {
          let colorVariantId = variant.id;
          
          if (colorVariantId) {
            // Update existing
            const { error } = await supabase
              .from('color_variants')
              .update({
                color_name: variant.color_name,
                image_url: variant.image_url,
                has_sizes: variant.has_sizes
              })
              .eq('id', colorVariantId);
            
            if (error) throw error;
          } else {
            // Create new
            const { data, error } = await supabase
              .from('color_variants')
              .insert({
                product_id: productId,
                color_name: variant.color_name,
                image_url: variant.image_url,
                has_sizes: variant.has_sizes
              })
              .select()
              .single();
            
            if (error) throw error;
            colorVariantId = data.id;
          }

          // Save size variants if applicable
          if (hasSizeVariants && variant.size_variants) {
            for (const sizeVariant of variant.size_variants) {
              if (sizeVariant.size_name.trim()) {
                if (sizeVariant.id) {
                  // Update existing
                  const { error } = await supabase
                    .from('size_variants')
                    .update({
                      size_name: sizeVariant.size_name,
                      size_code: sizeVariant.size_code
                    })
                    .eq('id', sizeVariant.id);
                  
                  if (error) throw error;
                } else {
                  // Create new
                  const { error } = await supabase
                    .from('size_variants')
                    .insert({
                      color_variant_id: colorVariantId,
                      size_name: sizeVariant.size_name,
                      size_code: sizeVariant.size_code
                    });
                  
                  if (error) throw error;
                }
              }
            }
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Product variants saved successfully',
      });

      onVariantsChange();
      fetchColorVariants();
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

  if (!hasColorVariants) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Variants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {colorVariants.map((variant, colorIndex) => (
          <div key={colorIndex} className="border p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color Name</Label>
                <Input
                  value={variant.color_name}
                  onChange={(e) => updateColorVariant(colorIndex, 'color_name', e.target.value)}
                  placeholder="Red, Blue, etc."
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={variant.image_url || ''}
                  onChange={(e) => updateColorVariant(colorIndex, 'image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {hasSizeVariants && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
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
                
                {variant.size_variants?.map((sizeVariant, sizeIndex) => (
                  <div key={sizeIndex} className="grid grid-cols-2 gap-2">
                    <Input
                      value={sizeVariant.size_name}
                      onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_name', e.target.value)}
                      placeholder="Size name (S, M, L)"
                    />
                    <Input
                      value={sizeVariant.size_code || ''}
                      onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_code', e.target.value)}
                      placeholder="Size code (SM, MD, LG)"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex space-x-2">
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
