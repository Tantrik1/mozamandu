
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EnhancedPaymentScreenshotViewer } from '@/components/admin/EnhancedPaymentScreenshotViewer';

interface OrderItem {
  id: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  whatsapp_number?: string;
  delivery_address: string;
  subtotal: number;
  delivery_charge: number;
  promocode_discount?: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  payment_screenshot_url?: string;
  created_at: string;
  payment_method?: {
    name: string;
  };
  delivery_location?: {
    place_name: string;
  };
}

interface OrderSummaryCardProps {
  order: OrderData;
  items: OrderItem[];
}

export function OrderSummaryCard({ order, items }: OrderSummaryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">Order #{order.order_number}</CardTitle>
              <p className="text-gray-600 mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <Badge className={`px-3 py-1 ${getStatusColor(order.status)}`}>
              {formatStatus(order.status)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="font-medium">{order.customer_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Number</p>
              <p className="font-medium">{order.contact_number}</p>
            </div>
            {order.whatsapp_number && (
              <div>
                <p className="text-sm font-medium text-gray-500">WhatsApp Number</p>
                <p className="font-medium">{order.whatsapp_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Delivery Address</p>
              <p className="font-medium">{order.delivery_address}</p>
            </div>
            {order.delivery_location && (
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery Location</p>
                <p className="font-medium">{order.delivery_location.place_name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Delivery Charge</p>
              <p className="font-medium">Rs. {order.delivery_charge}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <h4 className="font-medium">{item.product_name}</h4>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    {item.color_name && <span>Color: {item.color_name}</span>}
                    {item.size_name && <span>Size: {item.size_name}</span>}
                    <span>Qty: {item.quantity}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rs. {item.total_price}</p>
                  <p className="text-sm text-gray-600">Rs. {item.unit_price} each</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs. {order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span>Rs. {order.delivery_charge}</span>
            </div>
            {order.promocode_discount && order.promocode_discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Promocode Discount</span>
                <span>-Rs. {order.promocode_discount}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Amount</span>
              <span>Rs. {order.total_amount}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium">
              <span>Paid Amount</span>
              <span>Rs. {order.paid_amount}</span>
            </div>
            {order.remaining_amount > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Remaining Amount</span>
                <span>Rs. {order.remaining_amount}</span>
              </div>
            )}
            {order.payment_method && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium text-gray-500">Payment Method</p>
                <p className="font-medium">{order.payment_method.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Screenshot */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedPaymentScreenshotViewer
              imageUrl={order.payment_screenshot_url}
              orderNumber={order.order_number}
              customerName={order.customer_name}
              uploadedAt={order.created_at}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
