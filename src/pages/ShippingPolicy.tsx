
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping & Refunds Policy</h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Shipping Information</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Delivery Hours</h3>
              <p className="text-gray-700 mb-4">
                Our delivery hours are from <strong>12:00 PM to 6:00 PM</strong>, Monday through Sunday.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Delivery Areas</h3>
              <p className="text-gray-700 mb-4">
                We currently deliver within Kathmandu Valley and surrounding areas. Delivery charges vary by location and will be calculated at checkout.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Processing Time</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>In-stock items: 1-2 business days</li>
                <li>Custom orders: 3-5 business days</li>
                <li>Bulk orders: 5-7 business days</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Shipping Methods</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>For orders placed before 12 PM, we offer same-day delivery between 12-3 PM. Orders between 12-2 PM can be delivered the same day between 3-6 PM or the next day 12-3 PM. Orders after 2 PM will be delivered the next day between 12-3 PM. For outside valley, it may generally take upto 2-3days.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Return Policy</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Return Window</h3>
              <p className="text-gray-700 mb-4">
                You may return items within <strong>2 days</strong> of delivery on your own expense. No refunds will be provided.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Return Conditions</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Items must be unused and in original condition</li>
                <li>Original packaging and tags must be intact</li>
                <li>Items must not show signs of wear or damage</li>
                <li>Custom or personalized items cannot be returned unless defective</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Non-Returnable Items</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Undergarments and intimate apparel</li>
                <li>Items damaged by misuse or normal wear</li>
                <li>Items returned after 7 days</li>
                <li>Items without original packaging or tags</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Refund Policy</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Refund Processing</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Refunds are processed within 3-5 business days after we receive the returned item</li>
                <li>Refunds will be issued to the original payment method</li>
                <li>Shipping charges are non-refundable unless the return is due to our error</li>
                <li>Customer is responsible for return shipping costs unless the item is defective</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Partial Refunds</h3>
              <p className="text-gray-700 mb-4">
                Partial refunds may be granted for:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Items returned with minor damage or signs of use</li>
                <li>Items returned without original packaging</li>
                <li>Items returned after 7 days but within 14 days</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Exchange Policy</h2>
              <p className="text-gray-700 mb-4">
                We accept exchanges for different sizes or colors within 7 days of delivery, subject to availability. The item must meet all return conditions mentioned above.
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Exchanges are free if the item is defective or we sent the wrong item</li>
                <li>Size/color exchanges may inc ur additional shipping charges</li>
                <li>Exchange processing takes 3-5 business days</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Damaged or Defective Items</h2>
              <p className="text-gray-700 mb-4">
                If you receive a damaged or defective item:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Contact us immediately at info@mozamandu.com or +977 9761691276</li>
                <li>Provide photos of the damaged item</li>
                <li>We will arrange for immediate replacement or full refund</li>
                <li>Return shipping will be covered by us</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Initiate a Return</h2>
              <ol className="list-decimal list-inside text-gray-700 mb-4 ml-4">
                <li>Contact our customer service team at info@mozamandu.com or +977 9761691727</li>
                <li>Provide your order number and reason for return</li>
                <li>We will provide you with return instructions and authorization</li>
                <li>Package the item securely in original packaging</li>
                <li>Ship the item back to us using a trackable shipping method</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For any shipping or return inquiries, please contact us:
              </p>
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
