
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useComboManager } from '@/hooks/useComboManager';
import { PaymentScreenshotUpload } from './PaymentScreenshotUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getVariantStockInfo } from '@/utils/inventoryManager';
import { reserveStockForOrder, getOrderItemsForStockOperation } from '@/utils/stockReservationManager';

export function UniversalCheckout() {
  const { cartItems, getTotalPrice, clearCart } = useRobustCart();
  const { activeCombo } = useComboManager({ cartItems });
  const [discountTiers, setDiscountTiers] = useState<{[key: string]: any[]}>({});
  const { getItemPricing, getTotalPrice: getCartTotalPrice } = useCartPricing({
    cartItems,
    activeCombo,
    discountTiers
  });
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
  const [isValidCart, setIsValidCart] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Fetch discount tiers
  useEffect(() => {
    const fetchDiscountTiers = async () => {
      const subcategoryIds = [...new Set(cartItems.map(item => item.subcategoryId))];
      const allTiers: {[key: string]: any[]} = {};

      for (const subcategoryId of subcategoryIds) {
        try {
          const { data } = await supabase
            .from('discount_tiers')
            .select('*')
            .eq('subcategory_id', subcategoryId)
            .order('min_quantity');
          
          allTiers[subcategoryId] = data || [];
        } catch (error) {
          console.error('Error fetching discount tiers:', error);
        }
      }

      setDiscountTiers(allTiers);
    };

    if (cartItems.length > 0) {
      fetchDiscountTiers();
    }
  }, [cartItems]);

  const subtotal = getCartTotalPrice();
  const deliveryCharge = deliveryCharges.find(d => d.id === selectedDeliveryLocation)?.delivery_price || 0;
  const promoDiscount = isPromoApplied ? (appliedPromo?.discount_percentage || 0) * (subtotal + deliveryCharge) / 100 : 0;
  const finalTotal = subtotal + deliveryCharge - promoDiscount;

  // Stock validation during checkout
  useEffect(() => {
    const validateStockOnCheckout = async () => {
      if (cartItems.length === 0) {
        setIsValidCart(true);
        return;
      }

      try {
        for (const item of cartItems) {
          if (item.productInventoryId) {
            const stockInfo = await getVariantStockInfo(item.productId, item.productInventoryId);
            if (!stockInfo.isValid || (stockInfo.stockAmount || 0) < item.quantity) {
              setIsValidCart(false);
              setValidationError(`Insufficient stock for ${item.productName}. Available: ${stockInfo.stockAmount || 0}, Required: ${item.quantity}`);
              return;
            }
          }
        }
        setIsValidCart(true);
        setValidationError('');
      } catch (error) {
        console.error('Stock validation error:', error);
        setIsValidCart(false);
        setValidationError('Error validating stock availability');
      }
    };

    validateStockOnCheckout();
  }, [cartItems]);

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

      // Create order with user_id (required field)
      const orderData = {
        user_id: 'guest-user', // For guest checkout
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
        status: 'pending_payment' as const,
        combo_applied: !!activeCombo
      };

      const { data: order, error: orderError } = await supabase
        .from('customer_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items and detailed pricing information
      for (const item of cartItems) {
        const pricing = getItemPricing(item);
        
        await supabase
          .from('customer_order_items')
          .insert({
            order_id: order.id,
            product_id: item.productId,
            product_inventory_id: item.productInventoryId,
            quantity: item.quantity
          });

        // Create detailed order item with enhanced pricing details
        await supabase
          .from('customer_order_item_details')
          .insert({
            order_id: order.id,
            product_name: item.productName,
            color_name: item.colorName,
            size_name: item.sizeName,
            quantity: item.quantity,
            unit_price: pricing.finalPrice,
            total_price: pricing.finalPrice * item.quantity,
            pricing_mode: pricing.mode,
            pricing_details: {
              basePrice: item.basePrice,
              finalPrice: pricing.finalPrice,
              description: pricing.description,
              breakdown: pricing.breakdown || [],
              mode: pricing.mode,
              savings: item.basePrice - pricing.finalPrice,
              product_inventory_id: item.productInventoryId
            }
          });
      }

      // Reserve stock after order creation using Supabase functions
      try {
        const orderItems = await getOrderItemsForStockOperation(order.id, true);
        await reserveStockForOrder(orderItems, order.id);
      } catch (stockError) {
        console.error('Stock reservation error:', stockError);
        // Continue with order creation even if stock reservation fails
      }

      // Send order confirmation email
      try {
        await supabase.functions.invoke('send-order-email', {
          body: {
            type: 'order_created',
            orderId: order.id,
            isCustomerOrder: true
          }
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Continue even if email fails
      }

      toast({
        title: 'Success',
        description: 'Order placed successfully!',
      });

      clearCart();
      
      // Reset form
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
                <CardTitle className="flex items-center gap-2">
                  Order Summary
                  {activeCombo && (
                    <Badge className="bg-green-600">Combo Applied</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enhanced item breakdown */}
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const pricing = getItemPricing(item);
                    return (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.productName}</h4>
                            {item.colorName && (
                              <p className="text-xs text-gray-500">Color: {item.colorName}</p>
                            )}
                            {item.sizeName && (
                              <p className="text-xs text-gray-500">Size: {item.sizeName}</p>
                            )}
                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</span>
                              {pricing.mode !== 'normal' && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${pricing.mode === 'combo' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                                >
                                  {pricing.mode === 'combo' ? 'COMBO' : 'DISCOUNT'}
                                </Badge>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <Info className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Pricing Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-sm font-medium">{pricing.description}</p>
                                    </div>
                                    
                                    {pricing.breakdown && pricing.breakdown.length > 0 && (
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-gray-700">Breakdown:</h4>
                                        <div className="space-y-1">
                                          {pricing.breakdown.map((line, index) => (
                                            <p key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                              {line}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="border-t pt-3 space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span>Base Price:</span>
                                        <span>Rs. {item.basePrice.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm font-medium">
                                        <span>Final Price:</span>
                                        <span className="text-green-600">Rs. {pricing.finalPrice.toFixed(2)}</span>
                                      </div>
                                      {pricing.finalPrice < item.basePrice && (
                                        <div className="flex justify-between text-sm text-green-600">
                                          <span>You Save:</span>
                                          <span>Rs. {(item.basePrice - pricing.finalPrice).toFixed(2)} per item</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            {pricing.finalPrice !== item.basePrice && (
                              <p className="text-xs text-gray-500 line-through">
                                Rs. {(item.basePrice * item.quantity).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">Rs. {finalTotal.toFixed(2)}</span>
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
