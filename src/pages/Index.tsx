import { ModernNavbar } from '@/components/navbar';
import { HeroSection } from '@/components/customer/HeroSection';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { Footer } from '@/components/layout/Footer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const { data: notice } = useQuery({
    queryKey: ['notice'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notices')
        .select('id, title, description, image_url')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      <NoticePopup notice={notice} />
      <HeroSection />
      <Footer />
    </div>
  );
}
