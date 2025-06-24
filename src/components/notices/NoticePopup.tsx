
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notice {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

export function NoticePopup() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    // Only show popup for admin users
    if (userProfile?.role === 'admin') {
      fetchActiveNotice();
    }
  }, [userProfile]);

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
        // No active notice found
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
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold pr-8">
              {notice.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {notice.image_url && (
            <div className="relative">
              <img
                src={notice.image_url}
                alt={notice.title}
                className="w-full h-auto max-h-80 object-cover rounded-lg"
              />
            </div>
          )}
          
          {notice.description && (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600 leading-relaxed">
                {notice.description}
              </p>
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
