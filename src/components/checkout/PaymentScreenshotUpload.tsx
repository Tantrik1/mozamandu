
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface PaymentScreenshotUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function PaymentScreenshotUpload({ onFileSelect, selectedFile }: PaymentScreenshotUploadProps) {
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="payment-screenshot">Payment Screenshot</Label>
      <Input
        id="payment-screenshot"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
      {selectedFile && (
        <div className="text-sm text-green-600">
          Selected: {selectedFile.name}
        </div>
      )}
      <p className="text-xs text-gray-500">
        Upload a screenshot of your payment confirmation (max 5MB)
      </p>
    </div>
  );
}
