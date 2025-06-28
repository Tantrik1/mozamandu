import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import imageCompression from 'browser-image-compression';

interface PaymentScreenshotUploadProps {
  onUploadComplete: (url: string) => void;
  currentImageUrl?: string;
  onRemove?: () => void;
}

export function PaymentScreenshotUpload({ 
  onUploadComplete, 
  currentImageUrl, 
  onRemove 
}: PaymentScreenshotUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { user, userProfile } = useAuth();

  // Determine which bucket to use based on user type
  const getBucketName = () => {
    if (!user) {
      return 'guest-payments';
    }
    
    if (userProfile?.role === 'admin') {
      return 'admin-payments';
    }
    
    return 'customer-payments';
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // Max 1MB after compression
      maxWidthOrHeight: 1920, // Max dimensions
      useWebWorker: true,
      quality: 0.8, // 80% quality
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log('Original file size:', file.size / 1024 / 1024, 'MB');
      console.log('Compressed file size:', compressedFile.size / 1024 / 1024, 'MB');
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    }
  };

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG, PNG, or WebP image file.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setCompressing(true);
    setUploadProgress(0);

    try {
      // Compress the image
      const compressedFile = await compressImage(file);
      setCompressing(false);
      setUploading(true);

      // Determine bucket and file path based on user type
      const bucketName = getBucketName();
      const timestamp = new Date().toISOString().split('T')[0];
      const randomId = Math.random().toString(36).substring(7);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `payment-screenshots/${timestamp}/payment_${randomId}.${fileExt}`;

      console.log(`Uploading to ${bucketName} bucket:`, fileName);

      // Upload to the appropriate bucket based on user type
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      
      console.log('Upload successful, public URL:', data.publicUrl);
      
      toast({
        title: "Upload Successful",
        description: "Payment screenshot uploaded successfully!",
      });

      onUploadComplete(data.publicUrl);
      setPreview(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setCompressing(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      uploadFile(file);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeImage = () => {
    setPreview(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-4">
      {!currentImageUrl && !preview && (
        <Card 
          className={`border-2 border-dashed transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <Upload className="h-full w-full" />
              </div>
              <div className="text-sm text-gray-600 mb-4">
                <label className="cursor-pointer text-blue-600 hover:text-blue-500">
                  Click to upload
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleInputChange}
                    disabled={uploading || compressing}
                  />
                </label>
                {' '}or drag and drop
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP up to 5MB (will be compressed automatically)
              </p>
              <p className="text-xs text-blue-500 mt-1">
                {user ? 
                  `Uploading as ${userProfile?.role === 'admin' ? 'Admin' : 'Customer'}` : 
                  'Uploading as Guest'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(compressing || uploading) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {compressing ? 'Compressing image...' : 'Uploading...'}
                </p>
                <Progress value={compressing ? 50 : 100} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(currentImageUrl || preview) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={currentImageUrl || preview || ''}
                  alt="Payment Screenshot"
                  className="w-20 h-20 object-cover rounded-lg border"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Payment Screenshot
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentImageUrl ? 'Uploaded successfully' : 'Preview'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeImage}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
