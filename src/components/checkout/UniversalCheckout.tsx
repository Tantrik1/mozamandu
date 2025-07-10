
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { CheckoutValidation } from './CheckoutValidation';
import { PaymentScreenshotUpload } from './PaymentScreenshotUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function UniversalCheckout() {
  const { items: cartItems, getTotalPrice, clearCart } = useRobustCart();
  const { 
    promoCode, 
    setPromoCode, 
    appliedPromo, 
    isPromoApplied, 
    applyPromoCode, 
    removePromoCode 
  } = usePromoCode();
  
  const { 
    deliveryCharges, 
    paymentMethods, 
    loading: dataLoading 
  } = useCheckoutData();

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: ''
  });

  const [selectedDeliveryLocation, setSelectedDeliveryLocation] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [isValidCart, setIsValidCart] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const subtotal = getTotalPrice();
  const deliveryCharge = deliveryCharges.find(d => d.id === selectedDeliveryLocation)?.delivery_price || 0;
  const promoDiscount = isPromoApplied ? (appliedPromo?.discount_percentage || 0) * (subtotal + deliveryCharge) / 100 : 0;
  const finalTotal = subtotal + deliveryCharge - promoDiscount;

  const handleValidationResult = (isValid: boolean, error?: string) => {
    setIsValidCart(isValid);
    setValidationError(error || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidCart) {
      toast({
        title: 'Validation Error',
        description: validationError || 'Please fix cart issues before proceeding',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload payment screenshot if provided
      let screenshotUrl = null;
      if (paymentScreenshot) {
        const fileExt = paymentScreenshot.name.split('.').pop();
        const fileName = `payment-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('customer-payments')
          .upload(fileName, paymentScreenshot);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('customer-payments')
          .getPublicUrl(fileName);

        screenshotUrl = urlData.publicUrl;
      }

      // Create order
      const orderData = {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        contact_number: customerInfo.phone,
        whatsapp_number: customerInfo.whatsapp,
        delivery_address: customerInfo.address,
        delivery_location_id: selectedDeliveryLocation || null,
        payment_method_id: selectedPaymentMethod || null,
        subtotal: subtotal,
        delivery_charge: deliveryCharge,
        promocode_used: isPromoApplied ? appliedPromo?.code : null,
        promocode_discount: promoDiscount,
        total_amount: finalTotal,
        paid_amount: finalTotal,
        remaining_amount: 0,
        payment_screenshot_url: screenshotUrl,
        status: 'pending_payment'
      };

      const { data: order, error: orderError } = await supabase
        .from('customer_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      for (const item of cartItems) {
        await supabase
          .from('customer_order_items')
          .insert({
            order_id: order.id,
            product_id: item.productId,
            product_inventory_id: item.inventoryId,
            quantity: item.quantity
          });

        // Create order item details
        await supabase
          .from('customer_order_item_details')
          .insert({
            order_id: order.id,
            product_name: item.productName,
            color_name: item.colorName,
            size_name: item.sizeName,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            pricing_mode: 'normal'
          });
      }

      toast({
        title: 'Success',
        description: 'Order placed successfully!',
      });

      clearCart();
      
      // Redirect to success page or reset form
      setCustomerInfo({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: ''
      });
      setSelectedDeliveryLocation('');
      setSelectedPaymentMethod('');
      setPaymentScreenshot(null);

    } catch (error) {
      console.error('Order submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg">Your cart is empty</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CheckoutValidation 
        cartItems={cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          colorVariantId: item.colorVariantId,
          sizeVariantId: item.sizeVariantId,
          inventoryId: item.inventoryId
        }))}
        onValidationResult={handleValidationResult}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    value={customerInfo.whatsapp}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                    required
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery & Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="delivery">Delivery Location</Label>
                  <Select value={selectedDeliveryLocation} onValueChange={setSelectedDeliveryLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery location" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryCharges.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.place_name} - Rs. {location.delivery_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment">Payment Method</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPaymentMethod && (
                  <PaymentScreenshotUpload
                    onFileSelect={setPaymentScreenshot}
                    selectedFile={paymentScreenshot}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={`${item.productId}-${item.colorVariantId}-${item.sizeVariantId}`} className="flex justify-between">
                      <span>{item.productName} x {item.quantity}</span>
                      <span>Rs. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <hr />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery:</span>
                    <span>Rs. {deliveryCharge.toFixed(2)}</span>
                  </div>
                  {isPromoApplied && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedPromo?.code}):</span>
                      <span>-Rs. {promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>Rs. {finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => applyPromoCode(subtotal + deliveryCharge)}
                    >
                      Apply
                    </Button>
                  </div>
                  {isPromoApplied && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={removePromoCode}
                    >
                      Remove Promo Code
                    </Button>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!isValidCart || isSubmitting || dataLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </Button>

                {!isValidCart && validationError && (
                  <p className="text-red-500 text-sm">{validationError}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
