import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Search, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { handleOrderStatusUpdate } from '@/utils/inventoryManager';
import { AdminPasswordDialog } from '@/components/admin/AdminPasswordDialog';

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
  user_id: string | null;
  delivery_address: string;
  delivery_charge: number;
  subtotal: number;
  order_type: 'guest' | 'customer' | 'admin';
  source_table: 'orders' | 'customer_orders';
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
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItemDetails, setOrderItemDetails] = useState<{ [key: string]: OrderItemDetail[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ order: Order; newStatus: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log('Fetching orders for admin dashboard...');

      const [ordersResponse, customerOrdersResponse] = await Promise.all([
        supabase
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
            user_id,
            delivery_address,
            delivery_charge,
            subtotal
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('customer_orders')
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
            user_id,
            delivery_address,
            delivery_charge,
            subtotal
          `)
          .order('created_at', { ascending: false })
      ]);

      if (ordersResponse.error) {
        console.error('Error fetching orders:', ordersResponse.error);
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
        return;
      }

      if (customerOrdersResponse.error) {
        console.error('Error fetching customer orders:', customerOrdersResponse.error);
        toast({
          title: "Error",
          description: "Failed to fetch customer orders",
          variant: "destructive",
        });
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles",
          variant: "destructive",
        });
        return;
      }

      const profilesMap = new Map(profiles?.map(p => [p.id, p.role]) || []);

      const processedOrders = (ordersResponse.data || []).map(order => ({
        ...order,
        order_type: determineOrderType(order.user_id, profilesMap),
        source_table: 'orders' as const
      }));

      const processedCustomerOrders = (customerOrdersResponse.data || []).map(order => ({
        ...order,
        order_type: 'customer' as const,
        source_table: 'customer_orders' as const
      }));

      const allOrders = [...processedOrders, ...processedCustomerOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('Orders fetched successfully:', allOrders.length);
      setOrders(allOrders);
    } catch (error) {
      console.error('Unexpected error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const determineOrderType = (userId: string | null, profilesMap: Map<string, string>): 'guest' | 'customer' | 'admin' => {
    if (!userId) return 'guest';
    const role = profilesMap.get(userId);
    return role === 'admin' ? 'admin' : 'customer';
  };

  const fetchOrderItemDetails = async (order: Order) => {
    const orderId = order.id;
    if (orderItemDetails[orderId]) return;

    try {
      const tableName = order.source_table === 'customer_orders' ? 'customer_order_item_details' : 'order_item_details';

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('order_id', orderId);

      if (!error && data) {
        setOrderItemDetails(prev => ({ ...prev, [orderId]: data }));
      }
    } catch (error) {
      console.error('Error fetching order item details:', error);
    }
  };

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    // Check if this is a cancellation and requires password confirmation
    if (newStatus === 'cancelled' && order.status !== 'cancelled') {
      setPendingStatusUpdate({ order, newStatus });
      setPasswordDialogOpen(true);
      return;
    }

    await performStatusUpdate(order, newStatus);
  };

  const performStatusUpdate = async (order: Order, newStatus: string) => {
    try {
      const oldStatus = order.status;
      const tableName = order.source_table === 'customer_orders' ? 'customer_orders' : 'orders';
      const isCustomerOrder = order.source_table === 'customer_orders';

      console.log(`Updating order status: ${oldStatus} -> ${newStatus} for ${order.order_number}`);
      console.log(`Order type: ${order.order_type}, Source table: ${order.source_table}`);

      // Update order status in database
      const { error } = await supabase
        .from(tableName)
        .update({
          status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) {
        console.error('Error updating order status:', error);
        toast({
          title: "Error",
          description: "Failed to update order status",
          variant: "destructive",
        });
        return;
      }

      // Handle stock changes based on status change
      console.log(`Processing stock changes for order status: ${oldStatus} -> ${newStatus}`);
      const stockUpdated = await handleOrderStatusUpdate(
        order.id,
        oldStatus,
        newStatus,
        isCustomerOrder
      );

      if (!stockUpdated) {
        console.error('Failed to update stock for order status change');
        toast({
          title: "Warning",
          description: "Order status updated but stock processing failed",
          variant: "destructive",
        });
      } else {
        console.log('Stock updated successfully for order status change');
      }

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      fetchOrders(true);
    } catch (error) {
      console.error('Unexpected error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handlePasswordConfirm = () => {
    if (pendingStatusUpdate) {
      performStatusUpdate(pendingStatusUpdate.order, pendingStatusUpdate.newStatus);
      setPendingStatusUpdate(null);
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

  const getOrderTypeColor = (orderType: string) => {
    switch (orderType) {
      case 'guest': return 'bg-gray-100 text-gray-800';
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (order: Order) => {
    if (order.source_table === 'customer_orders') {
      navigate(`/customer-order-summary/${order.id}`);
    } else {
      navigate(`/admin/order-summary/${order.id}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Button onClick={() => fetchOrders(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'pending_payment').length}</div>
            <p className="text-xs text-muted-foreground">Pending Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'delivered').length}</div>
            <p className="text-xs text-muted-foreground">Delivered Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{orders.filter(o => o.order_type === 'guest').length}</div>
            <p className="text-xs text-muted-foreground">Guest Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{orders.filter(o => o.order_type === 'customer').length}</div>
            <p className="text-xs text-muted-foreground">Customer Orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending_payment">Pending</TabsTrigger>
            <TabsTrigger value="payment_confirmed">Payment Confirmed</TabsTrigger>
            <TabsTrigger value="on_delivery">On Delivery</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
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
                <TableRow key={`${order.source_table}-${order.id}`}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-gray-600">{order.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getOrderTypeColor(order.order_type)}>
                      {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>Rs. {order.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-green-600">Rs. {order.paid_amount.toFixed(2)}</p>
                      {order.remaining_amount > 0 && (
                        <p className="text-sm text-orange-600">
                          Remaining: Rs. {order.remaining_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue>
                          <Badge className={getStatusColor(order.status)}>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders found</p>
              <Button onClick={() => fetchOrders(true)} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Orders
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Password Dialog */}
      <AdminPasswordDialog
        isOpen={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setPendingStatusUpdate(null);
        }}
        onConfirm={handlePasswordConfirm}
        title="Confirm Order Cancellation"
        message="This action cannot be undone. Order status cannot be changed after cancellation. Please enter your admin password to confirm."
        actionType="cancel_order"
      />
    </div>
  );
}
