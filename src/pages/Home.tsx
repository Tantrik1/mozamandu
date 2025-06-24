
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { HeroSection } from '@/components/customer/HeroSection';
import { FeaturedProductsCarousel } from '@/components/customer/FeaturedProductsCarousel';
import { BrowseSubcategories } from '@/components/customer/BrowseSubcategories';
import { SubcategoryProductTabs } from '@/components/customer/SubcategoryProductTabs';
import { LatestProducts } from '@/components/customer/LatestProducts';
import { WhyChooseUs } from '@/components/customer/WhyChooseUs';
import { DeliveryInfo } from '@/components/customer/DeliveryInfo';
import { FAQSection } from '@/components/customer/FAQSection';
import { Footer } from '@/components/layout/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      
      {/* Hero Section - Full Viewport */}
      <HeroSection />

      {/* Browse Subcategories */}
      <BrowseSubcategories />

      {/* Featured Products Carousel */}
      <FeaturedProductsCarousel />

      {/* Subcategory Product Tabs */}
      <SubcategoryProductTabs />

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
    </div>
  );
}
