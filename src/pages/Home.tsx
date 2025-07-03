import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { TopBar } from '@/components/customer/TopBar';
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
    <>
      <CustomerHeader />
      <NoticePopup />

      {/* Hero Section - Full Viewport */}
      <HeroSection />
      {/* Browse Subcategories */}

      <BrowseSubcategories />

      {/* Featured Products Carousel */}
      <FeaturedProductsCarousel />

      {/* Latest Products */}
      <LatestProducts />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Delivery Info */}
      <DeliveryInfo />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </>
  );
}
