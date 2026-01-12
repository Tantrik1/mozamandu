import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
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

export interface ProductAdditionalImagesRef {
  uploadImages: (productId: string) => Promise<boolean>;
  hasNewImages: () => boolean;
}

const BUCKET_NAME = 'product-additional-images';

// External Supabase storage client for product additional images
const EXTERNAL_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg4NTcsImV4cCI6MjA2NjIzNDg1N30.cB3YipySfkizYpvwUPd9xlBlq_haPznmEpPgcbAwovQ';

const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

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

            const fileName = `${targetProductId}/${Date.now()}-${i}.webp`;

            console.log('📤 Uploading additional image to external bucket:', BUCKET_NAME, 'file:', fileName);

            // Use external Supabase for storage upload
            const { data: uploadData, error: uploadError } = await externalSupabase.storage
              .from(BUCKET_NAME)
              .upload(fileName, optimizedFile, {
                contentType: 'image/webp',
                upsert: true,
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

            // Get public URL from external Supabase
            const { data: urlData } = externalSupabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(fileName);

            console.log('🔗 Public URL:', urlData.publicUrl);

            // Save to product_additional_images table (using external Supabase for DB operations)
            const insertData = {
              product_id: targetProductId,
              image_url: urlData.publicUrl,
              storage_path: fileName,
              display_order: i,
            };

            const { data: dbData, error: dbError } = await externalSupabase
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
              p === img ? { ...p, isNew: false, uploading: false, id: dbData?.id || crypto.randomUUID() } : p
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
        // Use external Supabase for fetching from product_additional_images table
        const result = await externalSupabase
          .from('product_additional_images')
          .select('id, image_url, display_order')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });

        if (result.error) {
          console.error('Error fetching additional images:', result.error);
          return;
        }

        const existingImages: AdditionalImage[] = (result.data || []).map((img: any) => ({
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
          // Use external Supabase to delete from product_additional_images table
          const { error } = await externalSupabase
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
