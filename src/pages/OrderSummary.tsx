import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Package, Phone, Mail, Download, ArrowLeft, Printer, Tag } from 'lucide-react';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { PaymentScreenshotViewer } from '@/components/admin/PaymentScreenshotViewer';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

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
  updated_at: string;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
  pricing_breakdown: any;
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
  color_name: string | null;
  size_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  pricing_mode: string;
  pricing_details: any;
}

// Optimized fetch function - tries both tables in parallel
const fetchOrderData = async (orderId: string) => {
  // Fetch from both tables in parallel
  const [customerOrderResult, guestOrderResult] = await Promise.all([
    supabase
      .from('customer_orders')
      .select(`
        id, order_number, customer_name, customer_email, contact_number,
        whatsapp_number, delivery_address, total_amount, paid_amount,
        remaining_amount, subtotal, delivery_charge, status, created_at,
        updated_at, promocode_used, promocode_discount, payment_screenshot_url,
        pricing_breakdown, payment_method:payment_methods(name),
        delivery_location:delivery_charges(place_name)
      `)
      .eq('id', orderId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select(`
        id, order_number, customer_name, customer_email, contact_number,
        whatsapp_number, delivery_address, total_amount, paid_amount,
        remaining_amount, subtotal, delivery_charge, status, created_at,
        updated_at, promocode_used, promocode_discount, payment_screenshot_url,
        pricing_breakdown, payment_method:payment_methods(name),
        delivery_location:delivery_charges(place_name)
      `)
      .eq('id', orderId)
      .maybeSingle()
  ]);

  const order = customerOrderResult.data || guestOrderResult.data;
  const isCustomerOrder = !!customerOrderResult.data;

  if (!order) throw new Error('Order not found');

  // Fetch items from appropriate table
  const itemsTable = isCustomerOrder ? 'customer_order_item_details' : 'order_item_details';
  const { data: items } = await supabase
    .from(itemsTable)
    .select('*')
    .eq('order_id', orderId);

  return { order, items: items || [] };
};

export default function OrderSummary() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const isAdminView = userProfile?.role === 'admin';

  // Use React Query for fast cached fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['order-summary', orderId],
    queryFn: () => fetchOrderData(orderId!),
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const orderDetails = data?.order || null;
  const orderItems = data?.items || [];

  const handlePrintPDF = () => {
    window.print();
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

  // Group items by product for detailed breakdown
  const getGroupedItems = () => {
    const grouped: { [key: string]: OrderItem[] } = {};
    orderItems.forEach(item => {
      const key = `${item.product_name}-${item.color_name || 'no-color'}-${item.size_name || 'no-size'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    return grouped;
  };

  const renderDetailedPricingBreakdown = (items: OrderItem[]) => {
    const firstItem = items[0];
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.total_price, 0);
    
    // Handle both old and new pricing_details format
    const pricingDetails = firstItem.pricing_details || {};
    const basePrice = pricingDetails.basePrice || pricingDetails.base_price || firstItem.unit_price;
    
    // Calculate savings from progressive pricing
    const totalSavings = items.reduce((sum, item) => {
      const details = item.pricing_details || {};
      return sum + (details.savings || 0);
    }, 0);

    // Check for progressive pricing structure
    const hasProgressivePricing = pricingDetails.progressivePricing || pricingDetails.discountedUnits;

    return (
      <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-medium text-lg">{firstItem.product_name}</p>
            <div className="mt-1 space-y-1">
              {firstItem.color_name && (
                <p className="text-sm text-gray-600">Color: <span className="font-medium">{firstItem.color_name}</span></p>
              )}
              {firstItem.size_name && (
                <p className="text-sm text-gray-600">Size: <span className="font-medium">{firstItem.size_name}</span></p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-xl">Rs. {totalPrice.toFixed(2)}</p>
            {totalSavings > 0 && (
              <p className="text-sm text-gray-500 line-through">
                Was: Rs. {(basePrice * totalQuantity).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Progressive Pricing Breakdown */}
        {hasProgressivePricing && pricingDetails.discountedUnits?.length > 0 ? (
          <div className="space-y-2">
            {/* Units at base price */}
            {pricingDetails.unitsAtBase > 0 && (
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <div className="flex-1">
                  <span className="text-sm">{pricingDetails.unitsAtBase} × Rs. {basePrice.toFixed(2)}</span>
                  <p className="text-xs text-gray-500">Base price</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rs. {pricingDetails.basePriceTotal?.toFixed(2) || (pricingDetails.unitsAtBase * basePrice).toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* Discounted tiers */}
            {pricingDetails.discountedUnits.map((tier: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      <Tag className="w-2 h-2 mr-1" />
                      {tier.tierName} tier
                    </Badge>
                    <span className="text-sm">{tier.units} × Rs. {tier.unitPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-600">Rs. {tier.discountAmount.toFixed(2)} off/item</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-700">Rs. {tier.total.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Legacy/Simple Item Breakdown */
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.pricing_mode === 'discount' || item.pricing_mode === 'progressive_discount' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        <Tag className="w-2 h-2 mr-1" />
                        Volume Discount
                      </Badge>
                    ) : null}
                    <span className="text-sm">Qty: {item.quantity}</span>
                  </div>
                  <p className="text-sm text-gray-600">Rs. {item.unit_price.toFixed(2)} each</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rs. {item.total_price.toFixed(2)}</p>
                  {item.pricing_details?.savings > 0 && (
                    <p className="text-xs text-green-600">
                      Saved: Rs. {item.pricing_details.savings.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total Savings Summary */}
        {totalSavings > 0 && (
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <p className="text-green-800 font-medium">Total Savings: Rs. {totalSavings.toFixed(2)}</p>
            <p className="text-xs text-green-600">Progressive volume discount applied</p>
          </div>
        )}
      </div>
    );
  };

  const handleBackNavigation = () => {
    if (isAdminView) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  // Redirect if no orderId
  if (!orderId) {
    navigate('/');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModernNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModernNavbar />
        <div className="text-center py-20">
          <p className="text-red-600 text-lg">Order not found</p>
          <Button onClick={handleBackNavigation} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const groupedItems = getGroupedItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 no-print">
          <Button variant="outline" onClick={handleBackNavigation}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isAdminView ? 'Back to Admin Orders' : 'Back to Home'}
          </Button>
          <Button onClick={handlePrintPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Success Message - only show for non-admin views */}
        {!isAdminView && (
          <div className="text-center mb-8">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-green-600 mb-2">Order Placed Successfully!</h1>
            <p className="text-gray-600">Thank you for your order. We'll process it shortly.</p>
          </div>
        )}

        {/* Admin view header */}
        {isAdminView && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Details</h1>
            <p className="text-gray-600">Admin view - Order #{orderDetails.order_number}</p>
          </div>
        )}

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

            {/* Enhanced Order Items with Detailed Pricing Breakdown */}
            <div>
              <h3 className="font-semibold mb-4">Order Items - Detailed Pricing Breakdown</h3>
              <div className="space-y-4">
                {Object.entries(groupedItems).map(([itemKey, items]) => (
                  <div key={itemKey}>
                    {renderDetailedPricingBreakdown(items)}
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

            {/* Payment Screenshot Section */}
            {orderDetails.payment_screenshot_url && (
              <div>
                <h3 className="font-semibold mb-3">Payment Screenshot</h3>
                <div className="flex justify-center">
                  <PaymentScreenshotViewer
                    imageUrl={orderDetails.payment_screenshot_url}
                    orderNumber={orderDetails.order_number}
                    customerName={orderDetails.customer_name}
                    uploadedAt={orderDetails.created_at}
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* What's Next - only show for non-admin views */}
            {!isAdminView && (
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
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center no-print">
          {!isAdminView && (
            <Button asChild size="lg">
              <Link to="/">Continue Shopping</Link>
            </Button>
          )}
          <Button onClick={handlePrintPDF} variant="outline" size="lg">
            <Printer className="h-4 w-4 mr-2" />
            Print Order
          </Button>
          {isAdminView && (
            <Button onClick={handleBackNavigation} variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          )}
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
