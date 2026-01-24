import { Helmet } from 'react-helmet-async';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Privacy Policy | Mozamandu Nepal</title>
        <meta name="description" content="Learn how Mozamandu collects, uses, and protects your personal information when shopping for socks in Nepal." />
        <link rel="canonical" href="https://mozamandu.com/privacy-policy" />
        <meta property="og:title" content="Privacy Policy | Mozamandu Nepal" />
        <meta property="og:description" content="Learn how Mozamandu collects, uses, and protects your personal information." />
        <meta property="og:url" content="https://mozamandu.com/privacy-policy" />
        <meta property="og:type" content="website" />
        
        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mozamandu.com" },
              { "@type": "ListItem", "position": 2, "name": "Privacy Policy", "item": "https://mozamandu.com/privacy-policy" }
            ]
          })}
        </script>
        
        {/* WebPage Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Privacy Policy",
            "description": "Privacy policy for Mozamandu online socks store in Nepal.",
            "url": "https://mozamandu.com/privacy-policy",
            "dateModified": "2025-01-01",
            "inLanguage": "en",
            "isPartOf": {
              "@type": "WebSite",
              "name": "Mozamandu",
              "url": "https://mozamandu.com"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Mozamandu",
              "url": "https://mozamandu.com"
            }
          })}
        </script>
      </Helmet>
      
      <ModernNavbar />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This may include:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Personal identifiers (name, email address, phone number, District, Address, age, gender)</li>
                <li>Commercial information (purchase history, preferences)</li>
                <li>Payment information (processed securely through third-party processors)</li>
                <li>Communication records (customer support interactions)</li>
                <li>Device and usage information (IP address, browser type, pages visited)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Process and fulfill your orders</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Send you order confirmations and shipping updates</li>
                <li>Improve our products and services</li>
                <li>Comply with legal obligations</li>
                <li>Detect and prevent fraud</li>
                <li>For Delivery and Payment Fulfillment Purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>With service providers who assist in our operations (payment processors, shipping companies)</li>
                <li>When required by law or to protect our rights</li>
                <li>In connection with a business transaction (merger, acquisition)</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Your Rights Under CCPA</h2>
              <p className="text-gray-700 mb-4">
                If you are a California resident, you have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Know what personal information we collect, use, disclose, and sell</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of the sale of personal information (we do not sell personal information)</li>
                <li>Non-discrimination for exercising your privacy rights</li>
                <li>Request a copy of your personal information</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, please contact us at info@mozamandu.com or +9779761691276.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. International Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the effective date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this privacy policy, please contact us at:
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
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
