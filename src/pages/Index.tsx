
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { TopBar } from '@/components/customer/TopBar';
import { HeroSection } from '@/components/customer/HeroSection';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { Footer } from '@/components/layout/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <CustomerHeader />
      <NoticePopup />
      <HeroSection />
      <Footer />
    </div>
  );
}
