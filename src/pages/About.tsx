
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            About <span className="text-red-600">Mozamandu</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Bringing comfort to your everyday style with premium socks and caps that are gentle on your feet.
          </p>
        </div>

        {/* Company Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Our Story</h2>
            <p className="text-gray-600 leading-relaxed">
              Mozamandu was born from a simple belief: everyone deserves comfort in their daily lives. 
              We started our journey with a mission to create premium socks and caps that not only look 
              great but feel incredible on your feet.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Based in the heart of Kathmandu, Nepal, we combine traditional craftsmanship with modern 
              design to bring you products that are both stylish and functional. Every product is 
              carefully selected to ensure the highest quality and comfort.
            </p>
          </div>
          <div className="relative">
            <img 
              src="/lovable-uploads/2d98ffef-154e-49c8-9c1c-39e09f1ea5ae.png" 
              alt="Mozamandu Logo" 
              className="w-full max-w-md mx-auto"
            />
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👣</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Comfort First</h3>
              <p className="text-gray-600">
                Every product is designed with your comfort in mind, ensuring a gentle experience 
                that lasts all day long.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Premium Quality</h3>
              <p className="text-gray-600">
                We source only the finest materials and work with skilled artisans to deliver 
                products that exceed expectations.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Style & Design</h3>
              <p className="text-gray-600">
                Fashion meets function in our thoughtfully designed collection that complements 
                your personal style.
              </p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Choose Mozamandu?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Local Expertise</h3>
              <p className="text-gray-600">
                Based in Kathmandu, we understand the local market and customer needs, ensuring 
                fast delivery and reliable service.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Customer Support</h3>
              <p className="text-gray-600">
                Our dedicated team is available to help you with any questions or concerns. 
                We're here to ensure your complete satisfaction.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Affordable Luxury</h3>
              <p className="text-gray-600">
                We believe premium quality shouldn't break the bank. Our products offer 
                exceptional value for money.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Wide Selection</h3>
              <p className="text-gray-600">
                From casual to formal, we offer a diverse range of styles and colors to 
                match every occasion and preference.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center bg-red-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Experience Mozamandu?</h2>
          <p className="text-gray-600 mb-6">
            Join thousands of satisfied customers who have made Mozamandu their go-to choice for comfort and style.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/products" 
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Shop Now
            </a>
            <a 
              href="/contact" 
              className="border border-red-600 text-red-600 px-6 py-3 rounded-lg font-medium hover:bg-red-600 hover:text-white transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
