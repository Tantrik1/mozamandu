
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingCart, CreditCard, Truck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useCheckoutValidation } from './CheckoutValidation';
import { validateCartStock, processCheckoutStock } from '@/utils/inventoryManager';

export function UniversalCheckout() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useRobustCart();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    contact: '',
    address: '',
  });
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(50); // Default delivery charge

  const { validateStock, validatePromoCode, validatePaymentAmount } = useCheckoutValidation();

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalAmount = subtotal + deliveryCharge - promoDiscount;

  useEffect(() => {
    // You can fetch or calculate delivery charges based on location or other factors
    // For simplicity, we're using a fixed delivery charge
  }, []);

  const applyPromoCode = async () => {
    if (!promoCode) return;

    const result = await validatePromoCode(promoCode, subtotal);
    if (result.isValid) {
      toast({
        title: 'Promo Applied',
        description: 'Promo code applied successfully!',
      });
      setPromoDiscount(result.discount || 0);
    } else {
      toast({
        title: 'Invalid Promo',
        description: result.error || 'Invalid promo code',
        variant: 'destructive',
      });
      setPromoDiscount(0);
    }
  };

  const handleCheckout = async () => {
    if (!cartItems.length) return;

    setLoading(true);
    try {
      console.log('=== STARTING CHECKOUT PROCESS ===');
      
      // Validate stock before proceeding
      const stockValidation = await validateCartStock(cartItems);
      console.log('Stock validation result:', stockValidation);
      
      if (!stockValidation.isValid) {
        toast({
          title: 'Stock Validation Failed',
          description: stockValidation.errorMessages?.[0] || 'Some items are out of stock',
          variant: 'destructive',
        });
        return;
      }

      // Process checkout stock (reserve items)
      const stockProcessed = await processCheckoutStock(cartItems);
      if (!stockProcessed) {
        toast({
          title: 'Stock Processing Failed',
          description: 'Unable to reserve items. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Validate payment amount if partial payment is selected
      if (paymentType === 'partial') {
        const paymentValidation = validatePaymentAmount(partialAmount, totalAmount);
        if (!paymentValidation.isValid) {
          toast({
            title: 'Payment Validation Failed',
            description: paymentValidation.error || 'Invalid payment amount',
            variant: 'destructive',
          });
          return;
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create order using orders table (not customer_orders)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          contact_number: customerInfo.contact,
          delivery_address: customerInfo.address,
          total_amount: totalAmount,
          payment_method: paymentType === 'full' ? 'Full Payment' : 'Partial Payment',
          shipping_method: 'Standard Delivery',
          order_notes: '',
          user_id: user?.id || null,
          status: 'pending_payment' as const,
          subtotal: subtotal,
          delivery_charge: deliveryCharge,
          promocode_discount: promoDiscount,
          paid_amount: paymentType === 'full' ? totalAmount : partialAmount,
          remaining_amount: paymentType === 'full' ? 0 : totalAmount - partialAmount,
          payment_percentage: paymentType === 'full' ? 100 : Math.round((partialAmount / totalAmount) * 100),
          promocode_used: promoCode || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      for (const item of cartItems) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.productId,
            product_inventory_id: item.productInventoryId,
            quantity: item.quantity,
          });

        if (itemError) throw itemError;
      }

      // Clear cart
      clearCart();

      // Redirect to success page or show success message
      toast({
        title: 'Order Placed',
        description: 'Your order has been placed successfully!',
      });
      window.location.href = '/customer/orders';
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Universal Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your order with flexible payment options</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Your Cart ({cartItems.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                    <Button 
                      onClick={() => window.location.href = '/customer'} 
                      className="mt-4"
                    >
                      Continue Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{item.productName}</h4>
                          {item.colorName && (
                            <p className="text-sm text-gray-500">Color: {item.colorName}</p>
                          )}
                          {item.sizeName && (
                            <p className="text-sm text-gray-500">Size: {item.sizeName}</p>
                          )}
                          <p className="text-lg font-semibold">Rs. {item.price}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            {cartItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_name">Full Name *</Label>
                      <Input
                        id="customer_name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_email">Email *</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact_number">Contact Number *</Label>
                    <Input
                      id="contact_number"
                      value={customerInfo.contact}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, contact: e.target.value }))}
                      placeholder="Enter your contact number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery_address">Delivery Address *</Label>
                    <Input
                      id="delivery_address"
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter your delivery address"
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          {cartItems.length > 0 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span>Rs. {deliveryCharge.toFixed(2)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Promo Discount</span>
                      <span>-Rs. {promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>Rs. {totalAmount.toFixed(2)}</span>
                  </div>
                  
                  {/* Payment Options */}
                  <div className="space-y-4 mt-6">
                    <Label>Payment Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="full_payment"
                          name="payment_type"
                          value="full"
                          checked={paymentType === 'full'}
                          onChange={(e) => setPaymentType(e.target.value as 'full' | 'partial')}
                        />
                        <label htmlFor="full_payment">Full Payment (100%)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="partial_payment"
                          name="payment_type"
                          value="partial"
                          checked={paymentType === 'partial'}
                          onChange={(e) => setPaymentType(e.target.value as 'full' | 'partial')}
                        />
                        <label htmlFor="partial_payment">Partial Payment (Min 20%)</label>
                      </div>
                    </div>

                    {paymentType === 'partial' && (
                      <div>
                        <Label htmlFor="partial_amount">Payment Amount *</Label>
                        <Input
                          id="partial_amount"
                          type="number"
                          step="0.01"
                          min={totalAmount * 0.2}
                          max={totalAmount}
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                          placeholder={`Min: Rs. ${(totalAmount * 0.2).toFixed(2)}`}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Remaining: Rs. {(totalAmount - partialAmount).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleCheckout} 
                    className="w-full" 
                    size="lg"
                    disabled={loading}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {loading ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
