
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

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
  combo_applied: boolean;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
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
}

export function EnhancedOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<{ [key: string]: OrderItem[] }>({});
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
      console.log('Fetching orders...');
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
          payment_screenshot_url
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

  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return; // Already fetched

    try {
      console.log('Fetching order items for:', orderId);
      const { data, error } = await supabase
        .from('order_items')
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
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
        
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        ));
        
        // Also update selected order if it's the one being updated
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
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

  const handleViewOrder = async (order: Order) => {
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
              {orders.filter(o => o.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
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
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
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
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          <Badge className={getStatusColor(order.status)}>
                            {updating === order.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            {order.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
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
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-6">
                            {/* Customer Info */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Customer Information</CardTitle>
                              </CardHeader>
                              <CardContent className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                                  <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                                  <p><strong>Contact:</strong> {selectedOrder.contact_number}</p>
                                </div>
                                <div>
                                  <p><strong>Order Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                                  <p><strong>Status:</strong> 
                                    <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                                      {selectedOrder.status}
                                    </Badge>
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Order Items */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Order Items</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {orderItems[selectedOrder.id] ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Unit Price</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Type</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {orderItems[selectedOrder.id].map((item) => (
                                        <TableRow key={item.id}>
                                          <TableCell>
                                            <div>
                                              <p className="font-medium">{item.product_name}</p>
                                              {item.color_name && (
                                                <p className="text-sm text-gray-600">Color: {item.color_name}</p>
                                              )}
                                              {item.size_name && (
                                                <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell>{item.quantity}</TableCell>
                                          <TableCell>Rs. {Number(item.unit_price).toFixed(2)}</TableCell>
                                          <TableCell>Rs. {Number(item.total_price).toFixed(2)}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline">
                                              {item.pricing_mode}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="flex items-center justify-center py-4">
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    Loading order items...
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Payment Info */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Payment Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <p><strong>Total Amount:</strong> Rs. {Number(selectedOrder.total_amount).toFixed(2)}</p>
                                    <p><strong>Paid Amount:</strong> Rs. {Number(selectedOrder.paid_amount).toFixed(2)}</p>
                                    <p><strong>Remaining:</strong> Rs. {Number(selectedOrder.remaining_amount).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    {selectedOrder.combo_applied && (
                                      <p><strong>Combo Applied:</strong> Yes</p>
                                    )}
                                    {selectedOrder.promocode_used && (
                                      <div>
                                        <p><strong>Promo Code:</strong> {selectedOrder.promocode_used}</p>
                                        <p><strong>Discount:</strong> Rs. {Number(selectedOrder.promocode_discount).toFixed(2)}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {selectedOrder.payment_screenshot_url && (
                                  <div>
                                    <h4 className="font-medium mb-2">Payment Screenshot:</h4>
                                    <img
                                      src={selectedOrder.payment_screenshot_url}
                                      alt="Payment Screenshot"
                                      className="max-w-md border rounded-lg"
                                    />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
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
