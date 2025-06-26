
import { useState, useEffect } from 'react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Percent } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

interface FormErrors {
  [key: string]: string;
}

export function UniversalCheckout() {
  const { cartItems, getTotalPrice, clearCart, getItemPricing } = useRobustCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    contact: '',
    whatsapp: '',
    address: ''
  });
  
  // Checkout data
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  
  // Promocode state
  const [promocode, setPromocode] = useState('');
  const [promocodeDiscount, setPromocodeDiscount] = useState(0);
  const [validatingPromocode, setValidatingPromocode] = useState(false);
  const [promocodeApplied, setPromocodeApplied] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
      return;
    }
    
    fetchCheckoutData();
    
    // Auto-fill user info if logged in
    if (user && userProfile) {
      setCustomerInfo(prev => ({
        ...prev,
        name: userProfile.full_name || '',
        email: userProfile.email || user.email || '',
        contact: userProfile.contact_number || '',
        whatsapp: userProfile.whatsapp_number || ''
      }));
    }
  }, [cartItems, user, userProfile, navigate]);

  const fetchCheckoutData = async () => {
    setLoading(true);
    try {
      console.log('Fetching checkout data...');
      
      const [deliveryRes, paymentRes] = await Promise.all([
        supabase
          .from('delivery_charges')
          .select('*')
          .eq('is_active', true)
          .order('place_name'),
        supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ]);

      if (deliveryRes.error) {
        console.error('Error fetching delivery charges:', deliveryRes.error);
        toast({
          title: "Error",
          description: "Failed to load delivery options",
          variant: "destructive",
        });
      } else {
        setDeliveryCharges(deliveryRes.data || []);
      }

      if (paymentRes.error) {
        console.error('Error fetching payment methods:', paymentRes.error);
        toast({
          title: "Error",
          description: "Failed to load payment methods",
          variant: "destructive",
        });
      } else {
        setPaymentMethods(paymentRes.data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching checkout data:', error);
      toast({
        title: "Error",
        description: "Failed to load checkout data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePromocode = async () => {
    if (!promocode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a promocode",
        variant: "destructive",
      });
      return;
    }

    setValidatingPromocode(true);
    try {
      const { data: promo, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', promocode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        toast({
          title: "Invalid Promocode",
          description: "The promocode you entered is invalid or expired",
          variant: "destructive",
        });
        return;
      }

      // Check if promo code is still valid
      const now = new Date();
      const validFrom = new Date(promo.valid_from);
      const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;

      if (now < validFrom) {
        toast({
          title: "Promocode Not Active",
          description: "This promocode is not yet active",
          variant: "destructive",
        });
        return;
      }

      if (validUntil && now > validUntil) {
        toast({
          title: "Promocode Expired",
          description: "This promocode has expired",
          variant: "destructive",
        });
        return;
      }

      const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
      const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
      const subtotal = getTotalPrice();
      const beforeDiscountTotal = subtotal + deliveryPrice;

      // Check minimum order amount
      if (promo.minimum_order_amount && beforeDiscountTotal < promo.minimum_order_amount) {
        toast({
          title: "Minimum Order Not Met",
          description: `Minimum order amount for this promocode is Rs. ${promo.minimum_order_amount}`,
          variant: "destructive",
        });
        return;
      }

      const discount = (beforeDiscountTotal * promo.discount_percentage) / 100;
      setPromocodeDiscount(discount);
      setPromocodeApplied(true);
      
      toast({
        title: "Promocode Applied!",
        description: `${promo.discount_percentage}% discount applied - You saved Rs. ${discount.toFixed(2)}`,
      });

    } catch (error) {
      console.error('Error validating promocode:', error);
      toast({
        title: "Error",
        description: "Failed to validate promocode",
        variant: "destructive",
      });
    } finally {
      setValidatingPromocode(false);
    }
  };

  const removePromocode = () => {
    setPromocodeDiscount(0);
    setPromocodeApplied(false);
    setPromocode('');
    toast({
      title: "Promocode Removed",
      description: "Promocode has been removed from your order",
    });
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Required field validation
    if (!customerInfo.name.trim()) errors.name = 'Name is required';
    if (!customerInfo.email.trim()) errors.email = 'Email is required';
    if (!customerInfo.contact.trim()) errors.contact = 'Contact number is required';
    if (!customerInfo.address.trim()) errors.address = 'Delivery address is required';
    if (!selectedDelivery) errors.delivery = 'Please select delivery location';
    if (!selectedPayment) errors.payment = 'Please select payment method';

    // Email validation
    if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadPaymentScreenshot = async (): Promise<string | null> => {
    if (!paymentScreenshot) return null;

    setUploadingScreenshot(true);
    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `payment-${Date.now()}.${fileExt}`;
      const filePath = `payment-screenshots/${fileName}`;

      console.log('Uploading payment screenshot:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, paymentScreenshot, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading payment screenshot:', uploadError);
        throw new Error('Failed to upload payment screenshot');
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      console.log('Payment screenshot uploaded successfully:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading payment screenshot:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload payment screenshot. You can continue without it.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log('Starting order submission process...');
      console.log('User authenticated:', !!user);
      console.log('User ID:', user?.id);

      const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
      const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
      const subtotal = getTotalPrice();
      const beforeDiscountTotal = subtotal + deliveryPrice;
      const totalAmount = beforeDiscountTotal - promocodeDiscount;

      // Upload payment screenshot if provided
      let paymentScreenshotUrl = null;
      if (paymentScreenshot) {
        paymentScreenshotUrl = await uploadPaymentScreenshot();
      }

      // Create pricing breakdown
      const pricingBreakdown = {
        subtotal: subtotal,
        delivery_charge: deliveryPrice,
        promocode_discount: promocodeDiscount,
        promocode_used: promocodeApplied ? promocode.toUpperCase() : null,
        total_before_discount: beforeDiscountTotal,
        final_total: totalAmount,
        items: cartItems.map(item => {
          const pricing = getItemPricing(item);
          return {
            product_name: item.productName,
            color_name: item.colorName || null,
            size_name: item.sizeName || null,
            quantity: item.quantity,
            unit_price: pricing.finalPrice,
            total_price: pricing.finalPrice * item.quantity,
            pricing_mode: pricing.mode,
            pricing_description: pricing.description
          };
        })
      };

      // Prepare order data
      const orderData = {
        user_id: user?.id || null,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        contact_number: customerInfo.contact,
        whatsapp_number: customerInfo.whatsapp || customerInfo.contact,
        delivery_location_id: selectedDelivery,
        delivery_address: customerInfo.address,
        delivery_charge: deliveryPrice,
        subtotal: subtotal,
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        payment_method_id: selectedPayment,
        payment_notes: paymentNotes || null,
        payment_screenshot_url: paymentScreenshotUrl,
        status: 'pending_payment',
        combo_applied: false,
        promocode_used: promocodeApplied ? promocode.toUpperCase() : null,
        promocode_discount: promocodeDiscount,
        pricing_breakdown: pricingBreakdown
      };

      console.log('Creating order with data:', orderData);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error(`Order creation failed: ${orderError.message}`);
      }

      console.log('Order created successfully:', order);

      // Create order items for inventory management
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        color_variant_id: item.colorVariantId,
        size_variant_id: item.sizeVariantId,
        quantity: item.quantity
      }));

      console.log('Creating order items:', orderItems.length);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        // Try to cleanup the order if items creation fails
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      // Create order item details for pricing and display
      const orderItemDetails = cartItems.map(item => {
        const pricing = getItemPricing(item);
        return {
          order_id: order.id,
          product_name: item.productName,
          color_name: item.colorName || null,
          size_name: item.sizeName || null,
          quantity: item.quantity,
          unit_price: pricing.finalPrice,
          total_price: pricing.finalPrice * item.quantity,
          pricing_mode: pricing.mode,
          pricing_details: {
            description: pricing.description,
            base_price: item.basePrice,
            final_price: pricing.finalPrice,
            discount_applied: pricing.finalPrice < item.basePrice,
            breakdown: pricing.breakdown || []
          }
        };
      });

      console.log('Creating order item details:', orderItemDetails.length);

      const { error: detailsError } = await supabase
        .from('order_item_details')
        .insert(orderItemDetails);

      if (detailsError) {
        console.error('Order item details creation error:', detailsError);
        // Try to cleanup if details creation fails
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Failed to create order item details: ${detailsError.message}`);
      }

      console.log('Order completed successfully');

      // Clear cart and redirect to order summary
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${order.order_number} has been placed successfully.`,
      });

      // Redirect to order summary page with order ID
      navigate(`/order-summary/${order.id}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
  const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
  const subtotal = getTotalPrice();
  const beforeDiscountTotal = subtotal + deliveryPrice;
  const totalAmount = beforeDiscountTotal - promocodeDiscount;
  const selectedPaymentMethod = paymentMethods.find(p => p.id === selectedPayment);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading checkout...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        {/* Show user status */}
        {user ? (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Logged in as <strong>{userProfile?.full_name || user.email}</strong>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're checking out as a guest. <strong>Your order will be processed normally.</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Customer Info & Delivery */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>Please provide your contact details for order delivery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    className={formErrors.email ? 'border-red-500' : ''}
                  />
                  {formErrors.email && <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <Label>Contact Number *</Label>
                  <Input
                    value={customerInfo.contact}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="Enter your contact number"
                    className={formErrors.contact ? 'border-red-500' : ''}
                  />
                  {formErrors.contact && <p className="text-sm text-red-500 mt-1">{formErrors.contact}</p>}
                </div>
                <div>
                  <Label>WhatsApp Number</Label>
                  <Input
                    value={customerInfo.whatsapp}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="Enter WhatsApp number (optional)"
                  />
                </div>
                <div>
                  <Label>Delivery Address *</Label>
                  <Textarea
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter complete delivery address"
                    rows={3}
                    className={formErrors.address ? 'border-red-500' : ''}
                  />
                  {formErrors.address && <p className="text-sm text-red-500 mt-1">{formErrors.address}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Location */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Location</CardTitle>
                <CardDescription>Select your delivery area to calculate shipping costs</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
                  <SelectTrigger className={formErrors.delivery ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select delivery location" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryCharges.map((delivery) => (
                      <SelectItem key={delivery.id} value={delivery.id}>
                        {delivery.place_name} - Rs. {delivery.delivery_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.delivery && <p className="text-sm text-red-500 mt-1">{formErrors.delivery}</p>}
              </CardContent>
            </Card>

            {/* Promocode */}
            <Card>
              <CardHeader>
                <CardTitle>Promocode</CardTitle>
                <CardDescription>Apply a promocode to get discount on your order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!promocodeApplied ? (
                  <div className="flex gap-2">
                    <Input
                      value={promocode}
                      onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                      placeholder="Enter promocode"
                      disabled={validatingPromocode}
                    />
                    <Button 
                      onClick={validatePromocode}
                      disabled={validatingPromocode || !promocode.trim()}
                    >
                      {validatingPromocode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Percent className="h-4 w-4 mr-2" />
                          Apply
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Promocode Applied: {promocode}</p>
                        <p className="text-sm text-green-600">You saved Rs. {promocodeDiscount.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={removePromocode}>
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Choose your preferred payment method and upload payment proof</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                  <SelectTrigger className={formErrors.payment ? 'border-red-500' : ''}>
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
                {formErrors.payment && <p className="text-sm text-red-500 mt-1">{formErrors.payment}</p>}

                {selectedPaymentMethod && (
                  <div className="text-center">
                    <img 
                      src={selectedPaymentMethod.qr_code_url} 
                      alt={`${selectedPaymentMethod.name} QR Code`}
                      className="mx-auto max-w-48 h-48 object-contain border rounded"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Scan this QR code to make payment of <strong>Rs. {totalAmount.toFixed(2)}</strong>
                    </p>
                  </div>
                )}

                <div>
                  <Label>Payment Screenshot</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                    disabled={uploadingScreenshot}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload screenshot of your payment (optional but recommended)
                  </p>
                  {uploadingScreenshot && (
                    <div className="flex items-center mt-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading screenshot...
                    </div>
                  )}
                </div>

                <div>
                  <Label>Payment Notes</Label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Any additional notes about payment (optional)"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Review your order before placing it</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => {
                  const pricing = getItemPricing(item);
                  return (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <h4 className="font-medium">{item.productName}</h4>
                        {item.colorName && <p className="text-sm text-gray-600">Color: {item.colorName}</p>}
                        {item.sizeName && <p className="text-sm text-gray-600">Size: {item.sizeName}</p>}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        {pricing.mode !== 'normal' && (
                          <p className="text-xs text-green-600">{pricing.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</p>
                        {pricing.finalPrice < item.basePrice && (
                          <p className="text-xs text-gray-500 line-through">Rs. {(item.basePrice * item.quantity).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>Rs. {deliveryPrice.toFixed(2)}</span>
                  </div>
                  {promocodeDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({promocode}):</span>
                      <span>-Rs. {promocodeDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>Rs. {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitOrder} 
                  disabled={submitting || uploadingScreenshot}
                  className="w-full mt-6"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Placing Order...
                    </>
                  ) : (
                    `Place Order - Rs. ${totalAmount.toFixed(2)}`
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-2">
                  By placing this order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
