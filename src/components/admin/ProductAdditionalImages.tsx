import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Eye, ImagePlus, Loader2 } from 'lucide-react';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';

interface AdditionalImage {
  id?: string;
  file?: File;
  preview: string;
  isNew: boolean;
  uploading?: boolean;
}

interface ProductAdditionalImagesProps {
  productId?: string;
  onImagesChange?: (images: AdditionalImage[]) => void;
  maxImages?: number;
}

export function ProductAdditionalImages({ 
  productId, 
  onImagesChange,
  maxImages = 3 
}: ProductAdditionalImagesProps) {
  const [images, setImages] = useState<AdditionalImage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchExistingImages();
    }
  }, [productId]);

  useEffect(() => {
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  const fetchExistingImages = async () => {
    if (!productId) return;
    
    try {
      // Fetch product images - external DB schema has: id, product_id, image_url, color_variant_id, is_primary, image_type, storage_path
      // Filter for gallery images only (additional images)
      const result = await supabase
        .from('product_images')
        .select('id, image_url')
        .eq('product_id', productId);

      const data = result.data as any[];
      const error = result.error;

      if (error) {
        console.error('Error fetching additional images:', error);
        return;
      }

      // Filter for gallery type images if the column exists
      const galleryImages = data?.filter((img: any) => 
        img.image_type === 'gallery' || !img.image_type
      ) || data || [];

      const existingImages: AdditionalImage[] = galleryImages.map((img: any) => ({
        id: img.id,
        preview: img.image_url,
        isNew: false,
      }));

      setImages(existingImages);
    } catch (error) {
      console.error('Error fetching additional images:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Limit Reached',
        description: `You can only upload up to ${maxImages} additional images`,
        variant: 'destructive',
      });
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      // Validate file size (max 10MB - will be compressed if needed)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'Error',
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      // Validate it's an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: `${file.name} is not a valid image`,
          variant: 'destructive',
        });
        continue;
      }

      // Generate preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: AdditionalImage = {
          file,
          preview: event.target?.result as string,
          isNew: true,
        };
        setImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    e.target.value = '';
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    
    if (imageToRemove.id && productId) {
      try {
        const { error } = await supabase
          .from('product_images')
          .delete()
          .eq('id', imageToRemove.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Image removed',
        });
      } catch (error) {
        console.error('Error removing image:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove image',
          variant: 'destructive',
        });
        return;
      }
    }

    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (targetProductId: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const newImages = images.filter(img => img.isNew && img.file);
      
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        if (!img.file) continue;

        // Update uploading state
        setImages(prev => prev.map((p) => 
          p === img ? { ...p, uploading: true } : p
        ));

        try {
          // Optimize image with compression
          const { file: optimizedFile } = await prepareImageForUpload(img.file, PRODUCT_COMPRESSION);

          const fileName = `product-additional-${targetProductId}-${Date.now()}-${i}.webp`;

          console.log('📤 Uploading additional image:', fileName);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, optimizedFile, {
              contentType: 'image/webp',
              upsert: true, // Allow overwriting if file exists
            });

          if (uploadError) {
            console.error('❌ Storage upload error:', uploadError);
            toast({
              title: 'Upload Failed',
              description: `Storage error: ${uploadError.message}`,
              variant: 'destructive',
            });
            throw uploadError;
          }

          console.log('✅ Storage upload success:', uploadData);

          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          console.log('🔗 Public URL:', urlData.publicUrl);

          // Save to product_images table - using external DB schema
          // External schema has: product_id, image_url, color_variant_id, is_primary, image_type, storage_path
          const { data: dbData, error: dbError } = await supabase
            .from('product_images')
            .insert({
              product_id: targetProductId,
              image_url: urlData.publicUrl,
              is_primary: false,
              image_type: 'gallery',
              storage_path: fileName,
            } as any)
            .select()
            .single();

          if (dbError) {
            console.error('❌ Database insert error:', dbError);
            toast({
              title: 'Database Error',
              description: `Failed to save image record: ${dbError.message}`,
              variant: 'destructive',
            });
            throw dbError;
          }

          console.log('✅ Database insert success:', dbData);

          // Update image state to mark as uploaded
          setImages(prev => prev.map((p) => 
            p === img ? { ...p, isNew: false, uploading: false, id: dbData?.id || crypto.randomUUID() } : p
          ));

          toast({
            title: 'Image Uploaded',
            description: `Additional image ${i + 1} saved successfully`,
          });

          if (dbError) {
            console.error('❌ Database insert error:', dbError);
            toast({
              title: 'Database Error',
              description: `Failed to save image record: ${dbError.message}`,
              variant: 'destructive',
            });
            throw dbError;
          }

          console.log('✅ Database insert success:', dbData);

          // Update image state to mark as uploaded
          setImages(prev => prev.map((p) => 
            p === img ? { ...p, isNew: false, uploading: false, id: dbData?.id || crypto.randomUUID() } : p
          ));

          toast({
            title: 'Image Uploaded',
            description: `Additional image ${i + 1} saved successfully`,
          });
        } catch (error: any) {
          console.error('❌ Error uploading additional image:', error);
          setImages(prev => prev.map((p) => 
            p === img ? { ...p, uploading: false } : p
          ));
          throw error;
        }
      }

      return true;
    } catch (error) {
      console.error('Error uploading additional images:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload some images',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const hasNewImages = images.some(img => img.isNew);
  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Additional Images ({images.length}/{maxImages})
        </Label>
        {canAddMore && (
          <div>
            <input
              id="additional-images-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={loading}
            />
            <label
              htmlFor="additional-images-upload"
              className={`cursor-pointer inline-flex items-center justify-center px-3 py-1.5 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ImagePlus className="h-4 w-4 mr-1.5" />
              Add Images
            </label>
          </div>
        )}
      </div>

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Upload up to {maxImages} additional product images
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images will be automatically optimized (WebP format)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={image.preview}
                alt={`Additional ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border"
              />
              {image.uploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-6 w-6"
                  onClick={() => window.open(image.preview, '_blank')}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-6 w-6"
                  onClick={() => removeImage(index)}
                  disabled={image.uploading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {image.isNew && !image.uploading && (
                <div className="absolute bottom-1 left-1">
                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                    New
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {/* Add more placeholder */}
          {canAddMore && (
            <label
              htmlFor="additional-images-upload"
              className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Add</span>
            </label>
          )}
        </div>
      )}

      {hasNewImages && (
        <p className="text-xs text-muted-foreground">
          New images will be uploaded when you save the product
        </p>
      )}
    </div>
  );
}

// Export upload function for external use
export { type AdditionalImage };
