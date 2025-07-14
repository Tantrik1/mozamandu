
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

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Delivery Areas & Timeline</h3>
              <p className="text-gray-700 mb-4">
                We deliver within <strong>2 days</strong> in Kathmandu, Nepal. Delivery charges vary by location and will be calculated at checkout.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Shipping Methods</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>For orders placed before 12 PM, we offer same-day delivery between 12-3 PM. Orders between 12-2 PM can be delivered the same day between 3-6 PM or the next day 12-3 PM. Orders after 2 PM will be delivered the next day between 12-3 PM. For outside valley, it may generally take upto 2-3days.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Return Policy</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Return/Exchange Window</h3>
              <p className="text-gray-700 mb-4">
                You may exchange items within <strong>2 days</strong> of delivery at your own expense. <strong>No refunds will be provided.</strong>
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Return Conditions</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Items must be unused and in original condition</li>
                <li>Original packaging and tags must be intact</li>
                <li>Items must not show signs of wear or damage</li>
                <li>Custom or personalized items cannot be returned unless defective</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Non-Exchangeable Items</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Undergarments and intimate apparel</li>
                <li>Items damaged by misuse or normal wear</li>
                <li>Items returned after 2 days</li>
                <li>Items without original packaging or tags</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Refund Policy</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-red-800 mb-3">Important: No Refunds Policy</h3>
                <p className="text-red-700 font-medium">
                  <strong>No refunds are provided under any circumstances.</strong> We only offer exchanges at the customer's cost within 2 days of delivery.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Exchange Policy</h2>
              <p className="text-gray-700 mb-4">
                We accept exchanges for different sizes or colors within <strong>2 days of delivery</strong>, subject to availability. The item must meet all return conditions mentioned above.
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li><strong>Customer pays for all shipping costs</strong> (return shipping + new delivery)</li>
                <li>Exchanges are only free if the item is defective or we sent the wrong item</li>
                <li>Exchange processing takes 2-3 business days after we receive the returned item</li>
                <li>Exchanges are subject to product availability</li>
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
                <li>Contact our customer service team at info@mozamandu.com or +977 9761691276</li>
                <li>Provide your order number and reason for exchange</li>
                <li>We will provide you with return instructions and authorization</li>
                <li>Package the item securely in original packaging</li>
                <li>Ship the item back to us using a trackable shipping method at your expense</li>
                <li>Pay for return shipping and new delivery charges</li>
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
