import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { toast } from '@/hooks/use-toast';
import { Upload, CheckCircle } from 'lucide-react';

interface PaymentInformationProps {
  deliveryData: any;
  user: any;
  isGuest: boolean;
  onPrevious: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

interface Promocode {
  id: string;
  code: string;
  discount_percentage: number;
  minimum_order_amount: number;
  maximum_discount_amount?: number;
}

export function PaymentInformation({ deliveryData, user, isGuest, onPrevious }: PaymentInformationProps) {
  const navigate = useNavigate();
  const { cartItems, getItemPricing, getTotalPrice, clearCart } = useRobustCart();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [promocode, setPromocode] = useState('');
  const [appliedPromocode, setAppliedPromocode] = useState<Promocode | null>(null);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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
      toast({
        title: 'Error',
        description: 'Failed to load payment methods',
        variant: 'destructive'
      });
    }
  };

  const handleApplyPromocode = async () => {
    if (!promocode.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', promocode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error) throw new Error('Invalid promocode');

      const currentTotal = getTotalPrice() + (deliveryData.deliveryCharge || 0);
      
      if (currentTotal < data.minimum_order_amount) {
        throw new Error(`Minimum order amount is Rs. ${data.minimum_order_amount}`);
      }

      if (data.valid_until && new Date() > new Date(data.valid_until)) {
        throw new Error('Promocode has expired');
      }

      setAppliedPromocode(data);
      toast({
        title: 'Success',
        description: `Promocode applied! ${data.discount_percentage}% discount`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Invalid promocode',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePromocode = () => {
    setAppliedPromocode(null);
    setPromocode('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 5MB',
          variant: 'destructive'
        });
        return;
      }
      setPaymentScreenshot(file);
    }
  };

  const calculateTotals = () => {
    const subtotal = getTotalPrice();
    const deliveryCharge = deliveryData.deliveryCharge || 0;
    let promocodeDiscount = 0;

    if (appliedPromocode) {
      const discountAmount = (subtotal * appliedPromocode.discount_percentage) / 100;
      promocodeDiscount = appliedPromocode.maximum_discount_amount 
        ? Math.min(discountAmount, appliedPromocode.maximum_discount_amount)
        : discountAmount;
    }

    const total = subtotal + deliveryCharge - promocodeDiscount;

    return {
      subtotal,
      deliveryCharge,
      promocodeDiscount,
      total: Math.max(0, total)
    };
  };

  const uploadPaymentScreenshot = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `paymentscreenshots/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethod) {
      toast({
        title: 'Error',
        description: 'Please select a payment method',
        variant: 'destructive'
      });
      return;
    }

    if (!paymentScreenshot) {
      toast({
        title: 'Error',
        description: 'Please upload payment screenshot',
        variant: 'destructive'
      });
      return;
    }

    setPlacing(true);
    try {
      // Upload payment screenshot
      const screenshotUrl = await uploadPaymentScreenshot(paymentScreenshot);
      
      const totals = calculateTotals();
      
      // Create pricing breakdown for storage
      const pricingBreakdown = cartItems.map(item => {
        const pricing = getItemPricing(item);
        return {
          productName: item.productName,
          colorName: item.colorName,
          sizeName: item.sizeName,
          quantity: item.quantity,
          unitPrice: pricing.finalPrice,
          totalPrice: pricing.finalPrice * item.quantity,
          pricingMode: pricing.mode,
          description: pricing.description,
          breakdown: pricing.breakdown
        };
      });

      // Create order
      const orderData = {
        user_id: user?.id || null,
        customer_name: deliveryData.customerName,
        customer_email: deliveryData.customerEmail,
        contact_number: deliveryData.contactNumber,
        whatsapp_number: deliveryData.whatsappNumber || null,
        delivery_address: deliveryData.deliveryAddress,
        delivery_location_id: deliveryData.deliveryLocationId,
        subtotal: totals.subtotal,
        delivery_charge: totals.deliveryCharge,
        promocode_discount: totals.promocodeDiscount,
        total_amount: totals.total,
        payment_method_id: selectedPaymentMethod,
        payment_screenshot_url: screenshotUrl,
        promocode_used: appliedPromocode?.code || null,
        combo_applied: cartItems.some(item => getItemPricing(item).mode === 'combo'),
        pricing_breakdown: pricingBreakdown
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items for inventory tracking
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        color_variant_id: item.colorVariantId || null,
        size_variant_id: item.sizeVariantId || null,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create order item details for display
      const orderItemDetails = pricingBreakdown.map(item => ({
        order_id: order.id,
        product_name: item.productName,
        color_name: item.colorName || null,
        size_name: item.sizeName || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        pricing_mode: item.pricingMode,
        pricing_details: {
          description: item.description,
          breakdown: item.breakdown
        }
      }));

      const { error: detailsError } = await supabase
        .from('order_item_details')
        .insert(orderItemDetails);

      if (detailsError) throw detailsError;

      // Clear cart and navigate
      clearCart();
      
      toast({
        title: 'Success',
        description: 'Order placed successfully!',
      });

      if (isGuest) {
        navigate(`/order-summary/${order.id}`);
      } else {
        navigate('/customer-dashboard');
      }

    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setPlacing(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPaymentMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPaymentMethod(method.id)}
              >
                <div className="text-center">
                  <h3 className="font-medium mb-2">{method.name}</h3>
                  <img
                    src={method.qr_code_url}
                    alt={`${method.name} QR Code`}
                    className="w-32 h-32 mx-auto object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Screenshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="screenshot">Upload Payment Screenshot *</Label>
              <div className="mt-2">
                <input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('screenshot')?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {paymentScreenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                </Button>
              </div>
              {paymentScreenshot && (
                <div className="flex items-center mt-2 text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">{paymentScreenshot.name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promocode</CardTitle>
        </CardHeader>
        <CardContent>
          {appliedPromocode ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
              <div>
                <span className="font-medium text-green-800">{appliedPromocode.code}</span>
                <span className="text-green-600 ml-2">
                  {appliedPromocode.discount_percentage}% discount applied
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemovePromocode}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Enter promocode"
                value={promocode}
                onChange={(e) => setPromocode(e.target.value.toUpperCase())}
              />
              <Button onClick={handleApplyPromocode} disabled={loading}>
                {loading ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs. {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span>Rs. {totals.deliveryCharge.toFixed(2)}</span>
            </div>
            {totals.promocodeDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Promocode Discount</span>
                <span>-Rs. {totals.promocodeDiscount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>Rs. {totals.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onPrevious} className="flex-1">
          Previous
        </Button>
        <Button onClick={handlePlaceOrder} disabled={placing} className="flex-1">
          {placing ? 'Placing Order...' : 'Place Order'}
        </Button>
      </div>
    </div>
  );
}
