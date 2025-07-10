
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { HeroSection } from '@/components/customer/HeroSection';
import { FeaturedProductsCarousel } from '@/components/customer/FeaturedProductsCarousel';
import { BrowseSubcategories } from '@/components/customer/BrowseSubcategories';
import { LatestProducts } from '@/components/customer/LatestProducts';
import { WhyChooseUs } from '@/components/customer/WhyChooseUs';
import { DeliveryInfo } from '@/components/customer/DeliveryInfo';
import { FAQSection } from '@/components/customer/FAQSection';
import { Footer } from '@/components/layout/Footer';
import { NoticePopup } from '@/components/notices/NoticePopup';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <NoticePopup />
      <HeroSection />
      <BrowseSubcategories />
      <FeaturedProductsCarousel />
      <LatestProducts />
      <WhyChooseUs />
      <DeliveryInfo />
      <FAQSection />
      <Footer />
    </div>
  );
}
