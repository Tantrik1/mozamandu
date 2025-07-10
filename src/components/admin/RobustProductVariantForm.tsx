import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface Variant {
  id: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: Size[];
}

interface Size {
  id: string;
  size_name: string;
  size_code?: string;
}

interface RobustProductVariantFormProps {
  productId: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onVariantsChange: () => void;
}

export function RobustProductVariantForm({ productId, hasColorVariants, hasSizeVariants, onVariantsChange }: RobustProductVariantFormProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasColorVariants) {
      fetchVariants();
    } else {
      setLoading(false);
    }
  }, [productId, hasColorVariants]);

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('color_variants')
        .select(`
          *,
          size_variants (*)
        `)
        .eq('product_id', productId);

      if (error) throw error;
      setVariants(data || []);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product variants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    const newVariant: Variant = {
      id: uuidv4(),
      color_name: '',
      has_sizes: hasSizeVariants,
      size_variants: hasSizeVariants ? [{ id: uuidv4(), size_name: '' }] : [],
    };
    setVariants([...variants, newVariant]);
  };

  const updateVariant = (variantId: string, key: string, value: any) => {
    const updatedVariants = variants.map(variant =>
      variant.id === variantId ? { ...variant, [key]: value } : variant
    );
    setVariants(updatedVariants);
  };

  const removeVariant = async (variantId: string) => {
    try {
      // Delete from database if it exists
      const { error } = await supabase
        .from('color_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;

      const newVariants = variants.filter(variant => variant.id !== variantId);
      setVariants(newVariants);
      onVariantsChange();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete variant',
        variant: 'destructive',
      });
    }
  };

  const addSize = (variantId: string) => {
    const newSize: Size = { id: uuidv4(), size_name: '' };
    const updatedVariants = variants.map(variant =>
      variant.id === variantId
        ? { ...variant, size_variants: [...variant.size_variants, newSize] }
        : variant
    );
    setVariants(updatedVariants);
  };

  const updateSize = (variantId: string, sizeId: string, key: string, value: any) => {
    const updatedVariants = variants.map(variant => {
      if (variant.id === variantId) {
        const updatedSizes = variant.size_variants.map(size =>
          size.id === sizeId ? { ...size, [key]: value } : size
        );
        return { ...variant, size_variants: updatedSizes };
      }
      return variant;
    });
    setVariants(updatedVariants);
  };

  const removeSize = (variantId: string, sizeId: string) => {
    const updatedVariants = variants.map(variant => {
      if (variant.id === variantId) {
        const updatedSizes = variant.size_variants.filter(size => size.id !== sizeId);
        return { ...variant, size_variants: updatedSizes };
      }
      return variant;
    });
    setVariants(updatedVariants);
  };

  const saveVariants = async () => {
    setLoading(true);
    try {
      for (const variant of variants) {
        // Check if variant exists in database
        const { data: existingVariant, error: selectError } = await supabase
          .from('color_variants')
          .select('*')
          .eq('id', variant.id)
          .single();

        if (selectError && selectError.code !== 'PGRST116') throw selectError;

        if (existingVariant) {
          // Update existing variant
          const { error: updateError } = await supabase
            .from('color_variants')
            .update({
              color_name: variant.color_name,
              image_url: variant.image_url,
              has_sizes: variant.has_sizes,
              product_id: productId,
            })
            .eq('id', variant.id);

          if (updateError) throw updateError;

          // Update or insert size variants
          for (const size of variant.size_variants) {
            const { data: existingSize, error: selectSizeError } = await supabase
              .from('size_variants')
              .select('*')
              .eq('id', size.id)
              .single();

            if (selectSizeError && selectSizeError.code !== 'PGRST116') throw selectSizeError;

            if (existingSize) {
              // Update existing size
              const { error: updateSizeError } = await supabase
                .from('size_variants')
                .update({
                  size_name: size.size_name,
                  size_code: size.size_code,
                  color_variant_id: variant.id,
                })
                .eq('id', size.id);

              if (updateSizeError) throw updateSizeError;
            } else {
              // Insert new size
              const { error: insertSizeError } = await supabase
                .from('size_variants')
                .insert({
                  id: size.id,
                  size_name: size.size_name,
                  size_code: size.size_code,
                  color_variant_id: variant.id,
                });

              if (insertSizeError) throw insertSizeError;
            }
          }
        } else {
          // Insert new variant
          const { error: insertError } = await supabase
            .from('color_variants')
            .insert({
              id: variant.id,
              color_name: variant.color_name,
              image_url: variant.image_url,
              has_sizes: variant.has_sizes,
              product_id: productId,
            });

          if (insertError) throw insertError;

          // Insert size variants
          for (const size of variant.size_variants) {
            const { error: insertSizeError } = await supabase
              .from('size_variants')
              .insert({
                id: size.id,
                size_name: size.size_name,
                size_code: size.size_code,
                color_variant_id: variant.id,
              });

            if (insertSizeError) throw insertSizeError;
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Variants saved successfully!',
      });
      onVariantsChange();
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

  if (loading) {
    return <p>Loading variants...</p>;
  }

  return (
    <div className="space-y-4">
      {variants.map((variant) => (
        <Card key={variant.id}>
          <CardHeader>
            <CardTitle>Variant: {variant.color_name || 'New Variant'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={`color-name-${variant.id}`}>Color Name</Label>
              <Input
                id={`color-name-${variant.id}`}
                type="text"
                value={variant.color_name}
                onChange={(e) => updateVariant(variant.id, 'color_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`image-url-${variant.id}`}>Image URL</Label>
              <Input
                id={`image-url-${variant.id}`}
                type="text"
                value={variant.image_url || ''}
                onChange={(e) => updateVariant(variant.id, 'image_url', e.target.value)}
              />
            </div>

            {hasSizeVariants && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Sizes</h4>
                {variant.size_variants.map((size) => (
                  <div key={size.id} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Label htmlFor={`size-name-${size.id}`}>Size Name</Label>
                      <Input
                        id={`size-name-${size.id}`}
                        type="text"
                        value={size.size_name}
                        onChange={(e) => updateSize(variant.id, size.id, 'size_name', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`size-code-${size.id}`}>Size Code</Label>
                      <Input
                        id={`size-code-${size.id}`}
                        type="text"
                        value={size.size_code || ''}
                        onChange={(e) => updateSize(variant.id, size.id, 'size_code', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSize(variant.id, size.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSize(variant.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Size
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="destructive"
              onClick={() => removeVariant(variant.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Variant
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addVariant}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Variant
      </Button>

      <Button
        type="button"
        onClick={saveVariants}
        disabled={loading}
      >
        Save Variants
      </Button>
    </div>
  );
}
