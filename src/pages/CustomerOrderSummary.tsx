import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Phone, Mail, MapPin, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import FullScreenImageModal from '@/components/admin/FullScreenImageModal';

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
  payment_method?: {
    name: string;
  };
  delivery_location?: {
    place_name: string;
  };
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  pricing_mode: string;
  pricing_details?: {
    breakdown?: string[];
    description?: string;
    basePrice?: number;
  };
  product?: {
    name: string;
    category?: { name: string };
    subcategory?: { name: string };
  };
}

export default function CustomerOrderSummary() {
  const { orderId } = useParams<{ orderId: string }>();
  const [orderDetails, setOrderDetails] = useState<CustomerOrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);

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
        setLoading(false);
        return;
      }

      // Step 1: Fetch all customer order item details for the order
      const { data: itemDetails, error: detailsError } = await supabase
        .from('customer_order_item_details')
        .select('*')
        .eq('order_id', orderId);
      if (detailsError) {
        console.error('❌ Error fetching order item details:', detailsError);
      }
      // Step 2: Extract unique product_inventory_ids from pricing_details
      const inventoryIds = Array.from(new Set(
        (itemDetails || [])
          .map(item => {
            let details = item.pricing_details;
            if (typeof details === 'string') {
              try {
                details = JSON.parse(details);
              } catch {
                details = {};
              }
            }
            if (typeof details === 'object' && details !== null && !Array.isArray(details)) {
              const rawId = (details as any).product_inventory_id;
              return typeof rawId === 'string' ? rawId : undefined;
            }
            return undefined;
          })
          .filter((id): id is string => typeof id === 'string' && !!id)
      ));
      // Step 3: Fetch all product inventory with product/category/subcategory info
      let inventoryMap: Record<string, any> = {};
      if (inventoryIds.length > 0) {
        const { data: inventory, error: inventoryError } = await supabase
          .from('product_inventory')
          .select(`
            id,
            product:products(
              name,
              category:categories(name),
              subcategory:subcategories(name)
            )
          `)
          .in('id', inventoryIds);
        if (!inventoryError && inventory) {
          inventoryMap = Object.fromEntries(inventory.map(inv => [inv.id, inv]));
        }
      }
      // Step 4: Merge product info into each order item detail
      let mergedItems = (itemDetails || []).map(item => {
        let details = item.pricing_details;
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch {
            details = {};
          }
        }
        if (typeof details !== 'object' || details === null || Array.isArray(details)) details = {};
        let inventoryId: string | undefined = undefined;
        if (typeof details === 'object' && details !== null && !Array.isArray(details)) {
          const rawId = (details as any).product_inventory_id;
          inventoryId = typeof rawId === 'string' ? rawId : undefined;
        }
        const inventoryData = inventoryId ? inventoryMap[inventoryId] : undefined;
        return {
          id: item.id,
          product_id: inventoryId || '',
          product_name: inventoryData?.product?.name || '',
          color_name: item.color_name ?? '',
          size_name: item.size_name ?? '',
          quantity: item.quantity ?? 0,
          unit_price: item.unit_price ?? 0,
          total_price: item.total_price ?? 0,
          pricing_mode: item.pricing_mode ?? '',
          pricing_details: details,
          product: inventoryData?.product || undefined
        } as OrderItem;
      });
      setOrderItems(mergedItems);
      setOrderDetails(orderData);
    } catch (error) {
      console.error('💥 Error fetching customer order details:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
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

  if (loading) {
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
            <Badge className={getStatusColor(orderDetails.status)}>
              {getStatusText(orderDetails.status)}
            </Badge>
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
                    const basePrice = item.pricing_details?.basePrice ?? item.unit_price;
                    const saved = basePrice > item.unit_price;
                    return (
                      <div key={item.id} className="flex flex-col md:flex-row md:justify-between md:items-center p-4 bg-white rounded border mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {item.pricing_mode === 'combo' && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                Combo
                              </Badge>
                            )}
                            {item.pricing_mode === 'discount' && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                MOQ
                              </Badge>
                            )}
                            <span className="text-sm">Qty: {item.quantity}</span>
                          </div>
                          {item.product_name && <h4 className="font-medium">{item.product_name}</h4>}
                          {/* Category and Subcategory */}
                          {item.product && (
                            <p className="text-sm text-gray-600 mb-1">
                              {item.product.category?.name} → {item.product.subcategory?.name}
                            </p>
                          )}
                          {item.color_name && (
                            <p className="text-sm text-gray-600">Color: {item.color_name}</p>
                          )}
                          {item.size_name && (
                            <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                          )}
                          {/* --- Advanced Pricing Breakdown --- */}
                          {item.pricing_details && (
                            <div className="mt-2 space-y-1">
                              {item.pricing_details.description && (
                                <p className="text-xs text-gray-700 font-semibold mb-1">{item.pricing_details.description}</p>
                              )}
                              {Array.isArray(item.pricing_details.breakdown) && item.pricing_details.breakdown.length > 0 && (
                                <ul className="text-xs text-gray-600 list-disc list-inside mb-1">
                                  {item.pricing_details.breakdown.map((line: string, idx: number) => (
                                    <li key={idx}>{line}</li>
                                  ))}
                                </ul>
                              )}
                              {typeof item.pricing_details.basePrice === 'number' && (
                                <p className="text-xs text-gray-500 mt-1">Base Price: Rs. {item.pricing_details.basePrice.toFixed(2)}</p>
                              )}
                              {saved && (
                                <p className="text-xs text-green-600 mt-1">
                                  Saved: Rs. {(basePrice - item.unit_price).toFixed(2)} each
                                </p>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-gray-600">Rs. {item.unit_price.toFixed(2)} each</p>
                        </div>
                        <div className="text-right mt-2 md:mt-0">
                          <p className="font-medium">Rs. {item.total_price.toFixed(2)}</p>
                          {saved && (
                            <p className="text-xs text-green-600">
                              Total Saved: Rs. {((basePrice - item.unit_price) * item.quantity).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                    <Button
                      variant="outline"
                      onClick={() => setIsScreenshotOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      View Payment Screenshot
                    </Button>
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

      {/* Payment Screenshot Viewer */}
      <FullScreenImageModal
        isOpen={isScreenshotOpen}
        onClose={() => setIsScreenshotOpen(false)}
        imageUrl={orderDetails?.payment_screenshot_url || null}
        orderId={orderDetails?.order_number}
      />
    </div>
  );
}
