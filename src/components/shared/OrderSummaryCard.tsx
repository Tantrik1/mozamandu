
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BaseOrder, OrderItem } from '@/types/order';

interface OrderSummaryCardProps {
  orderDetails: BaseOrder;
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
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'verified': return 'bg-purple-100 text-purple-800';
      case 'in_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'Pending Payment';
      case 'processing': return 'Processing';
      case 'verified': return 'Verified';
      case 'in_delivery': return 'In Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Order Summary</CardTitle>
          <Badge className={getStatusColor(orderDetails.status)}>
            {getStatusLabel(orderDetails.status)}
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
              <p><strong>Status:</strong> {getStatusLabel(orderDetails.status)}</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Customer Information</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {orderDetails.customer_name}</p>
              <p><strong>Email:</strong> {orderDetails.customer_email}</p>
              <p><strong>Contact:</strong> {orderDetails.contact_number}</p>
              {orderDetails.whatsapp_number && orderDetails.whatsapp_number !== orderDetails.contact_number && (
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
          {orderItems.length > 0 ? (
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
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.pricing_mode}
                        </Badge>
                        {item.pricing_details?.description && (
                          <p className="text-xs text-green-600 mt-1">{item.pricing_details.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Rs. {Number(item.total_price).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Rs. {Number(item.unit_price).toFixed(2)} each</p>
                    {item.pricing_details?.discount_applied && item.pricing_details?.base_price && (
                      <p className="text-xs text-gray-500 line-through">
                        Rs. {(Number(item.pricing_details.base_price) * item.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No items found for this order.</p>
          )}
        </div>

        <Separator />

        {/* Payment Summary */}
        <div>
          <h3 className="font-semibold mb-3">Payment Summary</h3>
          <div className="space-y-2">
            {/* Use pricing breakdown if available, otherwise fallback to individual fields */}
            {orderDetails.pricing_breakdown ? (
              <>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {Number(orderDetails.pricing_breakdown.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>Rs. {Number(orderDetails.pricing_breakdown.delivery_charge).toFixed(2)}</span>
                </div>
                {orderDetails.pricing_breakdown.promocode_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({orderDetails.pricing_breakdown.promocode_used}):</span>
                    <span>-Rs. {Number(orderDetails.pricing_breakdown.promocode_discount).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>Rs. {Number(orderDetails.pricing_breakdown.final_total).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {Number(orderDetails.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>Rs. {Number(orderDetails.delivery_charge).toFixed(2)}</span>
                </div>
                {orderDetails.promocode_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({orderDetails.promocode_used}):</span>
                    <span>-Rs. {Number(orderDetails.promocode_discount).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>Rs. {Number(orderDetails.total_amount).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Screenshot */}
        {orderDetails.payment_screenshot_url && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Payment Screenshot</h3>
              <img
                src={orderDetails.payment_screenshot_url}
                alt="Payment Screenshot"
                className="max-w-md border rounded-lg"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
