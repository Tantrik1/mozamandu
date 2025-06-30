
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>

          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using the Mozamandu website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
              <p className="text-gray-700 mb-4">
                These Terms and Conditions constitute a legally binding agreement between you and Mozamandu. Your use of our website and services is subject to these terms, which may be updated from time to time without prior notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use License</h2>
              <p className="text-gray-700 mb-4">
                Permission is granted to temporarily download one copy of the materials on Mozamandu's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
              <p className="text-gray-700 mb-4">
                To place orders, you must create an account and provide accurate, complete information. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Immediately notifying us of any unauthorized use</li>
                <li>Ensuring your account information remains current and accurate</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Orders and Payment</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Order Acceptance</h3>
              <p className="text-gray-700 mb-4">
                All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, including but not limited to product availability, errors in pricing, or fraud prevention.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Pricing</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>All prices are subject to change without notice</li>
                <li>Prices include applicable taxes unless otherwise stated</li>
                <li>Shipping charges are calculated separately and displayed at checkout</li>
                <li>We reserve the right to correct pricing errors</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Payment Terms</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Payment is due at the time of order placement</li>
                <li>We accept various payment methods as displayed at checkout</li>
                <li>All transactions are processed securely</li>
                <li>Failed payments may result in order cancellation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Return Policy</h2>
              <p className="text-gray-700 mb-4">
                Returns are accepted within 7 days of delivery, subject to our return policy conditions. Items must be:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>In original, unused condition</li>
                <li>In original packaging with all tags attached</li>
                <li>Accompanied by proof of purchase</li>
                <li>Free from damage not caused by defect</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Refunds will be processed within 3-5 business days after we receive and inspect the returned items. Custom or personalized items cannot be returned unless defective.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Content Usage and Intellectual Property</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Our Content</h3>
              <p className="text-gray-700 mb-4">
                All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Mozamandu and is protected by copyright and other intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">User-Generated Content</h3>
              <p className="text-gray-700 mb-4">
                By submitting content (reviews, comments, photos), you grant us a non-exclusive, royalty-free, perpetual license to use, modify, and display such content for business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Copyright and Trademark Notices</h2>
              <p className="text-gray-700 mb-4">
                The Mozamandu name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Mozamandu. You must not use such marks without our prior written permission.
              </p>
              <p className="text-gray-700 mb-4">
                If you believe any content on our website infringes your copyright, please contact us immediately at info@mozamandu.com with detailed information about the alleged infringement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Prohibited Uses</h2>
              <p className="text-gray-700 mb-4">
                You may not use our website or services to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit malicious code or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the website's functionality</li>
                <li>Harvest personal information of other users</li>
                <li>Impersonate another person or entity</li>
                <li>Engage in fraudulent activities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitations of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Mozamandu shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
                <li>Damages resulting from your use or inability to use our services</li>
                <li>Damages resulting from any third-party conduct or content</li>
                <li>Damages resulting from unauthorized access to your data</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Our total liability for any claim arising out of or relating to these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to our services immediately, without prior notice, if you breach these Terms. Upon termination:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Your right to use our services will cease immediately</li>
                <li>We may delete your account and all associated data</li>
                <li>Outstanding orders may be cancelled</li>
                <li>Refunds will be processed according to our return policy</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You may terminate your account at any time by contacting us or through your account settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms and Conditions are governed by and construed in accordance with the laws of Nepal. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Nepal.
              </p>
              <p className="text-gray-700 mb-4">
                If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on this page. Your continued use of our services after any changes constitutes acceptance of the new Terms.
              </p>
              <p className="text-gray-700 mb-4">
                We encourage you to review these Terms periodically to stay informed of any updates.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms and Conditions, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Mozamandu</strong><br />
                  Email: info@mozamandu.com<br />
                  Phone: +977 9761691276<br />
                  Address: Kathmandu, Nepal
                </p>
              </div>
            </section>

            <p className="text-gray-600 text-sm mt-8 p-4 bg-yellow-50 rounded-lg">
              <strong>Important:</strong> By creating an account and using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
