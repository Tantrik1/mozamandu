import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { restoreStockForOrder } from '@/utils/stockManagement';

interface CustomerOrder {
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
  user_id: string;
}

export function CustomerOrderManagement() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  const fetchCustomerOrders = async () => {
    setLoading(true);
    try {
      console.log('Fetching customer orders...');
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('customer_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching customer orders:', ordersError);
        toast({
          title: "Error",
          description: "Failed to fetch customer orders: " + ordersError.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched customer orders count:', ordersData?.length || 0);
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Unexpected error fetching customer orders:', error);
      toast({
        title: "Error",
        description: "Failed to load customer orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;
    
    // If changing to cancelled status, restore stock
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      try {
        console.log('Restoring stock for cancelled customer order...');
        
        // Fetch customer order items to restore stock
        const { data: orderItems, error: itemsError } = await supabase
          .from('customer_order_items')
          .select('product_id, color_variant_id, size_variant_id, quantity')
          .eq('order_id', orderId);

        if (itemsError) {
          console.error('Error fetching customer order items:', itemsError);
        } else if (orderItems) {
          await restoreStockForOrder(orderItems.map(item => ({
            productId: item.product_id,
            colorVariantId: item.color_variant_id,
            sizeVariantId: item.size_variant_id,
            quantity: item.quantity
          })));
          console.log('Stock restored successfully for customer order');
        }
      } catch (stockError) {
        console.error('Error restoring stock for customer order:', stockError);
        toast({
          title: "Stock Restoration Error",
          description: "Order was cancelled but stock could not be restored. Please check manually.",
          variant: "destructive",
        });
      }
    }
    
    setUpdating(orderId);
    try {
      console.log('Updating customer order status:', orderId, 'to', newStatus);
      
      const { error } = await supabase
        .from('customer_orders')
        .update({ 
          status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating customer order status:', error);
        toast({
          title: "Error",
          description: "Failed to update order status: " + error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Customer order status updated successfully');
      toast({
        title: "Success",
        description: newStatus === 'cancelled' ? 
          "Order cancelled successfully and stock has been restored" : 
          "Order status updated successfully",
      });
      
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled' }
          : order
      ));

      // Send status update email
      try {
        console.log('Sending customer order status update email...');
        const { error: emailError } = await supabase.functions.invoke('send-order-email', {
          body: {
            type: 'status_updated',
            orderId: orderId,
            isCustomerOrder: true, // This is for customer orders
            oldStatus: oldStatus,
            newStatus: newStatus
          }
        });

        if (emailError) {
          console.error('Status update email failed:', emailError);
        } else {
          console.log('Status update email sent successfully');
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

    } catch (error) {
      console.error('Unexpected error updating customer order status:', error);
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

  const handleViewOrder = (orderId: string) => {
    navigate(`/customer-order-summary/${orderId}`);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOrderStats = () => {
    const totalOrders = orders.length;
    const pendingPayment = orders.filter(o => o.status === 'pending_payment').length;
    const confirmed = orders.filter(o => o.status === 'payment_confirmed').length;
    const onDelivery = orders.filter(o => o.status === 'on_delivery').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    return { totalOrders, pendingPayment, confirmed, onDelivery, delivered, totalRevenue };
  };

  const stats = getOrderStats();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading customer orders...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Order Management</h1>
        <Button onClick={fetchCustomerOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayment}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.onDelivery}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rs. {stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by order number, customer name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No customer orders found matching your criteria.
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
