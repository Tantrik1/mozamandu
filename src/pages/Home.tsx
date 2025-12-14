// Home page component
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { HeroSection } from '@/components/customer/HeroSection';
import BrowseSubcategories from '@/components/customer/BrowseSubcategories';
import EnhancedFeaturedProducts from '@/components/customer/EnhancedFeaturedProducts';
import LatestProducts from '@/components/customer/LatestProducts';
import { FAQSection } from '@/components/customer/FAQSection';
import { SubcategoryProductTabs } from '@/components/customer/SubcategoryProductTabs';
import { Footer } from '@/components/layout/Footer';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <NoticePopup />
      
      {/* Hero Section - Original Black Background */}
      <HeroSection />

      {/* Subcategories Carousel */}
      <BrowseSubcategories />

      {/* Featured Products Carousel */}
      <EnhancedFeaturedProducts />

      {/* Latest Products */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LatestProducts />
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section for FAQ */}
      <section className="py-12 bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Still have questions?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Browse our comprehensive FAQ section for detailed answers to common questions about our products, shipping, and policies.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/faq" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              View All FAQs
            </Link>
          </Button>
        </div>
      </section>

      {/* Subcategory Product Tabs */}
      <SubcategoryProductTabs />

      {/* Footer */}
      <Footer />
    </div>
  );
}
