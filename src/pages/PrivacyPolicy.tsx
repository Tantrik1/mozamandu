import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Data Collection</h2>
              <p className="text-gray-700 mb-4">
                We collect all data provided by customers, including but not limited to personal identifiers, contact information, purchase history, payment details, device and usage data, and communication records. This data is collected to provide, improve, and secure our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data Usage & Protection</h2>
              <p className="text-gray-700 mb-4">
                All collected data is used strictly for business operations, order fulfillment, customer support, and service improvement. We do not misuse, sell, or share your data with unauthorized third parties. Your privacy is protected under the California Consumer Privacy Act (CCPA), Global Consumer Acts, and other applicable privacy laws. We implement advanced security measures to safeguard your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Compliance & Rights</h2>
              <p className="text-gray-700 mb-4">
                We comply with all relevant privacy regulations, including CCPA and global consumer protection laws. Customers have the right to access, correct, or request deletion of their data, and to inquire about how their data is used. For any privacy-related requests, contact us at info@mozamandu.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We use industry-standard security protocols and organizational measures to protect your data from unauthorized access, alteration, or disclosure. While we strive for maximum security, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Policy Updates</h2>
              <p className="text-gray-700 mb-4">
                This privacy policy may be updated periodically. Material changes will be communicated via our website. Continued use of our services constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                For questions or concerns regarding your privacy, please contact us at info@mozamandu.com or +977 9761691276.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
