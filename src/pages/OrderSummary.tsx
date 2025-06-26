
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, ArrowLeft, Printer } from 'lucide-react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { OrderSummaryCard } from '@/components/shared/OrderSummaryCard';
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
  subtotal: number;
  delivery_charge: number;
  status: string;
  created_at: string;
  combo_applied: boolean;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
  pricing_breakdown?: any;
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
  pricing_details?: any;
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

      // Fetch order item details (for display)
      const { data: items, error: itemsError } = await supabase
        .from('order_item_details')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error fetching order item details:', itemsError);
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

        {/* Order Summary using reusable component */}
        <OrderSummaryCard 
          orderDetails={orderDetails}
          orderItems={orderItems}
          className="mb-8"
        />

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
