import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ColorVariant, SizeVariant } from '@/types/admin';

interface ProductVariantFormProps {
  productId: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onVariantsUpdate: () => void;
}

export default function ProductVariantForm({
  productId,
  hasColorVariants,
  hasSizeVariants,
  onVariantsUpdate
}: ProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (hasColorVariants) {
      fetchColorVariants();
    } else {
      setLoading(false);
    }
  }, [productId, hasColorVariants]);

  const fetchColorVariants = async () => {
    setLoading(true);
    try {
      const { data: colors, error: colorsError } = await supabase
        .from('color_variants')
        .select('*')
        .eq('product_id', productId)
        .order('color_name');

      if (colorsError) {
        console.error('Error fetching color variants:', colorsError);
        toast({
          title: "Error",
          description: "Failed to fetch color variants",
          variant: "destructive",
        });
        return;
      }

      if (hasSizeVariants && colors) {
        const colorsWithSizes = await Promise.all(
          colors.map(async (color) => {
            const { data: sizes, error: sizesError } = await supabase
              .from('size_variants')
              .select('*')
              .eq('color_variant_id', color.id)
              .order('size_name');

            if (sizesError) {
              console.error('Error fetching size variants for color:', color.id, sizesError);
            }

            // Transform database response to match our types
            const sizeVariants: SizeVariant[] = (sizes || []).map(size => ({
              id: size.id,
              size_name: size.size_name,
              size_code: size.size_code || undefined
            }));

            const colorVariant: ColorVariant = {
              id: color.id,
              color_name: color.color_name,
              image_url: color.image_url || undefined,
              has_sizes: Boolean(color.has_sizes),
              size_variants: sizeVariants
            };

            return colorVariant;
          })
        );

        setColorVariants(colorsWithSizes);
      } else {
        const transformedColors: ColorVariant[] = (colors || []).map(color => ({
          id: color.id,
          color_name: color.color_name,
          image_url: color.image_url || undefined,
          has_sizes: Boolean(color.has_sizes),
          size_variants: []
        }));
        setColorVariants(transformedColors);
      }
    } catch (error) {
      console.error('Unexpected error fetching variants:', error);
      toast({
        title: "Error",
        description: "Failed to load product variants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addColorVariant = async () => {
    const newColor = {
      color_name: 'New Color',
      has_sizes: hasSizeVariants
    };

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('color_variants')
        .insert({
          product_id: productId,
          ...newColor
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding color variant:', error);
        toast({
          title: "Error",
          description: "Failed to add color variant",
          variant: "destructive",
        });
        return;
      }

      const newColorVariant: ColorVariant = {
        id: data.id,
        color_name: data.color_name,
        image_url: data.image_url || undefined,
        has_sizes: Boolean(data.has_sizes),
        size_variants: []
      };

      setColorVariants(prev => [...prev, newColorVariant]);
      
      toast({
        title: "Success",
        description: "Color variant added successfully",
      });
    } catch (error) {
      console.error('Unexpected error adding color variant:', error);
      toast({
        title: "Error",
        description: "Failed to add color variant",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateColorVariant = async (colorId: string, updates: Partial<ColorVariant>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('color_variants')
        .update(updates)
        .eq('id', colorId);

      if (error) {
        console.error('Error updating color variant:', error);
        toast({
          title: "Error",
          description: "Failed to update color variant",
          variant: "destructive",
        });
        return;
      }

      setColorVariants(prev => prev.map(color =>
        color.id === colorId ? { ...color, ...updates } : color
      ));

      toast({
        title: "Success",
        description: "Color variant updated successfully",
      });
    } catch (error) {
      console.error('Unexpected error updating color variant:', error);
      toast({
        title: "Error",
        description: "Failed to update color variant",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteColorVariant = async (colorId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('color_variants')
        .delete()
        .eq('id', colorId);

      if (error) {
        console.error('Error deleting color variant:', error);
        toast({
          title: "Error",
          description: "Failed to delete color variant",
          variant: "destructive",
        });
        return;
      }

      setColorVariants(prev => prev.filter(color => color.id !== colorId));

      toast({
        title: "Success",
        description: "Color variant deleted successfully",
      });
    } catch (error) {
      console.error('Unexpected error deleting color variant:', error);
      toast({
        title: "Error",
        description: "Failed to delete color variant",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (colorId: string, file: File) => {
    setUploadingImages(prev => ({ ...prev, [colorId]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `color-variant-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      await updateColorVariant(colorId, { image_url: urlData.publicUrl });

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
      setUploadingImages(prev => ({ ...prev, [colorId]: false }));
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading variants...</div>;
  }

  if (!hasColorVariants) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">This product does not have color variants.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Product Variants</h3>
        <Button onClick={addColorVariant} disabled={saving}>
          <Plus className="h-4 w-4 mr-2" />
          Add Color
        </Button>
      </div>

      <div className="space-y-4">
        {colorVariants.map((color) => (
          <Card key={color.id}>
            <CardHeader>
              <CardTitle className="text-base">Color: {color.color_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Stock is managed through the inventory system based on color and size combinations.
              </p>
            </CardContent>
          </Card>
        ))}
        
        {colorVariants.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 mb-4">No color variants added yet.</p>
              <Button onClick={addColorVariant} disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Color
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
