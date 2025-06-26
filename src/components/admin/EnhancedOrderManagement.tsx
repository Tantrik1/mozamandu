import { useState, useEffect } from 'react';
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
import { OrderSummaryCard } from '@/components/shared/OrderSummaryCard';
import { BaseOrder, OrderItem, OrderStatus } from '@/types/order';

export function EnhancedOrderManagement() {
  const [orders, setOrders] = useState<BaseOrder[]>([]);
  const [orderItems, setOrderItems] = useState<{ [key: string]: OrderItem[] }>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<BaseOrder | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log('Fetching orders...');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
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
        // Cast the data to BaseOrder type to handle database type mismatch
        setOrders((data || []).map(order => ({
          ...order,
          status: order.status as OrderStatus
        })));
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

  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return;

    try {
      console.log('Fetching order items for:', orderId);
      const { data, error } = await supabase
        .from('order_item_details')
        .select('*')
        .eq('order_id', orderId);

      if (error) {
        console.error('Error fetching order items:', error);
      } else {
        console.log('Fetched order items:', data?.length || 0);
        setOrderItems(prev => ({ ...prev, [orderId]: data || [] }));
      }
    } catch (error) {
      console.error('Unexpected error fetching order items:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(orderId);
    try {
      console.log('Updating order status:', orderId, 'to', newStatus);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus, 
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
            ? { ...order, status: newStatus }
            : order
        ));
        
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = async (order: BaseOrder) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
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
      <div className="grid md:grid-cols-5 gap-4">
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
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter(o => o.remaining_amount > 0).length}
            </div>
            <div className="text-sm text-gray-600">Partial Payments</div>
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
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="in_delivery">In Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
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
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
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
                    {order.remaining_amount > 0 ? (
                      <div className="text-sm">
                        <div className="text-green-600 font-medium">
                          Rs. {order.paid_amount.toFixed(2)} ({order.payment_percentage}%)
                        </div>
                        <div className="text-orange-600">
                          Due: Rs. {order.remaining_amount.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        Fully Paid
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>Rs. {Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
                      disabled={updating === order.id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue>
                          <Badge className={getStatusColor(order.status)}>
                            {updating === order.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            {getStatusLabel(order.status)}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_payment">Pending Payment</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="in_delivery">In Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
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
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <OrderSummaryCard 
                            orderDetails={selectedOrder}
                            orderItems={orderItems[selectedOrder.id] || []}
                            showActions={false}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
