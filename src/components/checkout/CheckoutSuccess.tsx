
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutSuccessProps {
  orderId: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
}

export function CheckoutSuccess({ orderId }: CheckoutSuccessProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!error && data) {
      setOrderDetails(data);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="text-center">Loading order details...</div>;
  }

  if (!orderDetails) {
    return <div className="text-center text-red-600">Order not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-green-600 mb-2">Order Placed Successfully!</h1>
        <p className="text-gray-600">Thank you for your order. We'll process it shortly.</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="font-bold text-lg">{orderDetails.order_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="font-medium">
                {new Date(orderDetails.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-bold text-lg">${orderDetails.total_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid Amount</p>
              <p className="font-medium text-green-600">
                ${orderDetails.paid_amount.toFixed(2)}
              </p>
            </div>
            {orderDetails.remaining_amount > 0 && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Remaining Amount</p>
                <p className="font-medium text-orange-600">
                  ${orderDetails.remaining_amount.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">What happens next?</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                We'll review your payment and prepare your order
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Our team will contact you at {orderDetails.contact_number}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Order updates will be sent to {orderDetails.customer_email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button asChild className="w-full">
          <Link to="/">Continue Shopping</Link>
        </Button>
        
        <p className="text-sm text-gray-600">
          Need help? Contact us at support@mozamandu.com
        </p>
      </div>
    </div>
  );
}
