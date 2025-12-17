import { lazy, Suspense, memo } from 'react';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { useHomepageData } from '@/hooks/useHomepageData';
import { HeroSection, LatestProducts, ShopByCategory } from '@/components/home';

// Lazy load below-the-fold sections
const MostSoldProducts = lazy(() => import('@/components/home/MostSoldProducts').then(m => ({ default: m.MostSoldProducts })));
const FAQSection = lazy(() => import('@/components/home/FAQSection').then(m => ({ default: m.FAQSection })));
const MixedProducts = lazy(() => import('@/components/home/MixedProducts').then(m => ({ default: m.MixedProducts })));
const FeaturedDeals = lazy(() => import('@/components/home/FeaturedDeals').then(m => ({ default: m.FeaturedDeals })));

// Simple section skeleton
const SectionSkeleton = memo(() => (
  <div className="py-10 md:py-12 lg:py-16 bg-background">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  </div>
));

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

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      <NoticePopup notice={notice} />
      
      {/* Hero Section - Critical, loads immediately */}
      <HeroSection />

      {/* Latest Products - Priority content */}
      <LatestProducts products={latestProducts} isLoading={isLatestLoading} />

      {/* Shop by Category */}
      <ShopByCategory categories={categories} isLoading={isCategoriesLoading} />

      {/* Below-the-fold content - Lazy loaded */}
      <Suspense fallback={<SectionSkeleton />}>
        <MostSoldProducts products={mostSoldProducts} isLoading={isMostSoldLoading} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <FAQSection faqs={faqs} isLoading={isFAQsLoading} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <MixedProducts />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedDeals products={featuredProducts} isLoading={isFeaturedLoading} />
      </Suspense>

      <Footer />
    </div>
  );
}
