import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Package, Phone, Mail, Download, ArrowLeft, Printer } from 'lucide-react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { toast } from '@/hooks/use-toast';

interface OrderDetails {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  whatsapp_number: string;
  delivery_address: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  subtotal: number;
  delivery_charge: number;
  status: string;
  created_at: string;
  combo_applied: boolean;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  color_name: string | null;
  size_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  pricing_mode: string;
}

export default function OrderSummary() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }
    fetchOrderDetails();
  }, [orderId, navigate]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    try {
      console.log('Fetching order details for:', orderId);

      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Fetch order item details (formatted data)
      const { data: items, error: itemsError } = await supabase
        .from('order_item_details')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        toast({
          title: "Error",
          description: "Failed to load order items",
          variant: "destructive",
        });
      }

      setOrderDetails(order);
      setOrderItems(items || []);
    } catch (error) {
      console.error('Unexpected error fetching order:', error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="text-center py-20">
          <p className="text-red-600 text-lg">Order not found</p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 no-print">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Button onClick={handlePrintPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600">Thank you for your order. We'll process it shortly.</p>
        </div>

        {/* Order Summary Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Order Summary</CardTitle>
              <Badge className={getStatusColor(orderDetails.status)}>
                {orderDetails.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Order Number:</strong> {orderDetails.order_number}</p>
                  <p><strong>Order Date:</strong> {new Date(orderDetails.created_at).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> {orderDetails.status}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {orderDetails.customer_name}</p>
                  <p><strong>Email:</strong> {orderDetails.customer_email}</p>
                  <p><strong>Contact:</strong> {orderDetails.contact_number}</p>
                  {orderDetails.whatsapp_number && (
                    <p><strong>WhatsApp:</strong> {orderDetails.whatsapp_number}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Delivery Address */}
            <div>
              <h3 className="font-semibold mb-3">Delivery Address</h3>
              <p className="text-sm text-gray-600">{orderDetails.delivery_address}</p>
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-3">Order Items</h3>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.color_name && (
                        <p className="text-sm text-gray-600">Color: {item.color_name}</p>
                      )}
                      {item.size_name && (
                        <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                      )}
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      {item.pricing_mode !== 'normal' && (
                        <Badge variant="outline" className="text-xs">
                          {item.pricing_mode}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {item.total_price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Rs. {item.unit_price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div>
              <h3 className="font-semibold mb-3">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {orderDetails.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>Rs. {orderDetails.delivery_charge.toFixed(2)}</span>
                </div>
                {orderDetails.promocode_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({orderDetails.promocode_used}):</span>
                    <span>-Rs. {orderDetails.promocode_discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>Rs. {orderDetails.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid Amount:</span>
                  <span>Rs. {orderDetails.paid_amount.toFixed(2)}</span>
                </div>
                {orderDetails.remaining_amount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Remaining Amount:</span>
                    <span>Rs. {orderDetails.remaining_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* What's Next */}
            <div>
              <h3 className="font-semibold mb-3">What happens next?</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <p className="text-sm">We'll review your payment and prepare your order</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <p className="text-sm">Our team will contact you at {orderDetails.contact_number}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <p className="text-sm">Order updates will be sent to {orderDetails.customer_email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center no-print">
          <Button asChild size="lg">
            <Link to="/">Continue Shopping</Link>
          </Button>
          <Button onClick={handlePrintPDF} variant="outline" size="lg">
            <Printer className="h-4 w-4 mr-2" />
            Print Order
          </Button>
        </div>

        {/* Contact Info */}
        <div className="text-center mt-8 pt-8 border-t">
          <p className="text-sm text-gray-600">
            Need help? Contact us at <strong>support@mozamandu.com</strong>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
