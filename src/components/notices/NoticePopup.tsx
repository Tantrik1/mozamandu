
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Notice {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

export function NoticePopup() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchActiveNotice();
  }, []);

  const fetchActiveNotice = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, description, image_url')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('No active notice found');
        return;
      }

      if (data) {
        setNotice(data);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error fetching active notice:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setNotice(null);
  };

  if (!notice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl p-0 overflow-hidden [&>button]:hidden border-0">
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
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
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
}
