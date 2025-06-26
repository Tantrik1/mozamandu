
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { DeliveryInformation } from '@/components/checkout/DeliveryInformation';
import { PaymentInformation } from '@/components/checkout/PaymentInformation';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItems } = useRobustCart();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryData, setDeliveryData] = useState({});
  const isGuest = searchParams.get('guest') === 'true';

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
    }
  }, [cartItems, navigate]);

  const handleNextStep = (data: any) => {
    if (currentStep === 1) {
      setDeliveryData(data);
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigate('/checkout-selection');
    }
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handlePreviousStep}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Back to Options' : 'Previous Step'}
          </Button>
          <h1 className="text-3xl font-bold">
            {isGuest ? 'Guest Checkout' : 'Checkout'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CheckoutSteps currentStep={currentStep} />
            
            {currentStep === 1 && (
              <DeliveryInformation
                user={user}
                isGuest={isGuest}
                onNext={handleNextStep}
              />
            )}
            
            {currentStep === 2 && (
              <PaymentInformation
                deliveryData={deliveryData}
                user={user}
                isGuest={isGuest}
                onPrevious={() => setCurrentStep(1)}
              />
            )}
          </div>

          <div className="lg:col-span-1">
            <CheckoutSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
