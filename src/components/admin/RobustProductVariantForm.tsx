
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Plus, Upload, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ColorVariant {
  id: string;
  color_name: string;
  image_url?: string;
  stock_quantity: number;
  has_sizes: boolean;
  size_variants?: SizeVariant[];
}

interface SizeVariant {
  id: string;
  size_name: string;
  stock_quantity: number;
  size_code?: string;
}

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

            return {
              ...color,
              size_variants: sizes || []
            };
          })
        );

        setColorVariants(colorsWithSizes);
      } else {
        setColorVariants(colors || []);
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
      stock_quantity: 0,
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
      stock_quantity: 0
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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Product Variants - {productName}</h3>
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
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={deleting === color.id}
                      >
                        {deleting === color.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Color Variant</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the color "{color.color_name}"? 
                          This will also delete all associated size variants and images. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteColorVariant(color.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`color-name-${color.id}`}>Color Name</Label>
                  <Input
                    id={`color-name-${color.id}`}
                    value={color.color_name}
                    onChange={(e) => updateColorVariant(color.id, { color_name: e.target.value })}
                    disabled={saving}
                  />
                </div>
                {!hasSizeVariants && (
                  <div>
                    <Label htmlFor={`color-stock-${color.id}`}>Stock Quantity</Label>
                    <Input
                      id={`color-stock-${color.id}`}
                      type="number"
                      min="0"
                      value={color.stock_quantity}
                      onChange={(e) => updateColorVariant(color.id, { stock_quantity: parseInt(e.target.value) || 0 })}
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <Label>Color Image</Label>
                <div className="flex items-center gap-4 mt-2">
                  {color.image_url && (
                    <img
                      src={color.image_url}
                      alt={color.color_name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(color.id, file);
                      }}
                      disabled={uploadingImage === color.id}
                      className="hidden"
                      id={`image-upload-${color.id}`}
                    />
                    <Label
                      htmlFor={`image-upload-${color.id}`}
                      className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {uploadingImage === color.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploadingImage === color.id ? 'Uploading...' : 'Upload Image'}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Size Variants */}
              {hasSizeVariants && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-sm font-medium">Size Variants</Label>
                    <Button
                      onClick={() => addSizeVariant(color.id)}
                      size="sm"
                      variant="outline"
                      disabled={saving}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Size
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {color.size_variants?.map((size) => (
                      <div key={size.id} className="flex items-center gap-2 p-2 border rounded">
                        <Input
                          placeholder="Size name"
                          value={size.size_name}
                          onChange={(e) => updateSizeVariant(size.id, { size_name: e.target.value })}
                          disabled={saving}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Stock"
                          value={size.stock_quantity}
                          onChange={(e) => updateSizeVariant(size.id, { stock_quantity: parseInt(e.target.value) || 0 })}
                          disabled={saving}
                          className="w-20"
                        />
                        <Button
                          onClick={() => deleteSizeVariant(size.id)}
                          size="sm"
                          variant="destructive"
                          disabled={deleting === size.id || saving}
                        >
                          {deleting === size.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                    
                    {(!color.size_variants || color.size_variants.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No size variants added yet. Click "Add Size" to get started.
                      </p>
                    )}
                  </div>
                </div>
              )}
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
