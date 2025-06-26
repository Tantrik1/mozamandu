import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Upload, CreditCard, Truck, ShoppingCart, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface DeliveryLocation {
  id: string;
  place_name: string;
  delivery_price: number;
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

export function UniversalCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, getTotalPrice, clearCart } = useRobustCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    contactNumber: '',
    whatsappNumber: '',
    deliveryAddress: '',
    deliveryLocationId: '',
    paymentMethodId: '',
    paymentNotes: '',
    promocode: ''
  });

  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
  const [selectedPromocode, setSelectedPromocode] = useState<PromoCode | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customerName: user.user_metadata?.full_name || '',
        customerEmail: user.email || ''
      }));
    }
    fetchDeliveryLocations();
    fetchPaymentMethods();
    fetchPromocodes();
  }, [user]);

  const fetchDeliveryLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('*')
        .eq('is_active', true)
        .order('place_name');

      if (error) throw error;
      setDeliveryLocations(data || []);
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery locations",
        variant: "destructive",
      });
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    }
  };

  const fetchPromocodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setPromocodes(data || []);
    } catch (error) {
      console.error('Error fetching promocodes:', error);
    }
  };

  const handlePromocodeApply = () => {
    const promo = promocodes.find(p => p.code.toLowerCase() === formData.promocode.toLowerCase());
    
    if (!promo) {
      toast({
        title: "Invalid Promocode",
        description: "The promocode you entered is not valid.",
        variant: "destructive",
      });
      return;
    }

    const subtotalWithDelivery = getTotalPrice() + getDeliveryCharge();
    if (subtotalWithDelivery < promo.minimum_order_amount) {
      toast({
        title: "Minimum Order Not Met",
        description: `This promocode requires a minimum order of Rs. ${promo.minimum_order_amount}`,
        variant: "destructive",
      });
      return;
    }

    setSelectedPromocode(promo);
    toast({
      title: "Promocode Applied",
      description: `${promo.discount_percentage}% discount applied!`,
    });
  };

  const getDeliveryCharge = () => {
    const location = deliveryLocations.find(loc => loc.id === formData.deliveryLocationId);
    return location ? Number(location.delivery_price) : 0;
  };

  const getPromocodeDiscount = () => {
    if (!selectedPromocode) return 0;
    const subtotal = getTotalPrice() + getDeliveryCharge();
    return (subtotal * selectedPromocode.discount_percentage) / 100;
  };

  const getFinalTotal = () => {
    return getTotalPrice() + getDeliveryCharge() - getPromocodeDiscount();
  };

  const uploadPaymentScreenshot = async (file: File): Promise<string | null> => {
    try {
      const fileName = `payment_${Date.now()}_${file.name}`;
      
      console.log('Uploading payment screenshot:', fileName);
      
      const { data, error } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);
      
      const { data: urlData } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading payment screenshot:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload payment screenshot. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.customerName.trim()) errors.push('Customer name is required');
    if (!formData.customerEmail.trim()) errors.push('Email is required');
    if (!formData.contactNumber.trim()) errors.push('Contact number is required');
    if (!formData.deliveryAddress.trim()) errors.push('Delivery address is required');
    if (!formData.deliveryLocationId) errors.push('Delivery location is required');
    if (!formData.paymentMethodId) errors.push('Payment method is required');
    if (cartItems.length === 0) errors.push('Cart is empty');

    if (errors.length > 0) {
      toast({
        title: "Form Validation Error",
        description: errors.join(', '),
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      console.log('Starting order creation process...');
      
      // Upload payment screenshot if provided
      let paymentScreenshotUrl = null;
      if (paymentScreenshot) {
        console.log('Uploading payment screenshot...');
        paymentScreenshotUrl = await uploadPaymentScreenshot(paymentScreenshot);
        if (!paymentScreenshotUrl) {
          setIsSubmitting(false);
          return;
        }
      }

      // Calculate totals
      const subtotal = getTotalPrice();
      const deliveryCharge = getDeliveryCharge();
      const promocodeDiscount = getPromocodeDiscount();
      const totalAmount = getFinalTotal();

      // Create pricing breakdown
      const pricingBreakdown = {
        subtotal,
        delivery_charge: deliveryCharge,
        promocode_discount: promocodeDiscount,
        promocode_used: selectedPromocode?.code || null,
        total_before_discount: subtotal + deliveryCharge,
        final_total: totalAmount,
        items: cartItems.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          pricing_mode: item.pricing_mode || 'normal',
          pricing_details: item.pricing_details || null
        }))
      };

      // Create order
      const orderData = {
        user_id: user?.id || null,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        contact_number: formData.contactNumber,
        whatsapp_number: formData.whatsappNumber || formData.contactNumber,
        delivery_address: formData.deliveryAddress,
        delivery_location_id: formData.deliveryLocationId,
        delivery_charge: deliveryCharge,
        subtotal,
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        status: 'pending_payment',
        payment_method_id: formData.paymentMethodId,
        payment_notes: formData.paymentNotes,
        payment_screenshot_url: paymentScreenshotUrl,
        combo_applied: false,
        promocode_used: selectedPromocode?.code || null,
        promocode_discount: promocodeDiscount,
        pricing_breakdown: pricingBreakdown
      };

      console.log('Creating order with data:', orderData);

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }

      console.log('Order created successfully:', orderResult);

      // Create order items (for inventory tracking)
      const orderItemsData = cartItems.map(item => ({
        order_id: orderResult.id,
        product_id: item.product_id,
        color_variant_id: item.color_variant_id || null,
        size_variant_id: item.size_variant_id || null,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        throw itemsError;
      }

      // Create order item details (for display)
      const orderItemDetailsData = cartItems.map(item => ({
        order_id: orderResult.id,
        product_name: item.product_name,
        color_name: item.color_name || null,
        size_name: item.size_name || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        pricing_mode: item.pricing_mode || 'normal',
        pricing_details: item.pricing_details || null
      }));

      const { error: detailsError } = await supabase
        .from('order_item_details')
        .insert(orderItemDetailsData);

      if (detailsError) {
        console.error('Order item details creation error:', detailsError);
        throw detailsError;
      }

      console.log('Order creation completed successfully');

      // Clear cart and redirect
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order ${orderResult.order_number} has been placed.`,
      });

      navigate(`/order-summary/${orderResult.id}`);

    } catch (error) {
      console.error('Order creation failed:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentMethodChange = (methodId: string) => {
    setFormData(prev => ({ ...prev, paymentMethodId: methodId }));
    const method = paymentMethods.find(m => m.id === methodId);
    setSelectedPaymentMethod(method || null);
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-4">Add some items to your cart before checkout.</p>
            <Button onClick={() => navigate('/')}>Continue Shopping</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Checkout Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <Input
                      id="whatsappNumber"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      placeholder="Same as contact if empty"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                  <Textarea
                    id="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Delivery Location *</Label>
                  <Select
                    value={formData.deliveryLocationId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, deliveryLocationId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery location" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.place_name} - Rs. {Number(location.delivery_price).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Payment Method *</Label>
                  <Select
                    value={formData.paymentMethodId}
                    onValueChange={handlePaymentMethodChange}
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

                {selectedPaymentMethod && (
                  <div className="text-center">
                    <img
                      src={selectedPaymentMethod.qr_code_url}
                      alt={`${selectedPaymentMethod.name} QR Code`}
                      className="mx-auto max-w-48 border rounded-lg"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Scan this QR code to pay via {selectedPaymentMethod.name}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="paymentScreenshot">Payment Screenshot</Label>
                  <Input
                    id="paymentScreenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                  />
                </div>

                <div>
                  <Label htmlFor="paymentNotes">Payment Notes</Label>
                  <Textarea
                    id="paymentNotes"
                    value={formData.paymentNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentNotes: e.target.value }))}
                    placeholder="Any additional notes about payment..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Promocode */}
            <Card>
              <CardHeader>
                <CardTitle>Promocode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promocode"
                    value={formData.promocode}
                    onChange={(e) => setFormData(prev => ({ ...prev, promocode: e.target.value }))}
                  />
                  <Button type="button" variant="outline" onClick={handlePromocodeApply}>
                    Apply
                  </Button>
                </div>
                {selectedPromocode && (
                  <div className="mt-2">
                    <Badge className="bg-green-100 text-green-800">
                      {selectedPromocode.discount_percentage}% discount applied
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : `Place Order - Rs. ${getFinalTotal().toFixed(2)}`}
            </Button>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={`${item.product_id}-${item.color_variant_id || 'no-color'}-${item.size_variant_id || 'no-size'}`} 
                       className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.color_name && <p className="text-sm text-gray-600">Color: {item.color_name}</p>}
                      {item.size_name && <p className="text-sm text-gray-600">Size: {item.size_name}</p>}
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">Rs. {Number(item.total_price).toFixed(2)}</p>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {getTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>Rs. {getDeliveryCharge().toFixed(2)}</span>
                  </div>
                  {selectedPromocode && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({selectedPromocode.code}):</span>
                      <span>-Rs. {getPromocodeDiscount().toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>Rs. {getFinalTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
