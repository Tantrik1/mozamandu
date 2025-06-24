
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Gift, Tag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CheckoutPaymentProps {
  isGuest: boolean;
  onComplete: (orderId: string) => void;
  onBack: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  minimum_order_amount: number;
}

interface CheckoutInfo {
  customerName: string;
  customerEmail: string;
  contactNumber: string;
  whatsappNumber: string;
  deliveryLocationId: string;
  deliveryAddress: string;
}

export function CheckoutPayment({ isGuest, onComplete, onBack }: CheckoutPaymentProps) {
  const { cartItems, getTotalPrice, getItemPricing, activeCombo, clearCart } = useCart();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  
  const [paymentData, setPaymentData] = useState({
    promoCode: '',
    paymentMethodId: '',
    paidAmount: '',
    paymentNotes: '',
    paymentScreenshot: null as File | null,
  });

  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isPromoApplied, setIsPromoApplied] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
    loadCheckoutInfo();
  }, []);

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, name, qr_code_url')
      .eq('is_active', true);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
      return;
    }

    setPaymentMethods(data || []);
  };

  const loadCheckoutInfo = async () => {
    const saved = sessionStorage.getItem('checkoutInfo');
    if (!saved) {
      onBack();
      return;
    }

    const info: CheckoutInfo = JSON.parse(saved);
    setCheckoutInfo(info);

    // Fetch delivery charge
    const { data: deliveryData } = await supabase
      .from('delivery_charges')
      .select('delivery_price')
      .eq('id', info.deliveryLocationId)
      .single();

    if (deliveryData) {
      setDeliveryCharge(deliveryData.delivery_price);
    }
  };

  const applyPromoCode = async () => {
    if (!paymentData.promoCode || isPromoApplied) return;

    const subtotal = getTotalPrice();
    const totalWithDelivery = subtotal + deliveryCharge;

    const { data: promo, error } = await supabase
      .from('promocodes')
      .select('*')
      .eq('code', paymentData.promoCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promo) {
      toast({
        title: "Invalid Promo Code",
        description: "The promo code is invalid or expired",
        variant: "destructive",
      });
      return;
    }

    if (promo.minimum_order_amount && totalWithDelivery < promo.minimum_order_amount) {
      toast({
        title: "Minimum Order Not Met",
        description: `Minimum order amount for this promo code is Rs. ${promo.minimum_order_amount}`,
        variant: "destructive",
      });
      return;
    }

    setAppliedPromo(promo);
    setIsPromoApplied(true);
    toast({
      title: "Promo Code Applied!",
      description: `${promo.discount_percentage}% discount applied`,
    });
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setIsPromoApplied(false);
    setPaymentData({ ...paymentData, promoCode: '' });
  };

  const uploadPaymentScreenshot = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `payment-${Date.now()}.${fileExt}`;
    const filePath = `payment-screenshots/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const calculateTotals = () => {
    const subtotal = getTotalPrice();
    const totalWithDelivery = subtotal + deliveryCharge;
    const promoDiscount = appliedPromo 
      ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 
      : 0;
    const finalTotal = totalWithDelivery - promoDiscount;
    const minimumPayment = finalTotal * 0.2; // 20% minimum

    return {
      subtotal,
      deliveryCharge,
      promoDiscount,
      finalTotal,
      minimumPayment,
    };
  };

  const placeOrder = async () => {
    if (!checkoutInfo || !paymentData.paymentMethodId || !paymentData.paidAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    const paidAmount = parseFloat(paymentData.paidAmount);

    if (paidAmount < totals.minimumPayment) {
      toast({
        title: "Insufficient Payment",
        description: `Minimum payment required: Rs. ${totals.minimumPayment.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let paymentScreenshotUrl = null;
      if (paymentData.paymentScreenshot) {
        paymentScreenshotUrl = await uploadPaymentScreenshot(paymentData.paymentScreenshot);
        if (!paymentScreenshotUrl) {
          throw new Error('Failed to upload payment screenshot');
        }
      }

      console.log('Creating order with user_id:', user?.id || 'null (guest)');

      // Create order - ensure user_id is properly set for authenticated users
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null, // This is the key fix - properly linking to authenticated user
          customer_name: checkoutInfo.customerName,
          customer_email: checkoutInfo.customerEmail,
          contact_number: checkoutInfo.contactNumber,
          whatsapp_number: checkoutInfo.whatsappNumber || checkoutInfo.contactNumber,
          delivery_location_id: checkoutInfo.deliveryLocationId,
          delivery_address: checkoutInfo.deliveryAddress,
          delivery_charge: deliveryCharge,
          subtotal: totals.subtotal,
          total_amount: totals.finalTotal,
          paid_amount: paidAmount,
          remaining_amount: totals.finalTotal - paidAmount,
          combo_applied: !!activeCombo,
          combo_details: activeCombo ? JSON.stringify(activeCombo) : null,
          promocode_used: appliedPromo?.code || null,
          promocode_discount: totals.promoDiscount,
          payment_method_id: paymentData.paymentMethodId,
          payment_screenshot_url: paymentScreenshotUrl,
          payment_notes: paymentData.paymentNotes,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }

      console.log('Order created successfully:', orderData);

      // Create order items
      const orderItems = cartItems.map(item => {
        const pricing = getItemPricing(item);
        return {
          order_id: orderData.id,
          product_id: item.productId,
          color_variant_id: item.colorVariantId,
          size_variant_id: item.sizeVariantId,
          product_name: item.productName,
          color_name: item.colorName,
          size_name: item.sizeName,
          quantity: item.quantity,
          unit_price: pricing.finalPrice,
          total_price: pricing.finalPrice * item.quantity,
          pricing_mode: pricing.mode,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        throw itemsError;
      }

      // Clear cart and redirect
      clearCart();
      sessionStorage.removeItem('checkoutInfo');
      
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${orderData.order_number} has been created`,
      });

      onComplete(orderData.id);

    } catch (error) {
      console.error('Order creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!checkoutInfo) {
    return <div>Loading...</div>;
  }

  const totals = calculateTotals();
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === paymentData.paymentMethodId);

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cart Items */}
            <div className="space-y-3">
              {cartItems.map((item) => {
                const pricing = getItemPricing(item);
                return (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.productName}</h4>
                      {item.colorName && <p className="text-sm text-gray-600">Color: {item.colorName}</p>}
                      {item.sizeName && <p className="text-sm text-gray-600">Size: {item.sizeName}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">Qty: {item.quantity}</span>
                        {pricing.mode === 'combo' && (
                          <Badge variant="secondary" className="text-xs">
                            <Gift className="w-2 h-2 mr-1" />
                            Combo
                          </Badge>
                        )}
                        {pricing.mode === 'discount' && (
                          <Badge variant="secondary" className="text-xs">
                            <Tag className="w-2 h-2 mr-1" />
                            MOQ
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Rs. {pricing.finalPrice.toFixed(2)} each</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>Rs. {totals.deliveryCharge.toFixed(2)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-green-600">
                  <span>Promo Discount ({appliedPromo.discount_percentage}%)</span>
                  <span>-Rs. {totals.promoDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>Rs. {totals.finalTotal.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600">
                Minimum payment: Rs. {totals.minimumPayment.toFixed(2)} (20%)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Promo Code */}
            <div>
              <Label>Promo Code (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={paymentData.promoCode}
                  onChange={(e) => setPaymentData({ ...paymentData, promoCode: e.target.value })}
                  placeholder="Enter promo code"
                  disabled={isPromoApplied}
                />
                {!isPromoApplied ? (
                  <Button onClick={applyPromoCode} disabled={!paymentData.promoCode}>
                    Apply
                  </Button>
                ) : (
                  <Button variant="outline" onClick={removePromoCode}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select
                value={paymentData.paymentMethodId}
                onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethodId: value })}
              >
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

            {/* QR Code */}
            {selectedPaymentMethod && (
              <div className="text-center">
                <img
                  src={selectedPaymentMethod.qr_code_url}
                  alt={`${selectedPaymentMethod.name} QR Code`}
                  className="max-w-48 mx-auto border rounded-lg"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Scan to pay via {selectedPaymentMethod.name}
                </p>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <Label htmlFor="paid-amount">Payment Amount *</Label>
              <Input
                id="paid-amount"
                type="number"
                step="0.01"
                min={totals.minimumPayment}
                max={totals.finalTotal}
                value={paymentData.paidAmount}
                onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                placeholder={`Min: Rs. ${totals.minimumPayment.toFixed(2)}`}
              />
              <p className="text-sm text-gray-600 mt-1">
                You can pay between Rs. {totals.minimumPayment.toFixed(2)} - Rs. {totals.finalTotal.toFixed(2)}
              </p>
            </div>

            {/* Payment Screenshot */}
            <div>
              <Label htmlFor="screenshot">Payment Screenshot *</Label>
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentData({ 
                  ...paymentData, 
                  paymentScreenshot: e.target.files?.[0] || null 
                })}
                required
              />
            </div>

            {/* Payment Notes */}
            <div>
              <Label htmlFor="notes">Payment Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentData.paymentNotes}
                onChange={(e) => setPaymentData({ ...paymentData, paymentNotes: e.target.value })}
                placeholder="Any additional notes about your payment..."
                rows={3}
              />
            </div>

            <Button onClick={placeOrder} disabled={isLoading} className="w-full">
              {isLoading ? 'Placing Order...' : 'Place Order'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
