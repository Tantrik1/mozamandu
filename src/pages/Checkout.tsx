
import { EnhancedCheckout } from '@/components/checkout/EnhancedCheckout';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';

export default function Checkout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <EnhancedCheckout />
      <Footer />
    </div>
  );
}
