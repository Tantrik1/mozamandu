
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-${Date.now()}.${fileExt}`;
      const filePath = `payment-screenshots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl);
      toast({
        title: 'Screenshot uploaded',
        description: 'Payment screenshot has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload payment screenshot. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="payment-screenshot">Upload Payment Proof *</Label>
        <Input
          id="payment-screenshot"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          required
        />
        <p className="text-xs text-red-500 mt-1">
          Payment screenshot is required to complete your order
        </p>
        {uploading && (
          <div className="flex items-center mt-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Uploading screenshot...
          </div>
        )}
      </div>

      {currentImageUrl && (
        <div className="relative">
          <img 
            src={currentImageUrl} 
            alt="Payment screenshot" 
            className="max-w-xs rounded-lg border"
          />
          {onRemove && (
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
