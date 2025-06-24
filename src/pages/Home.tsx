
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { HeroSection } from '@/components/customer/HeroSection';
import { FeaturedProductsCarousel } from '@/components/customer/FeaturedProductsCarousel';
import { SubcategoryProductTabs } from '@/components/customer/SubcategoryProductTabs';
import { LatestProducts } from '@/components/customer/LatestProducts';
import { WhyChooseUs } from '@/components/customer/WhyChooseUs';
import { DeliveryInfo } from '@/components/customer/DeliveryInfo';
import { FAQSection } from '@/components/customer/FAQSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      
      {/* Hero Section - Full viewport height */}
      <HeroSection />

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
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Mozamandu</h3>
              <p className="text-gray-400">Your premium destination for quality apparel and accessories.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Socks</li>
                <li>Boxers</li>
                <li>Caps</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Contact Us</li>
                <li>Shipping Info</li>
                <li>Returns</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Facebook</li>
                <li>Instagram</li>
                <li>Twitter</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Mozamandu. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
