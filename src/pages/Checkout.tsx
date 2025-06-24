
import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { CheckoutAuthChoice } from '@/components/checkout/CheckoutAuthChoice';
import { CheckoutLogin } from '@/components/checkout/CheckoutLogin';
import { EnhancedCheckoutInfo } from '@/components/checkout/EnhancedCheckoutInfo';
import { EnhancedCheckoutPayment } from '@/components/checkout/EnhancedCheckoutPayment';
import { CheckoutSuccess } from '@/components/checkout/CheckoutSuccess';

type CheckoutStep = 'auth-choice' | 'login' | 'info' | 'payment' | 'success';

export default function Checkout() {
  const { cartItems, getTotalPrice, getTotalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('auth-choice');
  const [isGuest, setIsGuest] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
      return;
    }

    // If user is already logged in, skip to info step
    if (user) {
      setCurrentStep('info');
    }
  }, [cartItems, user, navigate]);

  const handleAuthChoice = (choice: 'guest' | 'login') => {
    if (choice === 'guest') {
      setIsGuest(true);
      setCurrentStep('info');
    } else {
      setCurrentStep('login');
    }
  };

  const handleLoginSuccess = () => {
    setCurrentStep('info');
  };

  const handleInfoComplete = () => {
    setCurrentStep('payment');
  };

  const handlePaymentComplete = (orderIdResult: string) => {
    setOrderId(orderIdResult);
    setCurrentStep('success');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">
            {getTotalItems()} items • Total: ${getTotalPrice().toFixed(2)}
          </p>
        </div>

        {currentStep === 'auth-choice' && (
          <CheckoutAuthChoice onChoice={handleAuthChoice} />
        )}

        {currentStep === 'login' && (
          <CheckoutLogin 
            onSuccess={handleLoginSuccess}
            onBack={() => setCurrentStep('auth-choice')}
          />
        )}

        {currentStep === 'info' && (
          <EnhancedCheckoutInfo 
            isGuest={isGuest}
            onComplete={handleInfoComplete}
            onBack={() => user ? navigate('/') : setCurrentStep('auth-choice')}
          />
        )}

        {currentStep === 'payment' && (
          <EnhancedCheckoutPayment 
            isGuest={isGuest}
            onComplete={handlePaymentComplete}
            onBack={() => setCurrentStep('info')}
          />
        )}

        {currentStep === 'success' && orderId && (
          <CheckoutSuccess orderId={orderId} />
        )}
      </div>
    </div>
  );
}
