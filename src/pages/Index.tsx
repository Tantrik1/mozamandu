import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { HeroSection } from '@/components/customer/HeroSection';
import { NoticePopup } from '@/components/notices/NoticePopup';

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <NoticePopup />
      <HeroSection />
    </div>
  );
}
