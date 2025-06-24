
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Gift, Tag, AlertCircle, Loader2, CheckCircle, User, MapPin, Phone, Mail } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCheckoutValidation } from './CheckoutValidation';
import { useCheckoutSession } from './CheckoutSession';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

export function EnhancedCheckoutPayment({ isGuest, onComplete, onBack }: CheckoutPaymentProps) {
  const { cartItems, getTotalPrice, getItemPricing, activeCombo, clearCart } = useCart();
  const { user } = useAuth();
  const { updateActivity, isExpired } = useCheckoutSession();
  const { validateStock, validatePromoCode, validatePaymentAmount, validateFileUpload, isValidating } = useCheckoutValidation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  
  const [paymentData, setPaymentData] = useState({
    promoCode: '',
    paymentMethodId: '',
    paymentType: 'partial' as 'full' | 'partial',
    paidAmount: '',
    paymentNotes: '',
    paymentScreenshot: null as File | null,
  });

  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [stockValidated, setStockValidated] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
    loadCheckoutInfo();
    validateInventory();
  }, []);

  const validateInventory = async () => {
    const validation = await validateStock(cartItems);
    if (!validation.isValid) {
      toast({
        title: "Stock Unavailable",
        description: validation.error,
        variant: "destructive",
      });
      onBack();
      return;
    }
    setStockValidated(true);
  };

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

    // Fetch delivery charge and location name
    const { data: deliveryData } = await supabase
      .from('delivery_charges')
      .select('delivery_price, place_name')
      .eq('id', info.deliveryLocationId)
      .single();

    if (deliveryData) {
      setDeliveryCharge(deliveryData.delivery_price);
      setDeliveryLocation(deliveryData.place_name);
    }
  };

  const applyPromoCode = async () => {
    if (!paymentData.promoCode || isPromoApplied) return;

    updateActivity();
    const subtotal = getTotalPrice();
    const totalWithDelivery = subtotal + deliveryCharge;

    const validation = await validatePromoCode(paymentData.promoCode, totalWithDelivery);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid Promo Code",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Fetch the actual promo code details
    const { data: promo } = await supabase
      .from('promocodes')
      .select('*')
      .eq('code', paymentData.promoCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (promo) {
      setAppliedPromo(promo);
      setIsPromoApplied(true);
      toast({
        title: "Promo Code Applied!",
        description: `${promo.discount_percentage}% discount applied`,
      });
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setIsPromoApplied(false);
    setPaymentData({ ...paymentData, promoCode: '' });
  };

  const uploadPaymentScreenshot = async (file: File): Promise<string | null> => {
    const fileValidation = validateFileUpload(file);
    if (!fileValidation.isValid) {
      toast({
        title: "Invalid File",
        description: fileValidation.error,
        variant: "destructive",
      });
      return null;
    }

    try {
      setUploadProgress(10);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-${Date.now()}.${fileExt}`;
      const filePath = `payment-screenshots/${fileName}`;

      setUploadProgress(50);

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file');
      }

      setUploadProgress(90);

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      return null;
    }
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

  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    const totals = calculateTotals();
    setPaymentData(prev => ({
      ...prev,
      paymentType: type,
      paidAmount: type === 'full' ? totals.finalTotal.toString() : ''
    }));
  };

  const placeOrder = async () => {
    if (isExpired) {
      toast({
        title: "Session Expired",
        description: "Please restart the checkout process",
        variant: "destructive",
      });
      return;
    }

    if (!checkoutInfo || !paymentData.paymentMethodId || !paymentData.paidAmount || !paymentData.paymentScreenshot) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including payment screenshot",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    const paidAmount = parseFloat(paymentData.paidAmount);

    const paymentValidation = validatePaymentAmount(paidAmount, totals.finalTotal);
    if (!paymentValidation.isValid) {
      toast({
        title: "Invalid Payment Amount",
        description: paymentValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Final stock validation before order creation
    const stockValidation = await validateStock(cartItems);
    if (!stockValidation.isValid) {
      toast({
        title: "Stock Unavailable",
        description: stockValidation.error,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    updateActivity();

    try {
      let paymentScreenshotUrl = null;
      if (paymentData.paymentScreenshot) {
        paymentScreenshotUrl = await uploadPaymentScreenshot(paymentData.paymentScreenshot);
        if (!paymentScreenshotUrl) {
          throw new Error('Failed to upload payment screenshot');
        }
      }

      // Create order using database transaction
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
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

      if (orderError) throw orderError;

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

      if (itemsError) throw itemsError;

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
      setUploadProgress(0);
    }
  };

  if (isExpired) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your checkout session has expired. Please start over.
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.href = '/'} className="mt-4">
          Return to Home
        </Button>
      </div>
    );
  }

  if (!checkoutInfo || !stockValidated) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span>Loading checkout information...</span>
      </div>
    );
  }

  const totals = calculateTotals();
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === paymentData.paymentMethodId);

  return (
    <div className="max-w-6xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="space-y-6">
          {/* Complete Order Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Order Summary
                {stockValidated && (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items with detailed pricing */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const pricing = getItemPricing(item);
                  return (
                    <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productName}</h4>
                        {item.colorName && <p className="text-sm text-gray-600">Color: {item.colorName}</p>}
                        {item.sizeName && <p className="text-sm text-gray-600">Size: {item.sizeName}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm">Qty: {item.quantity}</span>
                          {pricing.mode === 'combo' && (
                            <Badge variant="secondary" className="text-xs">
                              <Gift className="w-2 h-2 mr-1" />
                              Combo Price
                            </Badge>
                          )}
                          {pricing.mode === 'discount' && (
                            <Badge variant="secondary" className="text-xs">
                              <Tag className="w-2 h-2 mr-1" />
                              MOQ Discount
                            </Badge>
                          )}
                          {pricing.mode === 'normal' && (
                            <Badge variant="outline" className="text-xs">
                              Regular Price
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">${pricing.finalPrice.toFixed(2)} each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${(pricing.finalPrice * item.quantity).toFixed(2)}</p>
                        {item.basePrice !== pricing.finalPrice && (
                          <p className="text-sm text-gray-500 line-through">
                            ${(item.basePrice * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>${totals.deliveryCharge.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo Discount ({appliedPromo.discount_percentage}%)</span>
                    <span>-${totals.promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span>${totals.finalTotal.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Minimum payment: ${totals.minimumPayment.toFixed(2)} (20%)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Delivery Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{checkoutInfo.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{checkoutInfo.customerEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{checkoutInfo.contactNumber}</span>
              </div>
              {checkoutInfo.whatsappNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>WhatsApp: {checkoutInfo.whatsappNumber}</span>
                </div>
              )}
              <Separator />
              <div>
                <p className="font-medium">{deliveryLocation}</p>
                <p className="text-sm text-gray-600">{checkoutInfo.deliveryAddress}</p>
                <p className="text-sm font-medium text-green-600 mt-1">
                  Delivery Charge: ${deliveryCharge.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

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
                  onChange={(e) => {
                    setPaymentData({ ...paymentData, promoCode: e.target.value });
                    updateActivity();
                  }}
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
                onValueChange={(value) => {
                  setPaymentData({ ...paymentData, paymentMethodId: value });
                  updateActivity();
                }}
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

            {/* Payment Amount Options */}
            <div>
              <Label>Payment Amount *</Label>
              <RadioGroup
                value={paymentData.paymentType}
                onValueChange={handlePaymentTypeChange}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full">Pay Full Amount (${totals.finalTotal.toFixed(2)})</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial">Pay Custom Amount (Min: ${totals.minimumPayment.toFixed(2)})</Label>
                </div>
              </RadioGroup>

              {paymentData.paymentType === 'partial' && (
                <div className="mt-3">
                  <Input
                    type="number"
                    step="0.01"
                    min={totals.minimumPayment}
                    max={totals.finalTotal}
                    value={paymentData.paidAmount}
                    onChange={(e) => {
                      setPaymentData({ ...paymentData, paidAmount: e.target.value });
                      updateActivity();
                    }}
                    placeholder={`Enter amount (Min: $${totals.minimumPayment.toFixed(2)})`}
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Range: ${totals.minimumPayment.toFixed(2)} - ${totals.finalTotal.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Screenshot */}
            <div>
              <Label htmlFor="screenshot">Payment Screenshot *</Label>
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPaymentData({
                    ...paymentData,
                    paymentScreenshot: file
                  });
                  updateActivity();
                }}
                required
              />
            </div>

            {/* Payment Notes */}
            <div>
              <Label htmlFor="notes">Payment Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentData.paymentNotes}
                onChange={(e) => {
                  setPaymentData({ ...paymentData, paymentNotes: e.target.value });
                  updateActivity();
                }}
                placeholder="Any additional notes about your payment..."
                rows={3}
              />
            </div>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600">{uploadProgress}% uploaded</p>
              </div>
            )}

            <Button 
              onClick={placeOrder} 
              disabled={isLoading || isValidating || !stockValidated} 
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
