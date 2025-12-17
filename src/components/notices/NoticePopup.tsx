import { memo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface Notice {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

interface NoticePopupProps {
  notice: Notice | null | undefined;
}

export const NoticePopup = memo(function NoticePopup({ notice }: NoticePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (notice) {
      // Defer notice popup to not block initial render - show after 3 seconds
      const timer = setTimeout(() => {
        setShouldRender(true);
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const handleClose = () => {
    setIsOpen(false);
  };

  // Don't render anything until deferred
  if (!notice || !shouldRender) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl p-0 overflow-hidden [&>button]:hidden border-0">
        <VisuallyHidden>
          <DialogTitle>{notice.title}</DialogTitle>
          <DialogDescription>{notice.description || 'Notice'}</DialogDescription>
        </VisuallyHidden>
        <div className="relative aspect-video w-full">
          {/* Cross button on top right */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-50 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          {notice.image_url ? (
            <img
              src={notice.image_url}
              alt={notice.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <div className="text-center text-white p-6">
                <h2 className="text-2xl md:text-4xl font-bold mb-4">{notice.title}</h2>
                {notice.description && (
                  <p className="text-base md:text-lg opacity-90 max-w-2xl">
                    {notice.description}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Overlay text if there's an image */}
          {notice.image_url && (notice.title || notice.description) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                {notice.title}
              </h2>
              {notice.description && (
                <p className="text-sm md:text-base text-white/90 line-clamp-2">
                  {notice.description}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
