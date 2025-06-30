
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

interface TopBarText {
  id: string;
  text: string;
  is_active: boolean;
}

export function TopBar() {
  const location = useLocation();
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

  // Don't show top bar on admin pages
  const isAdminPage = location.pathname.startsWith('/admin');
  
  if (!topBarText || !isVisible || isAdminPage) return null;

  return (
    <div className="bg-red-600 text-white text-center py-2 px-4 relative z-50" data-testid="top-bar">
      <div className="flex items-center justify-center">
        <p className="text-sm font-medium flex-1 text-center pr-8">
          {topBarText.text}
        </p>
        <button
          onClick={handleClose}
          className="absolute right-4 hover:bg-red-700 rounded p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
