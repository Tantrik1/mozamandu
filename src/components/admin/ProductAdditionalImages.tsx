import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Eye, ImagePlus, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { prepareImageForUpload, PRODUCT_COMPRESSION } from '@/utils/imageOptimizer';
import { MediaPicker } from './MediaPicker';

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
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
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
            const { uploadToR2, ensureUploadedUrl } = await import('@/utils/r2Upload');

            let publicUrl = await uploadToR2(optimizedFile, `product_additional_images/${targetProductId}`);
            publicUrl = (await ensureUploadedUrl(publicUrl, `product_additional_images/${targetProductId}`)) || publicUrl;

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

        // Generate preview using Blob URL
        const newImage: AdditionalImage = {
          file,
          preview: URL.createObjectURL(file),
          isNew: true,
        };
        setImages(prev => [...prev, newImage]);
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
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-primary" />
            Additional Gallery Images ({images.length}/{maxImages})
          </Label>
        </div>

        {images.length === 0 ? (
          <div 
            onClick={() => canAddMore && setIsMediaPickerOpen(true)}
            className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center space-y-2 group"
          >
            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <ImagePlus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Click to add up to {maxImages} gallery images</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pick existing media or upload new files to R2</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
                <img
                  src={image.preview}
                  alt={`Additional ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {image.uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 rounded-full bg-white/90 text-black hover:bg-white"
                    onClick={() => window.open(image.preview, '_blank')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7 rounded-full"
                    onClick={() => removeImage(index)}
                    disabled={image.uploading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {image.isNew && !image.uploading && (
                  <div className="absolute bottom-1 left-1">
                    <span className="text-[9px] bg-primary text-primary-foreground font-semibold px-1.5 py-0.5 rounded-md shadow-xs">
                      New
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {canAddMore && (
              <div 
                onClick={() => setIsMediaPickerOpen(true)}
                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:text-primary space-y-1"
              >
                <ImagePlus className="h-5 w-5" />
              </div>
            )}
          </div>
        )}

        {hasNewImages && (
          <p className="text-xs text-muted-foreground">
            New images will be uploaded when you save the product
          </p>
        )}

        <MediaPicker
          open={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          folder="products"
          onSelect={(url) => {
            setImages(prev => [
              ...prev,
              {
                preview: url,
                isNew: false,
                storagePath: url,
              }
            ]);
            toast({ title: 'Image Selected', description: 'Added image from Media Library' });
          }}
        />
      </div>
    );
  }
);

// Export types for external use
export { type AdditionalImage };
