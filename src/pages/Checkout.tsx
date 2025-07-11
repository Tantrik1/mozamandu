
import { UniversalCheckout } from '@/components/checkout/UniversalCheckout';
import { CustomerHeader } from '@/components/customer/CustomerHeader';

export default function Checkout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <UniversalCheckout />
    </div>
  );
}
