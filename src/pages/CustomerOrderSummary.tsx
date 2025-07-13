
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Phone, Mail, MapPin, Calendar, CreditCard, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { PaymentScreenshotViewer } from '@/components/admin/PaymentScreenshotViewer';

interface CustomerOrderDetails {
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
  promocode_used?: string;
  combo_applied?: boolean;
  created_at: string;
  pricing_breakdown?: any;
  payment_method?: {
    name: string;
  };
  delivery_location?: {
    place_name: string;
  };
}

interface OrderItem {
  id: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  pricing_mode: string;
  sku?: string;
  pricing_details?: {
    savings: number;
    tierInfo?: string;
    basePrice?: number;
  };
}

export default function CustomerOrderSummary() {
  const { orderId } = useParams();
  const [orderDetails, setOrderDetails] = useState<CustomerOrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      console.log('🔍 Fetching customer order details for:', orderId);

      // Fetch order details with related data
      const { data: orderData, error: orderError } = await supabase
        .from('customer_orders')
        .select(`
          *,
          payment_method:payment_methods(name),
          delivery_location:delivery_charges(place_name)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('❌ Error fetching customer order:', orderError);
        setError('Order not found');
        setIsLoading(false);
        return;
      }

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('customer_order_item_details')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at');

      if (itemsError) {
        console.error('❌ Error fetching order items:', itemsError);
      }

      console.log('✅ Customer order data fetched:', orderData);
      console.log('✅ Order items fetched:', itemsData);

      setOrderDetails(orderData);
      setOrderItems((itemsData || []).map(item => ({
        ...item,
        pricing_details: item.pricing_details as any || { savings: 0 }
      })));
    } catch (error) {
      console.error('💥 Error fetching customer order details:', error);
      setError('Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'payment_confirmed': return 'bg-blue-100 text-blue-800';
      case 'on_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const getPricingModeDisplay = (mode: string) => {
    switch (mode) {
      case 'combo': return { text: 'Combo Price', color: 'bg-purple-100 text-purple-800' };
      case 'discount': return { text: 'MOQ Discount', color: 'bg-green-100 text-green-800' };
      case 'moq_discount': return { text: 'MOQ Discount', color: 'bg-green-100 text-green-800' };
      default: return { text: 'Normal Price', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The requested order could not be found.'}</p>
            <Button asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button asChild variant="outline" className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
              <p className="text-gray-600">Order #{orderDetails.order_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(orderDetails.status)}>
                {getStatusText(orderDetails.status)}
              </Badge>
              {orderDetails.combo_applied && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Star className="h-3 w-3 mr-1" />
                  Combo Applied
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item) => {
                    const pricingMode = getPricingModeDisplay(item.pricing_mode);
                    return (
                      <div key={item.id} className="flex justify-between items-start py-4 border-b last:border-b-0">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          {item.color_name && (
                            <p className="text-sm text-gray-600">Color: {item.color_name}</p>
                          )}
                          {item.size_name && (
                            <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                          )}
                          {item.sku && (
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × Rs. {item.unit_price.toFixed(2)}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className={pricingMode.color}>
                              {pricingMode.text}
                            </Badge>
                            {item.pricing_details?.savings && item.pricing_details.savings > 0 && (
                              <span className="text-sm text-green-600">
                                Saved Rs. {item.pricing_details.savings.toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          {item.pricing_details?.tierInfo && (
                            <p className="text-xs text-blue-600 mt-1">
                              {item.pricing_details.tierInfo}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Rs. {item.total_price.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Rs. {item.unit_price.toFixed(2)} each</p>
                          {item.pricing_details?.basePrice && item.pricing_details.basePrice !== item.unit_price && (
                            <p className="text-xs text-gray-500 line-through">
                              Rs. {item.pricing_details.basePrice.toFixed(2)} base
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pricing Breakdown Summary */}
                {orderDetails.pricing_breakdown && (
                  <div className="mt-6 pt-4 border-t">
                    <h5 className="font-medium text-gray-900 mb-3">Pricing Breakdown</h5>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {orderDetails.pricing_breakdown.pricingMode === 'combo' && orderDetails.pricing_breakdown.comboInfo && (
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="h-4 w-4 text-purple-600" />
                            <span className="font-medium text-purple-800">
                              {orderDetails.pricing_breakdown.comboInfo.combo.name}
                            </span>
                          </div>
                          <p className="text-sm text-purple-700">
                            {orderDetails.pricing_breakdown.comboInfo.combo.description}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            Total combo savings: Rs. {orderDetails.pricing_breakdown.comboInfo.totalComboSavings.toFixed(2)}
                          </p>
                        </div>
                      )}
                      
                      {orderDetails.pricing_breakdown.pricingMode === 'moq_discount' && orderDetails.pricing_breakdown.tieredSavings > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-800">MOQ Discount Applied</span>
                          </div>
                          <p className="text-sm text-green-700">
                            You reached the minimum order quantity and received tiered pricing discounts.
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Total MOQ savings: Rs. {orderDetails.pricing_breakdown.tieredSavings.toFixed(2)}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span>Items Subtotal:</span>
                        <span>Rs. {orderDetails.pricing_breakdown.tieredSubtotal?.toFixed(2) || orderDetails.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {(orderDetails.pricing_breakdown.tieredSavings > 0 || orderDetails.pricing_breakdown.comboInfo?.totalComboSavings > 0) && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Pricing Discounts:</span>
                          <span>-Rs. {(orderDetails.pricing_breakdown.tieredSavings || orderDetails.pricing_breakdown.comboInfo?.totalComboSavings || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Screenshot */}
            {orderDetails.payment_screenshot_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Screenshot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <PaymentScreenshotViewer
                      imageUrl={orderDetails.payment_screenshot_url}
                      orderNumber={orderDetails.order_number}
                      customerName={orderDetails.customer_name}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary & Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {orderDetails.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>Rs. {orderDetails.delivery_charge.toFixed(2)}</span>
                </div>
                {orderDetails.promocode_discount && orderDetails.promocode_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo Discount:</span>
                    <span>-Rs. {orderDetails.promocode_discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>Rs. {orderDetails.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>Rs. {orderDetails.paid_amount.toFixed(2)}</span>
                </div>
                {orderDetails.remaining_amount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Remaining:</span>
                    <span>Rs. {orderDetails.remaining_amount.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{orderDetails.customer_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{orderDetails.contact_number}</span>
                </div>
                {orderDetails.whatsapp_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-500" />
                    <span className="text-sm">WhatsApp: {orderDetails.whatsapp_number}</span>
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
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm">{orderDetails.delivery_address}</p>
                    {orderDetails.delivery_location && (
                      <p className="text-xs text-gray-500 mt-1">
                        Location: {orderDetails.delivery_location.place_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Ordered: {new Date(orderDetails.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            {(orderDetails.promocode_used || orderDetails.combo_applied || orderDetails.payment_method) && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {orderDetails.promocode_used && (
                    <p className="text-sm">
                      <span className="font-medium">Promo Code:</span> {orderDetails.promocode_used}
                    </p>
                  )}
                  {orderDetails.combo_applied && (
                    <p className="text-sm">
                      <span className="font-medium">Combo Applied:</span> Yes
                    </p>
                  )}
                  {orderDetails.payment_method && (
                    <p className="text-sm">
                      <span className="font-medium">Payment Method:</span> {orderDetails.payment_method.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
