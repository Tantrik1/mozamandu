
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { toast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
}

interface CheckoutFormData {
  customerName: string;
  customerEmail: string;
  contactNumber: string;
  whatsappNumber: string;
  deliveryAddress: string;
  deliveryLocationId: string;
  paymentMethodId: string;
  paymentNotes: string;
  paidAmount: number;
}

export function EnhancedCheckoutFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, getTotalPrice, clearCart } = useCart();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string>('');
  
  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: '',
    customerEmail: user?.email || '',
    contactNumber: '',
    whatsappNumber: '',
    deliveryAddress: '',
    deliveryLocationId: '',
    paymentMethodId: '',
    paymentNotes: '',
    paidAmount: 0
  });

  const subtotal = getTotalPrice();
  const selectedDelivery = deliveryCharges.find(d => d.id === formData.deliveryLocationId);
  const deliveryCharge = selectedDelivery?.delivery_price || 0;
  const totalAmount = subtotal + deliveryCharge;
  const remainingAmount = Math.max(0, totalAmount - formData.paidAmount);

  useEffect(() => {
    fetchCheckoutData();
  }, []);

  useEffect(() => {
    // Auto-fill user data if logged in
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchCheckoutData = async () => {
    setLoading(true);
    try {
      console.log('Fetching checkout data...');
      
      const [paymentMethodsRes, deliveryChargesRes] = await Promise.all([
        supabase.from('payment_methods').select('*').eq('is_active', true),
        supabase.from('delivery_charges').select('*').eq('is_active', true)
      ]);

      if (paymentMethodsRes.error) {
        console.error('Error fetching payment methods:', paymentMethodsRes.error);
        toast({
          title: "Error",
          description: "Failed to load payment methods",
          variant: "destructive",
        });
      } else {
        console.log('Loaded payment methods:', paymentMethodsRes.data?.length);
        setPaymentMethods(paymentMethodsRes.data || []);
      }

      if (deliveryChargesRes.error) {
        console.error('Error fetching delivery charges:', deliveryChargesRes.error);
        toast({
          title: "Error",
          description: "Failed to load delivery options",
          variant: "destructive",
        });
      } else {
        console.log('Loaded delivery charges:', deliveryChargesRes.data?.length);
        setDeliveryCharges(deliveryChargesRes.data || []);
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

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching user profile for checkout...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else if (data) {
        console.log('Auto-filling user data');
        setFormData(prev => ({
          ...prev,
          customerName: data.full_name || '',
          customerEmail: data.email || user.email || '',
          contactNumber: data.contact_number || '',
          whatsappNumber: data.whatsapp_number || ''
        }));
      }
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
    }
  };

  const uploadPaymentScreenshot = async (file: File): Promise<string> => {
    setUploadingScreenshot(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-screenshots/${Date.now()}.${fileExt}`;

      console.log('Uploading payment screenshot:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading payment screenshot:', uploadError);
        throw new Error('Failed to upload payment screenshot');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      console.log('Payment screenshot uploaded:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading payment screenshot:', error);
      throw error;
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'customerName',
      'customerEmail',
      'contactNumber',
      'deliveryAddress',
      'deliveryLocationId',
      'paymentMethodId'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof CheckoutFormData]) {
        toast({
          title: "Validation Error",
          description: `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          variant: "destructive",
        });
        return false;
      }
    }

    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Add some items before checkout.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.paidAmount < 0) {
      toast({
        title: "Invalid Payment",
        description: "Paid amount cannot be negative",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const submitOrder = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      console.log('Submitting order...', { formData, cartItems, totalAmount });

      // Upload payment screenshot if provided
      let screenshotUrl = paymentScreenshotUrl;
      if (paymentScreenshot && !paymentScreenshotUrl) {
        screenshotUrl = await uploadPaymentScreenshot(paymentScreenshot);
        setPaymentScreenshotUrl(screenshotUrl);
      }

      // Create order
      const orderData = {
        user_id: user?.id || null, // Allow null for guest orders
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        contact_number: formData.contactNumber,
        whatsapp_number: formData.whatsappNumber || null,
        delivery_address: formData.deliveryAddress,
        delivery_location_id: formData.deliveryLocationId,
        delivery_charge: deliveryCharge,
        subtotal: subtotal,
        total_amount: totalAmount,
        paid_amount: formData.paidAmount,
        remaining_amount: remainingAmount,
        payment_method_id: formData.paymentMethodId,
        payment_screenshot_url: screenshotUrl || null,
        payment_notes: formData.paymentNotes || null,
        status: 'pending'
      };

      console.log('Creating order with data:', orderData);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error('Failed to create order: ' + orderError.message);
      }

      console.log('Order created successfully:', order);

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        color_variant_id: item.colorVariantId,
        size_variant_id: item.sizeVariantId,
        product_name: item.productName,
        color_name: item.colorName,
        size_name: item.sizeName,
        quantity: item.quantity,
        unit_price: item.basePrice,
        total_price: item.basePrice * item.quantity,
        pricing_mode: 'normal'
      }));

      console.log('Creating order items:', orderItems.length);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Try to cleanup the order if items creation fails
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error('Failed to create order items: ' + itemsError.message);
      }

      console.log('Order items created successfully');

      // Clear cart and redirect
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${order.order_number} has been placed successfully.`,
      });

      // Redirect to success page or orders page
      navigate('/customer-dashboard?tab=orders');
      
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentScreenshot(file);
      console.log('Payment screenshot selected:', file.name);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading checkout...
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-4">Add some items to your cart before checkout.</p>
            <Button onClick={() => navigate('/categories')}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Form */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Enter your full name"
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
                    placeholder="Enter your email"
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
                    placeholder="Enter your contact number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                    placeholder="Enter your WhatsApp number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="Enter your complete delivery address"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="deliveryLocation">Delivery Location *</Label>
                <Select 
                  value={formData.deliveryLocationId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, deliveryLocationId: value }))}
                >
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
                <RadioGroup 
                  value={formData.paymentMethodId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethodId: value }))}
                  className="mt-2"
                >
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{method.name}</span>
                          <img
                            src={method.qr_code_url}
                            alt={`${method.name} QR Code`}
                            className="w-16 h-16 object-contain"
                          />
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="paidAmount">Amount Paid</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter amount you paid"
                />
              </div>

              <div>
                <Label htmlFor="paymentScreenshot">Payment Screenshot</Label>
                <Input
                  id="paymentScreenshot"
                  type="file"
                  accept="image/*"
                  onChange={handlePaymentScreenshotChange}
                  disabled={uploadingScreenshot}
                />
                {uploadingScreenshot && (
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Uploading screenshot...
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="paymentNotes">Payment Notes</Label>
                <Textarea
                  id="paymentNotes"
                  value={formData.paymentNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentNotes: e.target.value }))}
                  placeholder="Any additional notes about payment"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      {item.colorName && <p className="text-sm text-gray-600">Color: {item.colorName}</p>}
                      {item.sizeName && <p className="text-sm text-gray-600">Size: {item.sizeName}</p>}
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {(item.basePrice * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>Rs. {deliveryCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                {formData.paidAmount > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>Rs. {formData.paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Remaining:</span>
                      <span>Rs. {remainingAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <Button 
                onClick={submitOrder} 
                className="w-full" 
                size="lg"
                disabled={submitting || uploadingScreenshot}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Place Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
