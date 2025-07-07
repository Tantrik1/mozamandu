import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { PaymentMethodSection } from './PaymentMethodSection';
import { PromoCodeSection } from './PromoCodeSection';
import { DeliveryLocationSelector } from './DeliveryLocationSelector';
import { reserveStockForOrder } from '@/utils/stockReservationManager';

interface CheckoutData {
  customerName: string;
  customerEmail: string;
  contactNumber: string;
  whatsappNumber: string;
  deliveryAddress: string;
  deliveryLocationId: string | null;
  paymentMethodId: string;
  paymentPercentage: number;
}

export function UniversalCheckout() {
  const { user } = useAuth();
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customerName: '',
    customerEmail: '',
    contactNumber: '',
    whatsappNumber: '',
    deliveryAddress: '',
    deliveryLocationId: null,
    paymentMethodId: '',
    paymentPercentage: 100,
  });

  const {
    promoCode,
    promoCodeDiscount,
    applyPromoCode,
    removePromoCode,
    loading: promoLoading
  } = usePromoCode();

  const {
    deliveryCharge,
    finalTotal,
    paidAmount,
    remainingAmount,
    subtotal
  } = useCheckoutData({
    cartItems,
    deliveryLocationId: checkoutData.deliveryLocationId,
    promoCodeDiscount,
    paymentPercentage: checkoutData.paymentPercentage
  });

  // Auto-fill user data if logged in
  useEffect(() => {
    if (user) {
      setCheckoutData(prev => ({
        ...prev,
        customerEmail: user.email || '',
      }));
    }
  }, [user]);

  const handleInputChange = (field: keyof CheckoutData, value: string | number) => {
    setCheckoutData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = ['customerName', 'customerEmail', 'contactNumber', 'deliveryAddress'];
    const missing = required.filter(field => !checkoutData[field as keyof CheckoutData]);
    
    if (missing.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in: ${missing.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before checkout",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      console.log('=== STARTING CHECKOUT PROCESS ===');
      console.log('Cart items:', cartItems);
      console.log('Is customer order:', !!user);

      // Validate stock for checkout items
      console.log('Validating stock for checkout items...');
      const stockValidationItems = cartItems.map(item => ({
        productId: item.productId,
        productInventoryId: item.productInventoryId,
        quantity: item.quantity
      }));

      console.log('Stock validation items:', stockValidationItems);

      // Check each item's stock availability
      for (const item of stockValidationItems) {
        const { data: inventoryData, error } = await supabase
          .from('product_inventory')
          .select('stock_quantity, reserved_stock, available_stock')
          .eq('product_id', item.productId)
          .eq('id', item.productInventoryId || '')
          .single();

        if (error || !inventoryData) {
          throw new Error(`Product inventory not found for item ${item.productId}`);
        }

        const availableStock = inventoryData.stock_quantity - inventoryData.reserved_stock;
        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for item. Available: ${availableStock}, Requested: ${item.quantity}`);
        }
      }

      console.log('Stock validation result: PASSED');
      console.log('Stock validation passed, proceeding with order creation...');

      // Create order based on user type
      let orderId: string;
      
      if (user) {
        // Customer order
        console.log('Creating customer order...');
        const { data: customerOrder, error: customerOrderError } = await supabase
          .from('customer_orders')
          .insert({
            user_id: user.id,
            customer_name: checkoutData.customerName,
            customer_email: checkoutData.customerEmail,
            contact_number: checkoutData.contactNumber,
            whatsapp_number: checkoutData.whatsappNumber || checkoutData.contactNumber,
            delivery_address: checkoutData.deliveryAddress,
            delivery_location_id: checkoutData.deliveryLocationId,
            subtotal: subtotal,
            delivery_charge: deliveryCharge,
            promocode_discount: promoCodeDiscount,
            promocode_used: promoCode,
            total_amount: finalTotal,
            paid_amount: paidAmount,
            remaining_amount: remainingAmount,
            payment_percentage: checkoutData.paymentPercentage,
            payment_method_id: checkoutData.paymentMethodId,
            status: 'pending_payment'
          })
          .select()
          .single();

        if (customerOrderError) {
          console.error('Customer order creation error:', customerOrderError);
          throw customerOrderError;
        }

        orderId = customerOrder.id;
        console.log('Customer order created successfully:', orderId);

        // Create customer order items
        console.log('Creating customer order items...');
        const customerOrderItems = cartItems.map(item => ({
          order_id: orderId,
          product_id: item.productId,
          product_inventory_id: item.productInventoryId,
          quantity: item.quantity
        }));

        const { error: customerOrderItemsError } = await supabase
          .from('customer_order_items')
          .insert(customerOrderItems);

        if (customerOrderItemsError) {
          console.error('Customer order items creation error:', customerOrderItemsError);
          throw customerOrderItemsError;
        }

        console.log('Customer order items created successfully');
      } else {
        // Guest order
        console.log('Creating regular order...');
        const { data: regularOrder, error: regularOrderError } = await supabase
          .from('orders')
          .insert({
            customer_name: checkoutData.customerName,
            customer_email: checkoutData.customerEmail,
            contact_number: checkoutData.contactNumber,
            whatsapp_number: checkoutData.whatsappNumber || checkoutData.contactNumber,
            delivery_address: checkoutData.deliveryAddress,
            delivery_location_id: checkoutData.deliveryLocationId,
            subtotal: subtotal,
            delivery_charge: deliveryCharge,
            promocode_discount: promoCodeDiscount,
            promocode_used: promoCode,
            total_amount: finalTotal,
            paid_amount: paidAmount,
            remaining_amount: remainingAmount,
            payment_percentage: checkoutData.paymentPercentage,
            payment_method_id: checkoutData.paymentMethodId,
            status: 'pending_payment'
          })
          .select()
          .single();

        if (regularOrderError) {
          console.error('Regular order creation error:', regularOrderError);
          throw regularOrderError;
        }

        orderId = regularOrder.id;
        console.log('Regular order created successfully:', orderId);

        // Create order items
        console.log('Creating order items...');
        const orderItems = cartItems.map(item => ({
          order_id: orderId,
          product_id: item.productId,
          product_inventory_id: item.productInventoryId,
          quantity: item.quantity
        }));

        const { error: orderItemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (orderItemsError) {
          console.error('Order items creation error:', orderItemsError);
          throw orderItemsError;
        }

        console.log('Order items created successfully');
      }

      // Reserve stock for the order
      console.log('Processing stock changes for order:', orderId);
      console.log('Processing stock changes for checkout:', stockValidationItems);
      
      const stockResult = await reserveStockForOrder(stockValidationItems, orderId);
      
      if (!stockResult.success) {
        console.error('Stock reservation failed:', stockResult);
        
        // Rollback stock reservations for failed checkout
        console.log('Rolling back stock reservations for failed checkout');
        
        toast({
          title: "Stock Issue",
          description: `Order created but stock processing failed. Please contact support.`,
          variant: "destructive",
        });
      } else {
        console.log('Stock reserved successfully:', stockResult);
        
        toast({
          title: "Order Placed Successfully",
          description: "Your order has been placed and stock has been reserved",
        });
      }

      // Clear cart and navigate to success page
      console.log('Clearing cart');
      clearCart();
      
      console.log('Order creation email sent successfully');
      
      // Navigate to appropriate success page
      const summaryUrl = user 
        ? `/customer-order-summary/${orderId}`
        : `/order-summary/${orderId}`;
      
      console.log('Navigating to:', summaryUrl);
      navigate(summaryUrl);

    } catch (error) {
      console.error('Checkout error:', error);
      
      let errorMessage = 'Failed to place order. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Insufficient stock')) {
          errorMessage = 'Some items in your cart are no longer available in the requested quantity.';
        } else if (error.message.includes('inventory not found')) {
          errorMessage = 'Some items in your cart are no longer available.';
        }
      }
      
      toast({
        title: "Order Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-4">Add some items to your cart before checkout</p>
          <Button onClick={() => navigate('/')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          {!user && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                <span className="font-medium">💡 Checking out as a guest.</span> Your order will be processed normally.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <p className="text-sm text-gray-600">Please provide your contact details for order delivery</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    value={checkoutData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerEmail">Email Address *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={checkoutData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <Input
                    id="contactNumber"
                    value={checkoutData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    value={checkoutData.whatsappNumber}
                    onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                    placeholder="Same as contact number if not provided"
                  />
                </div>
                
                <div>
                  <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                  <Textarea
                    id="deliveryAddress"
                    value={checkoutData.deliveryAddress}
                    onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                    required
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <DeliveryLocationSelector
              selectedLocationId={checkoutData.deliveryLocationId}
              onLocationChange={(locationId) => handleInputChange('deliveryLocationId', locationId)}
            />

            <PaymentMethodSection
              selectedPaymentMethodId={checkoutData.paymentMethodId}
              onPaymentMethodChange={(methodId) => handleInputChange('paymentMethodId', methodId)}
              paymentPercentage={checkoutData.paymentPercentage}
              onPaymentPercentageChange={(percentage) => handleInputChange('paymentPercentage', percentage)}
            />
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={`${item.productId}-${item.productInventoryId || 'no-inventory'}`} className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center space-x-3">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <h4 className="font-medium">{item.productName}</h4>
                        {item.colorName && (
                          <p className="text-sm text-gray-600">Color: {item.colorName}</p>
                        )}
                        {item.sizeName && (
                          <p className="text-sm text-gray-600">Size: {item.sizeName}</p>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        <p className="text-sm text-gray-600">Rs. {item.basePrice.toFixed(2)} each</p>
                      </div>
                    </div>
                    <p className="font-medium">Rs. {(item.basePrice * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span>Rs. {deliveryCharge.toFixed(2)}</span>
                  </div>
                  
                  {promoCodeDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Promo Discount</span>
                      <span>-Rs. {promoCodeDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>Rs. {finalTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Paid Amount ({checkoutData.paymentPercentage}%)</span>
                    <span>Rs. {paidAmount.toFixed(2)}</span>
                  </div>
                  
                  {remainingAmount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Remaining Amount</span>
                      <span>Rs. {remainingAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <PromoCodeSection
              promoCode={promoCode}
              promoCodeDiscount={promoCodeDiscount}
              onApplyPromoCode={applyPromoCode}
              onRemovePromoCode={removePromoCode}
              loading={promoLoading}
              orderTotal={subtotal}
            />

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading || !checkoutData.paymentMethodId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
