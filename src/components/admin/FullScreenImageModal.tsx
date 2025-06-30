import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface FullScreenImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    orderId?: string;
}

const FullScreenImageModal: React.FC<FullScreenImageModalProps> = ({
    isOpen,
    onClose,
    imageUrl,
    orderId
}) => {
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !imageUrl) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-fadeIn"
            style={{ animation: 'fadeIn 0.3s' }}
            tabIndex={-1}
            aria-modal="true"
            role="dialog"
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
            {/* Image */}
            <img
                src={imageUrl}
                alt={`Payment screenshot for order ${orderId || 'unknown'}`}
                className="object-contain max-w-full max-h-full shadow-2xl rounded-lg transition-opacity duration-500"
                style={{ display: 'block' }}
            />
            {/* Fade-in animation */}
            <style>
                {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.4s ease; }
        `}
            </style>
        </div>
    );
};

export default FullScreenImageModal; 