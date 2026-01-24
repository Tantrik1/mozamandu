import { lazy, Suspense, memo } from 'react';
import { Helmet } from 'react-helmet-async';
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
      <Helmet>
        <title>Mozamandu | Best Socks in Nepal | Premium Moja Prices in Nepal</title>
        <meta name="description" content="Mozamandu - Nepal's #1 online socks store. Buy premium socks in Nepal at best prices. Wide collection of moja (socks) with fast delivery. Best socks prices in Nepal, moja mandu quality." />
        <meta name="keywords" content="mozamandu, best socks in nepal, premium socks in nepal, socks prices in nepal, moja mandu, moja in nepal, buy socks nepal, moja buy nepal, nepali socks, quality socks kathmandu" />
        <link rel="canonical" href="https://mozamandu.com" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Mozamandu | Best Socks in Nepal | Premium Moja Prices" />
        <meta property="og:description" content="Nepal's #1 online socks store. Buy premium socks at best prices. Wide collection of moja with fast delivery across Nepal." />
        <meta property="og:url" content="https://mozamandu.com" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://mozamandu.com/lovable-uploads/84f1077a-8761-4272-88fd-ec35838bbd2b.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mozamandu | Best Socks in Nepal" />
        <meta name="twitter:description" content="Nepal's #1 online socks store. Premium moja at best prices." />
        
        {/* Structured Data - ItemList for Products */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Best Socks in Nepal - Mozamandu Collection",
            "description": "Premium socks collection from Mozamandu - Nepal's best socks store",
            "url": "https://mozamandu.com",
            "numberOfItems": latestProducts?.length || 0,
            "itemListElement": latestProducts?.slice(0, 4).map((product, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": product.name,
                "description": `Premium ${product.name} - Best quality socks in Nepal`,
                "url": `https://mozamandu.com/product/${product.id}`,
                "image": product.image_url,
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "NPR",
                  "price": product.selling_price || 0,
                  "availability": "https://schema.org/InStock",
                  "seller": {
                    "@type": "Organization",
                    "name": "Mozamandu"
                  }
                }
              }
            })) || []
          })}
        </script>
      </Helmet>
      
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
