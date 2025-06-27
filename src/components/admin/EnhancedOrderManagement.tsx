import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Search, Filter, RefreshCw, Gift, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled';
  created_at: string;
  combo_applied: boolean;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
  delivery_address: string;
  subtotal: number;
  delivery_charge: number;
  user_id: string | null;
}

interface OrderItemDetail {
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

export function EnhancedOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItemDetails, setOrderItemDetails] = useState<{ [key: string]: OrderItemDetail[] }>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log('Fetching all orders...');
      // Fetch ALL orders - customer, admin, and guest orders
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_email,
          contact_number,
          total_amount,
          paid_amount,
          remaining_amount,
          status,
          created_at,
          combo_applied,
          promocode_used,
          promocode_discount,
          payment_screenshot_url,
          delivery_address,
          subtotal,
          delivery_charge,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch orders: " + error.message,
          variant: "destructive",
        });
      } else {
        console.log('Fetched orders:', data?.length || 0);
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching orders:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItemDetails = async (orderId: string) => {
    if (orderItemDetails[orderId]) return;

    try {
      console.log('Fetching order item details for:', orderId);
      const { data, error } = await supabase
        .from('order_item_details')
        .select('*')
        .eq('order_id', orderId);

      if (error) {
        console.error('Error fetching order item details:', error);
      } else {
        console.log('Fetched order item details:', data?.length || 0);
        setOrderItemDetails(prev => ({ ...prev, [orderId]: data || [] }));
      }
    } catch (error) {
      console.error('Unexpected error fetching order item details:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      console.log('Updating order status:', orderId, 'to', newStatus);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        toast({
          title: "Error",
          description: "Failed to update order status: " + error.message,
          variant: "destructive",
        });
      } else {
        console.log('Order status updated successfully');
        toast({
          title: "Success",
          description: "Order status updated successfully",
        });
        
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled' }
            : order
        ));
        
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled' } : null);
        }
      }
    } catch (error) {
      console.error('Unexpected error updating order status:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
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

  const getOrderType = (order: Order) => {
    if (!order.user_id) return 'Guest';
    // You could add logic here to check if user is admin vs customer
    return 'Customer';
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    await fetchOrderItemDetails(order.id);
  };

  // Group items for detailed breakdown in order view
  const getGroupedOrderItems = (items: OrderItemDetail[]) => {
    const grouped: { [key: string]: OrderItemDetail[] } = {};
    items.forEach(item => {
      const key = `${item.product_name}-${item.color_name || 'no-color'}-${item.size_name || 'no-size'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    return grouped;
  };

  const renderDetailedOrderSummary = (order: Order, items: OrderItemDetail[]) => {
    const groupedItems = getGroupedOrderItems(items);
    
    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Customer & Order Info */}
        <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
          <div>
            <h4 className="font-semibold mb-2">Customer Information</h4>
            <p><strong>Name:</strong> {order.customer_name}</p>
            <p><strong>Email:</strong> {order.customer_email}</p>
            <p><strong>Contact:</strong> {order.contact_number}</p>
            <p><strong>Type:</strong> <Badge variant="outline">{getOrderType(order)}</Badge></p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Order Information</h4>
            <p><strong>Order #:</strong> {order.order_number}</p>
            <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
            <p><strong>Status:</strong> 
              <Badge className={`ml-2 ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ')}
              </Badge>
            </p>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="p-4 bg-gray-50 rounded">
          <h4 className="font-semibold mb-2">Delivery Address</h4>
          <p className="text-sm">{order.delivery_address}</p>
        </div>

        {/* Detailed Items Breakdown */}
        <div>
          <h4 className="font-semibold mb-3">Order Items - Detailed Breakdown</h4>
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([itemKey, itemGroup]) => {
              const firstItem = itemGroup[0];
              const totalQuantity = itemGroup.reduce((sum, item) => sum + item.quantity, 0);
              const totalPrice = itemGroup.reduce((sum, item) => sum + item.total_price, 0);
              const totalSavings = itemGroup.reduce((sum, item) => {
                const basePrice = item.pricing_details?.base_price || item.unit_price;
                return sum + ((basePrice - item.unit_price) * item.quantity);
              }, 0);

              return (
                <div key={itemKey} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-medium">{firstItem.product_name}</h5>
                      {firstItem.color_name && <p className="text-sm text-gray-600">Color: {firstItem.color_name}</p>}
                      {firstItem.size_name && <p className="text-sm text-gray-600">Size: {firstItem.size_name}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">Rs. {totalPrice.toFixed(2)}</p>
                      {totalSavings > 0 && (
                        <p className="text-sm text-green-600">Saved: Rs. {totalSavings.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  {/* Individual item breakdown */}
                  <div className="space-y-2">
                    {itemGroup.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          {item.pricing_mode === 'combo' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              <Gift className="w-2 h-2 mr-1" />
                              Combo
                            </Badge>
                          )}
                          {item.pricing_mode === 'discount' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                              <Tag className="w-2 h-2 mr-1" />
                              MOQ
                            </Badge>
                          )}
                          <span>Qty: {item.quantity}</span>
                          <span>@ Rs. {item.unit_price.toFixed(2)}</span>
                        </div>
                        <span className="font-medium">Rs. {item.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="p-4 bg-gray-50 rounded">
          <h4 className="font-semibold mb-3">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs. {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery:</span>
              <span>Rs. {order.delivery_charge.toFixed(2)}</span>
            </div>
            {order.promocode_discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({order.promocode_used}):</span>
                <span>-Rs. {order.promocode_discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>Rs. {order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid:</span>
              <span>Rs. {order.paid_amount.toFixed(2)}</span>
            </div>
            {order.remaining_amount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Remaining:</span>
                <span>Rs. {order.remaining_amount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Screenshot */}
        {order.payment_screenshot_url && (
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Payment Screenshot</h4>
            <img
              src={order.payment_screenshot_url}
              alt="Payment Screenshot"
              className="max-w-sm border rounded"
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading orders...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Button onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{orders.length}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.status === 'pending_payment').length}
            </div>
            <div className="text-sm text-gray-600">Pending Payment</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'delivered').length}
            </div>
            <div className="text-sm text-gray-600">Delivered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              Rs. {orders.reduce((sum, o) => sum + Number(o.total_amount), 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, customer name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="payment_confirmed">Payment Confirmed</SelectItem>
                  <SelectItem value="on_delivery">On Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-gray-600">{order.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getOrderType(order)}</Badge>
                  </TableCell>
                  <TableCell>Rs. {Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-green-600">Rs. {Number(order.paid_amount).toFixed(2)}</p>
                      {order.remaining_amount > 0 && (
                        <p className="text-sm text-orange-600">
                          Remaining: Rs. {Number(order.remaining_amount).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                      disabled={updating === order.id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue>
                          <Badge className={getStatusColor(order.status)}>
                            {updating === order.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_payment">Pending Payment</SelectItem>
                        <SelectItem value="payment_confirmed">Payment Confirmed</SelectItem>
                        <SelectItem value="on_delivery">On Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && orderItemDetails[selectedOrder.id] ? (
                          renderDetailedOrderSummary(selectedOrder, orderItemDetails[selectedOrder.id])
                        ) : (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            Loading order details...
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No orders found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
