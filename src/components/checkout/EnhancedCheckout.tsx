
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, DollarSign, MapPin, User } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useComboManager } from '@/hooks/useComboManager';
import { useCartPricing } from '@/hooks/useCartPricing';
import { EnhancedCheckoutInfo } from './EnhancedCheckoutInfo';
import { EnhancedCheckoutPayment } from './EnhancedCheckoutPayment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type CheckoutStep = 'cart' | 'info' | 'payment' | 'confirmation';

interface CheckoutData {
  customerName: string;
  customerEmail: string;
  contactNumber: string;
  whatsappNumber: string;
  deliveryLocationId: string;
  deliveryAddress: string;
  paymentMethodId: string;
  paymentPercentage: number;
  paymentScreenshot?: string;
}

export function EnhancedCheckout() {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('cart');
  const [checkoutData, setCheckoutData] = useState<Partial<CheckoutData>>({});
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');

  const { cartItems, removeFromCart, clearCart } = useRobustCart();
  const { activeCombo } = useComboManager({ cartItems });
  const { 
    getTotalPrice, 
    getDeliveryCharge, 
    getPromoDiscount, 
    getDiscountTiers,
    subcategoryQuantities
  } = useCartPricing({ cartItems, activeCombo, discountTiers: {} });

  const totalPrice = getTotalPrice();
  const deliveryCharge = getDeliveryCharge();
  const promoDiscount = getPromoDiscount();
  const finalTotal = totalPrice + deliveryCharge - promoDiscount;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsGuest(!session);
  };

  const handleBackToCart = () => {
    setCurrentStep('cart');
  };

  const handleInfoComplete = () => {
    const savedData = sessionStorage.getItem('checkoutInfo');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setCheckoutData(parsedData);
    }
    setCurrentStep('payment');
  };

  const handlePaymentComplete = async (paymentData: any) => {
    setLoading(true);
    try {
      const orderData = {
        ...checkoutData,
        ...paymentData,
        cartItems,
        totalAmount: finalTotal,
        deliveryCharge,
        promoDiscount,
        activeCombo,
        subcategoryQuantities
      };

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: orderData
      });

      if (error) throw error;

      setOrderNumber(data.orderNumber);
      setCurrentStep('confirmation');
      clearCart();
      sessionStorage.removeItem('checkoutInfo');
      
      toast({
        title: 'Order Placed Successfully!',
        description: `Your order ${data.orderNumber} has been created.`,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === 'info') {
    return (
      <EnhancedCheckoutInfo
        isGuest={isGuest}
        onComplete={handleInfoComplete}
        onBack={handleBackToCart}
      />
    );
  }

  if (currentStep === 'payment') {
    return (
      <EnhancedCheckoutPayment
        totalAmount={finalTotal}
        onComplete={handlePaymentComplete}
        onBack={() => setCurrentStep('info')}
        loading={loading}
      />
    );
  }

  if (currentStep === 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
          <p className="text-gray-600 mb-4">Thank you for your order.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="text-xl font-bold text-gray-900">{orderNumber}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={() => window.open(`/order-summary/${orderNumber}`, '_blank')}
            className="w-full"
          >
            View Order Details
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Order Summary ({cartItems.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.image_url || '/placeholder.svg'}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <h4 className="font-medium">{item.productName}</h4>
                        {item.colorName && (
                          <p className="text-sm text-gray-500">Color: {item.colorName}</p>
                        )}
                        {item.sizeName && (
                          <p className="text-sm text-gray-500">Size: {item.sizeName}</p>
                        )}
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {(item.basePrice * item.quantity).toFixed(2)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {cartItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Your cart is empty</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => window.location.href = '/'}
                  >
                    Continue Shopping
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Price Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCombo && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <Badge className="mb-2">Active Combo</Badge>
                  <p className="text-sm">{activeCombo.name}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>Rs. {deliveryCharge.toFixed(2)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo Discount:</span>
                    <span>-Rs. {promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>Rs. {finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {cartItems.length > 0 && (
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep('info')}
                >
                  Proceed to Checkout
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
