import React from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { X } from 'lucide-react';

interface PaymentScreenshotViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  orderId?: string;
}

const PaymentScreenshotViewer: React.FC<PaymentScreenshotViewerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  orderId
}) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!fixed !inset-0 !w-screen !h-screen !max-w-none !max-h-none !p-0 !bg-black/95 flex items-center justify-center z-[1000] transition-opacity duration-300 animate-fadeIn"
        style={{ margin: 0, borderRadius: 0 }}
        aria-label="Payment Screenshot Viewer"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close viewer"
          className="absolute top-6 right-8 z-50 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white transition-colors"
          tabIndex={0}
        >
          <X size={28} />
        </button>
        {/* Image with drop shadow and fade-in */}
        <img
          src={imageUrl}
          alt={`Payment screenshot for order ${orderId || 'unknown'}`}
          className="object-contain max-w-full max-h-full shadow-2xl rounded-lg transition-opacity duration-500 animate-fadeIn"
          style={{ display: 'block' }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PaymentScreenshotViewer;

// Add fadeIn animation to your global CSS or Tailwind config:
// @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
// .animate-fadeIn { animation: fadeIn 0.4s ease; }
