import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { useHomepageData } from '@/hooks/useHomepageData';
import { HeroSection, LatestProducts, ShopByCategory, MostSoldProducts, FAQSection, FeaturedDeals } from '@/components/home';
export default function Home() {
  const {
    latestProducts,
    mostSoldProducts,
    categories,
    faqs,
    featuredProducts,
    notice,
    isLatestLoading,
    isMostSoldLoading,
    isCategoriesLoading,
    isFAQsLoading,
    isFeaturedLoading
  } = useHomepageData();
  return <div className="min-h-screen bg-background">
      <ModernNavbar />
      <NoticePopup notice={notice} />
      
      {/* Hero Section */}
      <HeroSection className="py-0" />

      {/* Latest Products */}
      <LatestProducts products={latestProducts} isLoading={isLatestLoading} />

      {/* Shop by Category */}
      <ShopByCategory categories={categories} isLoading={isCategoriesLoading} />

      {/* Most Sold Products */}
      <MostSoldProducts products={mostSoldProducts} isLoading={isMostSoldLoading} />

      {/* FAQ Section */}
      <FAQSection faqs={faqs} isLoading={isFAQsLoading} />

      {/* Featured Deals */}
      <FeaturedDeals products={featuredProducts} isLoading={isFeaturedLoading} />

      {/* Footer */}
      <Footer />
    </div>;
}