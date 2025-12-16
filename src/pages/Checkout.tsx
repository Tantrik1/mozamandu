import { UniversalCheckout } from '@/components/checkout/UniversalCheckout';
import { ModernNavbar } from '@/components/navbar';

export default function Checkout() {
  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      <UniversalCheckout />
    </div>
  );
}
