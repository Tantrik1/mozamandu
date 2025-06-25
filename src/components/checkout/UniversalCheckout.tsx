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
import { ArrowLeft } from 'lucide-react';

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

export function UniversalCheckout() {
  const { cartItems, getTotalPrice, clearCart, getItemPricing } = useRobustCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    contact: '',
    whatsapp: '',
    address: ''
  });
  
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
      return;
    }
    
    fetchDeliveryCharges();
    fetchPaymentMethods();
    
    // Pre-fill user info if logged in
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

  const fetchDeliveryCharges = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('*')
        .eq('is_active', true)
        .order('place_name');

      if (error) throw error;
      setDeliveryCharges(data || []);
    } catch (error) {
      console.error('Error fetching delivery charges:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const uploadPaymentScreenshot = async (): Promise<string | null> => {
    if (!paymentScreenshot) return null;

    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `payment-${Date.now()}.${fileExt}`;
      const filePath = `payment-screenshots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, paymentScreenshot);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading payment screenshot:', error);
      return null;
    }
  };

  const handleSubmitOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.contact || !customerInfo.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required customer information",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDelivery) {
      toast({
        title: "Missing Delivery Location",
        description: "Please select a delivery location",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPayment) {
      toast({
        title: "Missing Payment Method",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
      const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
      const subtotal = getTotalPrice();
      const totalAmount = subtotal + deliveryPrice;

      // Upload payment screenshot if provided
      let paymentScreenshotUrl = null;
      if (paymentScreenshot) {
        paymentScreenshotUrl = await uploadPaymentScreenshot();
      }

      console.log('Creating order with user_id:', user?.id);

      // Create order with proper user context - define the base order data first
      const baseOrderData = {
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
        status: 'pending'
      };

      // Add user_id conditionally to avoid RLS issues
      const orderData = user?.id 
        ? { ...baseOrderData, user_id: user.id }
        : baseOrderData;

      console.log('Creating order with data:', orderData);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        
        // Provide more specific error messages
        if (orderError.code === '42501') {
          throw new Error('Permission denied. Please try logging out and back in, or contact support.');
        } else if (orderError.code === '23505') {
          throw new Error('Duplicate order detected. Please try again.');
        } else {
          throw new Error(`Order creation failed: ${orderError.message}`);
        }
      }

      console.log('Order created successfully:', order);

      // Create order items with proper pricing
      const orderItems = cartItems.map(item => {
        const pricing = getItemPricing(item);
        return {
          order_id: order.id,
          product_id: item.productId,
          color_variant_id: item.colorVariantId,
          size_variant_id: item.sizeVariantId,
          product_name: item.productName,
          color_name: item.colorName || '',
          size_name: item.sizeName || '',
          quantity: item.quantity,
          unit_price: pricing.finalPrice,
          total_price: pricing.finalPrice * item.quantity,
          pricing_mode: pricing.mode
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      console.log('Order items created successfully');

      // Clear cart and redirect
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${order.order_number} has been placed.`,
      });

      // Redirect based on user type
      if (user && userProfile?.role === 'admin') {
        navigate('/admin/orders');
      } else if (user && userProfile?.role === 'customer') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
  const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
  const subtotal = getTotalPrice();
  const totalAmount = subtotal + deliveryPrice;
  const selectedPaymentMethod = paymentMethods.find(p => p.id === selectedPayment);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Customer Info & Delivery */}
          <div className="space-y-6">
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
                    required
                  />
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div>
                  <Label>Contact Number *</Label>
                  <Input
                    value={customerInfo.contact}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="Enter your contact number"
                    required
                  />
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
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Location</CardTitle>
                <CardDescription>Select your delivery area to calculate shipping costs</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
                  <SelectTrigger>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Choose your preferred payment method and upload payment proof</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedPayment} onValueChange={setSelectedPayment}>
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

                {selectedPaymentMethod && (
                  <div className="text-center">
                    <img 
                      src={selectedPaymentMethod.qr_code_url} 
                      alt={`${selectedPaymentMethod.name} QR Code`}
                      className="mx-auto max-w-48 h-48 object-contain border rounded"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Scan this QR code to make payment
                    </p>
                  </div>
                )}

                <div>
                  <Label>Payment Screenshot</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload screenshot of your payment (optional)
                  </p>
                </div>

                <div>
                  <Label>Payment Notes</Label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Any additional notes about payment"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card>
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
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</p>
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
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>Rs. {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitOrder} 
                  disabled={loading}
                  className="w-full mt-6"
                  size="lg"
                >
                  {loading ? 'Placing Order...' : `Place Order - Rs. ${totalAmount.toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
