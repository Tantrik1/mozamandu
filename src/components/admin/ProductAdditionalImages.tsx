import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Eye, ImagePlus, Loader2, Upload } from 'lucide-react';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';

interface AdditionalImage {
  id?: string;
  file?: File;
  preview: string;
  isNew: boolean;
  uploading?: boolean;
  storagePath?: string;
}

interface ProductAdditionalImagesProps {
  productId?: string;
  onImagesChange?: (images: AdditionalImage[]) => void;
  maxImages?: number;
}

export interface ProductAdditionalImagesRef {
  uploadImages: (productId: string) => Promise<boolean>;
  hasNewImages: () => boolean;
}

// Use existing product-images bucket with subfolder for additional images
const BUCKET_NAME = 'product-images';

export const ProductAdditionalImages = forwardRef<ProductAdditionalImagesRef, ProductAdditionalImagesProps>(
  function ProductAdditionalImagesComponent({ productId, onImagesChange, maxImages = 3 }, ref) {
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

    const uploadImagesHandler = async (targetProductId: string): Promise<boolean> => {
      const newImages = images.filter(img => img.isNew && img.file);
      
      if (newImages.length === 0) {
        console.log('No new images to upload');
        return true;
      }

      setLoading(true);
      
      try {
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
            const { uploadToR2 } = await import('@/utils/r2Upload');

            const publicUrl = await uploadToR2(optimizedFile, `product_additional_images/${targetProductId}`);

            // Save to product_additional_images table (cast to any for external table)
            const insertData = {
              product_id: targetProductId,
              image_url: publicUrl,
              storage_path: publicUrl,
              display_order: i,
            };

            const { data: dbData, error: dbError } = await (supabase as any)
              .from('product_additional_images')
              .insert(insertData)
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
              p === img ? { 
                ...p, 
                isNew: false, 
                uploading: false, 
                id: dbData?.id || crypto.randomUUID(),
                storagePath: publicUrl 
              } : p
            ));

            toast({
              title: 'Image Uploaded',
              description: `Additional image ${i + 1} saved successfully`,
            });
          } catch (error) {
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

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      uploadImages: uploadImagesHandler,
      hasNewImages: () => images.some(img => img.isNew),
    }));

    const fetchExistingImages = async () => {
      if (!productId) return;
      
      try {
        // Cast to any for external table access
        const { data, error } = await (supabase as any)
          .from('product_additional_images')
          .select('id, image_url, storage_path, display_order')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching additional images:', error);
          return;
        }

        const existingImages: AdditionalImage[] = (data || []).map((img: any) => ({
          id: img.id,
          preview: img.image_url,
          storagePath: img.storage_path,
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
      
      if (imageToRemove.id) {
        try {
          // Images are stored in Cloudflare R2 - no client-side delete needed
          // The URL reference is removed from the database below

          // Delete from database (cast to any for external table)
          const { error } = await (supabase as any)
            .from('product_additional_images')
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
);

// Export types for external use
export { type AdditionalImage };
