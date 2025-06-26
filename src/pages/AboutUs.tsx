
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-center mb-8">About Us</h1>
          <div className="prose prose-lg mx-auto text-gray-700">
            <p className="text-xl mb-6">
              Welcome to our store! We are dedicated to providing quality products and exceptional service.
            </p>
            <p className="mb-6">
              Our mission is to deliver the best shopping experience with a wide range of products 
              at competitive prices. We believe in building lasting relationships with our customers 
              through trust, quality, and reliability.
            </p>
            <p>
              Thank you for choosing us for your shopping needs. We look forward to serving you!
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
