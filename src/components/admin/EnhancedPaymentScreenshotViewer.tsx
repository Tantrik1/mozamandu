
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Eye, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  X, 
  Image as ImageIcon,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EnhancedPaymentScreenshotViewerProps {
  imageUrl: string | null;
  orderNumber: string;
  customerName: string;
  uploadedAt?: string;
}

export function EnhancedPaymentScreenshotViewer({ 
  imageUrl, 
  orderNumber, 
  customerName, 
  uploadedAt 
}: EnhancedPaymentScreenshotViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-screenshot-${orderNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Payment screenshot is being downloaded.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the payment screenshot.",
        variant: "destructive",
      });
    }
  };

  const resetViewControls = () => {
    setZoom(1);
    setRotation(0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const openImageInNewTab = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  if (!imageUrl) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <ImageIcon className="h-8 w-8 mb-2" />
            <p className="text-sm">No payment screenshot</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-sm cursor-pointer hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Image Preview */}
            <div className="relative">
              {imageLoading && (
                <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              {imageError ? (
                <div className="w-full h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
                  <AlertCircle className="h-6 w-6 mb-1" />
                  <p className="text-xs">Failed to load image</p>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt={`Payment screenshot for ${orderNumber}`}
                  className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  onClick={() => setIsModalOpen(true)}
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
              )}
            </div>

            {/* Image Info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Badge variant="secondary" className="text-xs">
                  Payment Screenshot
                </Badge>
                {!imageError && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Available
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Order:</strong> {orderNumber}</p>
                <p><strong>Customer:</strong> {customerName}</p>
                {uploadedAt && (
                  <p><strong>Uploaded:</strong> {new Date(uploadedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                disabled={imageError}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={imageError}
                className="flex-1"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openImageInNewTab}
                disabled={imageError}
                className="flex-1"
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                Open
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Full-Size Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>Payment Screenshot - {orderNumber}</span>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-xs px-2">
                  {Math.round(zoom * 100)}%
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(5, zoom + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRotation((rotation + 90) % 360)}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={resetViewControls}>
                  Reset
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={openImageInNewTab}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto bg-gray-50" style={{ height: 'calc(95vh - 200px)' }}>
            <div className="flex justify-center items-center min-h-full p-4">
              <div className="relative">
                <img
                  src={imageUrl}
                  alt={`Payment screenshot for ${orderNumber}`}
                  className="max-w-none h-auto object-contain transition-transform duration-200 cursor-move"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    minWidth: zoom < 1 ? 'auto' : undefined,
                    maxWidth: zoom < 1 ? '100%' : 'none'
                  }}
                  draggable={false}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Order Number:</strong> {orderNumber}</p>
                <p><strong>Customer:</strong> {customerName}</p>
              </div>
              <div>
                {uploadedAt && (
                  <p><strong>Upload Date:</strong> {new Date(uploadedAt).toLocaleString()}</p>
                )}
                <p><strong>Status:</strong> <Badge variant="outline" className="text-green-600">Available</Badge></p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
