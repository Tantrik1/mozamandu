
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TopBarText {
  id: string;
  text: string;
  is_active: boolean;
}

export function TopBar() {
  const [topBarText, setTopBarText] = useState<TopBarText | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchTopBarText();
  }, []);

  const fetchTopBarText = async () => {
    try {
      const { data, error } = await supabase
        .from('top_bar_text')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error) {
        console.log('No active top bar text found');
        return;
      }

      if (data) {
        setTopBarText(data);
      }
    } catch (error) {
      console.error('Error fetching top bar text:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!topBarText || !isVisible) return null;

  return (
    <div className="bg-red-600 text-white py-2 relative z-50 sticky top-0 overflow-hidden">
      <div className="flex items-center">
        {/* Marquee container */}
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-sm font-medium mx-8">{topBarText.text}</span>
            <span className="text-sm font-medium mx-8">{topBarText.text}</span>
            <span className="text-sm font-medium mx-8">{topBarText.text}</span>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="absolute right-2 bg-red-700/50 hover:bg-red-700 rounded p-1 transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
