
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
    <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white py-2.5 relative z-50 sticky top-0 overflow-hidden">
      {/* Subtle shimmer overlay - using transform for composited animation */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{
          animation: 'shimmer 3s ease-in-out infinite',
          willChange: 'transform',
        }}
      />
      
      <div className="relative flex items-center justify-center px-12">
        <p 
          className="text-sm font-medium text-center"
          style={{
            animation: 'bounceX 8s ease-in-out infinite',
            willChange: 'transform',
          }}
        >
          ✨ {topBarText.text} ✨
        </p>
        <button
          onClick={handleClose}
          className="absolute right-3 bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-all duration-200 hover:scale-110"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      
      <style>{`
        @keyframes bounceX {
          0%, 100% {
            transform: translateX(-30%);
          }
          50% {
            transform: translateX(30%);
          }
        }
        @keyframes shimmer {
          0%, 100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
