
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';

interface PaymentScreenshotUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function PaymentScreenshotUpload({ onFileSelect, selectedFile }: PaymentScreenshotUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <Label htmlFor="payment-screenshot">Payment Screenshot</Label>
      <div className="mt-2">
        <input
          ref={fileInputRef}
          id="payment-screenshot"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="flex items-center justify-between p-3 border rounded-md">
            <span className="text-sm truncate">{selectedFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Payment Screenshot
          </Button>
        )}
      </div>
    </div>
  );
}
