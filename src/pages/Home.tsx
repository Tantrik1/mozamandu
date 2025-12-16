import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { NoticePopup } from '@/components/notices/NoticePopup';
import {
  HeroSection,
  LatestProducts,
  ShopByCategory,
  MostSoldProducts,
  FAQSection,
  FeaturedDeals,
} from '@/components/home';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      <NoticePopup />
      
      {/* Hero Section */}
      <HeroSection />

      {/* Latest Products */}
      <LatestProducts />

      {/* Shop by Category */}
      <ShopByCategory />

      {/* Most Sold Products */}
      <MostSoldProducts />

      {/* FAQ Section */}
      <FAQSection />

      {/* Featured Deals */}
      <FeaturedDeals />

      {/* Footer */}
      <Footer />
    </div>
  );
}
