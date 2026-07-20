import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck, Clock } from 'lucide-react';
import { useOrderStatus } from '@/hooks/useOrderStatus';
import { CleanOrderSummary } from './CleanOrderSummary';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface CheckoutSuccessProps {
  orderId: string;
}

export function CheckoutSuccess({ orderId }: CheckoutSuccessProps) {
  const { orderStatus, loading } = useOrderStatus(orderId);
  const { toast } = useToast();

  // Show success notification on component mount
  useEffect(() => {
    toast({
      title: "Order Placed Successfully!",
      description: "Your order has been created and stock has been reserved. You will receive real-time updates.",
      duration: 5000,
    });
  }, [toast]);

  // Remove auto-redirect - show thank you page instead

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

  // Transform order status data to match cart format for CleanOrderSummary
  const transformedCartItems = orderStatus?.items?.map((item: any, index: number) => ({
    id: `order-item-${index}`,
    productId: item.inventory_id || '',
    productName: item.product_name,
    colorName: item.color_name || '',
    sizeName: item.size_name || '',
    quantity: item.quantity,
    unitPrice: parseFloat(item.unit_price),
    basePrice: parseFloat(item.unit_price),
    imageUrl: '',
    subcategoryId: '',
    addedOrder: index,
    sku: item.sku,
    inventoryId: item.inventory_id
  })) || [];

  // Create mock subcategory pricing for order summary (progressive pricing format)
  const mockSubcategoryPricing = orderStatus?.items ? {
    'order-summary': {
      subcategoryId: 'order-summary',
      totalQuantity: orderStatus.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      basePrice: orderStatus.items[0] ? parseFloat(orderStatus.items[0].unit_price) : 0,
      tierBreakdown: [],
      itemBreakdown: orderStatus.items.map((item: any, index: number) => ({
        itemId: `order-item-${index}`,
        basePrice: parseFloat(item.unit_price),
        unitsAtBase: item.quantity,
        basePriceTotal: parseFloat(item.total_price),
        discountedUnits: [],
        totalPrice: parseFloat(item.total_price),
        savings: 0,
        averageUnitPrice: parseFloat(item.unit_price)
      })),
      totalCost: orderStatus.items.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0),
      totalSavings: 0,
      description: 'Order completed'
    }
  } : {};

  const orderTotal = orderStatus?.items?.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8">
        {/* Left Column - Order Status */}
        <div>
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-green-600">
                Thank You!
              </CardTitle>
              <p className="text-lg text-gray-700 mt-4 leading-relaxed">
                Your order has been successfully placed and we're excited to fulfill it for you.
              </p>
              <p className="text-gray-600 mt-3">
                We've reserved your items and will begin processing your order immediately. You'll receive updates as your order progresses through each stage.
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
                  onClick={() => window.location.href = `/order-summary/${orderId}`}
                  className="flex-1"
                >
                  View Order Details
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

        {/* Right Column - Order Summary (Same as Checkout) */}
        <div>
          {orderStatus && transformedCartItems.length > 0 ? (
            <CleanOrderSummary
              cartItems={transformedCartItems}
              subcategoryPricing={mockSubcategoryPricing}
              deliveryCharge={0}
              promoDiscount={0}
              totalSavings={0}
              finalTotal={orderTotal}
              isSubmitting={false}
              onSubmitOrder={() => {}}
              getTieredItemPricing={(itemId: string) => {
                const index = parseInt(itemId.replace('order-item-', ''));
                const item = orderStatus.items?.[index];
                if (!item) return null;
                const unitPrice = parseFloat(item.unit_price);
                const totalPrice = parseFloat(item.total_price);
                return {
                  itemId,
                  basePrice: unitPrice,
                  unitsAtBase: item.quantity,
                  basePriceTotal: totalPrice,
                  discountedUnits: [],
                  totalPrice,
                  savings: 0,
                  averageUnitPrice: unitPrice,
                  subcategoryInfo: mockSubcategoryPricing['order-summary'] as any
                };
              }}
            />
          ) : (
            <Card className="w-full shadow-lg border-0 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">
                  Loading Order Summary...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
