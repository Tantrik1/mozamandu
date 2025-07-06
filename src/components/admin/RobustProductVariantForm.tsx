import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Plus, Upload, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ColorVariant, SizeVariant } from '@/types/admin';

interface ProductVariantFormProps {
  productId: string;
  productName: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onVariantsUpdate: () => void;
}

export function RobustProductVariantForm({
  productId,
  productName,
  hasColorVariants,
  hasSizeVariants,
  onVariantsUpdate
}: ProductVariantFormProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

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
      console.log('Fetching color variants for product:', productId);
      
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

      console.log('Fetched color variants:', colors?.length || 0);

      // If product has size variants, fetch them too
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

      console.log('Added color variant:', data);
      setColorVariants(prev => [...prev, { ...data, size_variants: [] }]);
      
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

      console.log('Updated color variant:', colorId);
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
    setDeleting(colorId);
    try {
      console.log('Deleting color variant:', colorId);
      
      const { error } = await supabase
        .from('color_variants')
        .delete()
        .eq('id', colorId);

      if (error) {
        console.error('Error deleting color variant:', error);
        toast({
          title: "Error",
          description: "Failed to delete color variant: " + error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Color variant deleted successfully');
      setColorVariants(prev => prev.filter(color => color.id !== colorId));
      
      toast({
        title: "Success",
        description: "Color variant and associated sizes deleted successfully",
      });

      onVariantsUpdate();
    } catch (error) {
      console.error('Unexpected error deleting color variant:', error);
      toast({
        title: "Error",
        description: "Failed to delete color variant",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const addSizeVariant = async (colorId: string) => {
    const newSize = {
      color_variant_id: colorId,
      size_name: 'New Size',
    };

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('size_variants')
        .insert(newSize)
        .select()
        .single();

      if (error) {
        console.error('Error adding size variant:', error);
        toast({
          title: "Error",
          description: "Failed to add size variant",
          variant: "destructive",
        });
        return;
      }

      console.log('Added size variant:', data);
      setColorVariants(prev => prev.map(color => 
        color.id === colorId 
          ? { ...color, size_variants: [...(color.size_variants || []), data] }
          : color
      ));

      toast({
        title: "Success",
        description: "Size variant added successfully",
      });
    } catch (error) {
      console.error('Unexpected error adding size variant:', error);
      toast({
        title: "Error",
        description: "Failed to add size variant",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSizeVariant = async (sizeId: string, updates: Partial<SizeVariant>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('size_variants')
        .update(updates)
        .eq('id', sizeId);

      if (error) {
        console.error('Error updating size variant:', error);
        toast({
          title: "Error",
          description: "Failed to update size variant",
          variant: "destructive",
        });
        return;
      }

      console.log('Updated size variant:', sizeId);
      setColorVariants(prev => prev.map(color => ({
        ...color,
        size_variants: color.size_variants?.map(size => 
          size.id === sizeId ? { ...size, ...updates } : size
        )
      })));

      toast({
        title: "Success",
        description: "Size variant updated successfully",
      });
    } catch (error) {
      console.error('Unexpected error updating size variant:', error);
      toast({
        title: "Error",
        description: "Failed to update size variant",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteSizeVariant = async (sizeId: string) => {
    setDeleting(sizeId);
    try {
      const { error } = await supabase
        .from('size_variants')
        .delete()
        .eq('id', sizeId);

      if (error) {
        console.error('Error deleting size variant:', error);
        toast({
          title: "Error",
          description: "Failed to delete size variant",
          variant: "destructive",
        });
        return;
      }

      console.log('Size variant deleted successfully');
      setColorVariants(prev => prev.map(color => ({
        ...color,
        size_variants: color.size_variants?.filter(size => size.id !== sizeId)
      })));

      toast({
        title: "Success",
        description: "Size variant deleted successfully",
      });
    } catch (error) {
      console.error('Unexpected error deleting size variant:', error);
      toast({
        title: "Error",
        description: "Failed to delete size variant",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const uploadImage = async (colorId: string, file: File) => {
    setUploadingImage(colorId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${colorId}/${Date.now()}.${fileExt}`;

      console.log('Uploading image:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        toast({
          title: "Error",
          description: "Failed to upload image: " + uploadError.message,
          variant: "destructive",
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded, updating color variant with URL:', publicUrl);

      await updateColorVariant(colorId, { image_url: publicUrl });
    } catch (error) {
      console.error('Unexpected error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading variants...
      </div>
    );
  }

  if (!hasColorVariants && !hasSizeVariants) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">This product does not have color or size variants.</p>
          <p className="text-sm text-gray-400 mt-2">Stock is managed at the product level through the inventory system.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Product Variants - {productName}</h3>
          <p className="text-sm text-gray-600">Stock quantities are managed through the inventory panel</p>
        </div>
        {hasColorVariants && (
          <Button onClick={addColorVariant} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" />
            Add Color
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {colorVariants.map((color) => (
          <Card key={color.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Color: {color.color_name}</span>
                <div className="text-sm text-gray-500">
                  Variants: {color.size_variants.length} sizes
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Manage stock quantities for this variant through the inventory management panel.
              </p>
            </CardContent>
          </Card>
        ))}
        
        {colorVariants.length === 0 && hasColorVariants && (
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
