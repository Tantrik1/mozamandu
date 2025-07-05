import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface EditProductVariantFormProps {
    colorVariants: ColorVariant[];
    setColorVariants: (variants: ColorVariant[]) => void;
    hasSizeVariants: boolean;
}

export function EditProductVariantForm({
    colorVariants,
    setColorVariants,
    hasSizeVariants,
}: EditProductVariantFormProps) {
    const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
    const { toast } = useToast();

    const addColorVariant = () => {
        const newVariant: ColorVariant = {
            color_name: '',
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

    const removeColorVariant = (index: number) => {
        const updated = colorVariants.filter((_, i) => i !== index);
        setColorVariants(updated);
    };

    const addSizeVariant = (colorIndex: number) => {
        const updated = [...colorVariants];
        const newSizeVariant: SizeVariant = {
            size_name: '',
            size_code: ''
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Product Variants</h3>
                    <p className="text-sm text-gray-600">
                        Configure color and size variants for your product
                    </p>
                </div>
                <Button type="button" onClick={addColorVariant} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Color Variant
                </Button>
            </div>

            <div className="space-y-4">
                {colorVariants.map((variant, colorIndex) => (
                    <Card key={colorIndex} className="p-4">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base">
                                    Color Variant {colorIndex + 1}
                                </CardTitle>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeColorVariant(colorIndex)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Color Name *</Label>
                                    <Input
                                        value={variant.color_name}
                                        onChange={(e) => updateColorVariant(colorIndex, 'color_name', e.target.value)}
                                        placeholder="e.g., Red, Blue, Black"
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
                                            <span className="text-sm text-gray-500">Uploading...</span>
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

                            {hasSizeVariants && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label>Size Variants</Label>
                                        <Button
                                            type="button"
                                            onClick={() => addSizeVariant(colorIndex)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Size
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {variant.size_variants.map((sizeVariant, sizeIndex) => (
                                            <div key={sizeIndex} className="flex items-center space-x-2 p-2 border rounded">
                                                <div className="flex-1">
                                                    <Input
                                                        value={sizeVariant.size_name}
                                                        onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_name', e.target.value)}
                                                        placeholder="Size name (e.g., S, M, L, XL)"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Input
                                                        value={sizeVariant.size_code || ''}
                                                        onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, 'size_code', e.target.value)}
                                                        placeholder="Size code (optional)"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeSizeVariant(colorIndex, sizeIndex)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {colorVariants.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No color variants added yet.</p>
                    <p className="text-sm">Click "Add Color Variant" to get started.</p>
                </div>
            )}
        </div>
    );
} 