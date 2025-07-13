
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck, Clock } from 'lucide-react';
import { useOrderStatus } from '@/hooks/useOrderStatus';

interface CheckoutSuccessProps {
  orderId: string;
}

export function CheckoutSuccess({ orderId }: CheckoutSuccessProps) {
  const { orderStatus, loading } = useOrderStatus(orderId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'payment_confirmed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'processing':
        return <Package className="h-6 w-6 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-6 w-6 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'Payment Pending';
      case 'payment_confirmed':
        return 'Payment Confirmed';
      case 'processing':
        return 'Processing Order';
      case 'shipped':
        return 'Order Shipped';
      case 'delivered':
        return 'Order Delivered';
      default:
        return 'Order Placed';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Order Placed Successfully!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Thank you for your order. We'll process it shortly.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Order Status Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {loading ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  ) : (
                    getStatusIcon(orderStatus?.status || 'pending_payment')
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      Order #{orderStatus?.order_number || orderId.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: {getStatusText(orderStatus?.status || 'pending_payment')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Live Updates Active</p>
                  <div className="flex items-center gap-1 text-green-600">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs">Real-time</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          {orderStatus?.items && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orderStatus.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-600">
                          SKU: {item.sku} • Quantity: {item.quantity}
                        </p>
                        <p className="text-xs text-gray-500">
                          Available Stock: {item.available_stock} | Reserved: {item.reserved_stock}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Rs. {item.total_price}</p>
                        <p className="text-sm text-gray-600">@ Rs. {item.unit_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
            >
              Continue Shopping
            </Button>
            <Button 
              onClick={() => window.location.href = `/orders/${orderId}`}
              className="flex-1"
            >
              Track Order
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold mb-2">What happens next?</p>
            <ul className="space-y-1">
              <li>• Your order has been placed and inventory reserved</li>
              <li>• You'll receive real-time updates on your order status</li>
              <li>• We'll process your order within 24 hours</li>
              <li>• You'll receive tracking information once shipped</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
