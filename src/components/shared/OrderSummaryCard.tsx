
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
}

interface OrderSummaryCardProps {
  orderDetails: OrderDetails;
  orderItems: OrderItem[];
  showActions?: boolean;
  className?: string;
}

export function OrderSummaryCard({ 
  orderDetails, 
  orderItems, 
  showActions = false,
  className = "" 
}: OrderSummaryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
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
      </CardContent>
    </Card>
  );
}
