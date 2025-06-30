import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { useEffect } from 'react';

export default function ShippingPolicy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping & Exchange Policy</h1>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025
            </p>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Shipping Information</h2>
              <p className="text-gray-700 mb-4">
                We offer shipping <strong>all over Nepal</strong>. Most orders are delivered within <strong>1-2 business days</strong> after order confirmation. Delivery times may vary for remote areas, but we strive for the fastest possible service nationwide.
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Nationwide delivery coverage</li>
                <li>Fast dispatch and reliable logistics partners</li>
                <li>Order tracking available for all shipments</li>
              </ul>
            </section>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Exchange Policy</h2>
              <p className="text-gray-700 mb-4">
                If you are not satisfied with your purchase, you may <strong>exchange the product within 2 days of delivery</strong>. Exchanges are accepted at the customer's own shipping cost. No refunds are provided under any circumstances.
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Exchange requests must be made within 2 days of receiving the product</li>
                <li>Product must be unused, in original packaging, and in resalable condition</li>
                <li>Customer is responsible for all shipping costs related to the exchange</li>
                <li>No refunds are issued for any reason</li>
              </ul>
            </section>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Initiate an Exchange</h2>
              <ol className="list-decimal list-inside text-gray-700 mb-4 ml-4">
                <li>Contact our customer service at info@mozamandu.com or +977 9761691276 within 2 days of delivery</li>
                <li>Provide your order number and reason for exchange</li>
                <li>Follow the instructions provided by our team for shipping the product back</li>
                <li>Once we receive and inspect the product, we will process your exchange</li>
              </ol>
            </section>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Customer Service</strong><br />
                  Email: info@mozamandu.com<br />
                  Phone: +977 9761691276<br />
                  Address: Kathmandu, Nepal<br />
                  Hours: 12:00 PM - 6:00 PM (Daily)
                </p>
              </div>
            </section>
            <p className="text-gray-600 text-sm mt-8">
              This policy may be updated from time to time. Please check this page for the most current version.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
