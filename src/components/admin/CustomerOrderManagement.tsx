
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Search, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  combo_applied: boolean;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
  user_id: string;
  delivery_address: string;
  delivery_charge: number;
  subtotal: number;
}

interface CustomerOrderItemDetail {
  id: string;
  product_name: string;
  color_name: string | null;
  size_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  pricing_mode: string;
}

export function CustomerOrderManagement() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [orderItemDetails, setOrderItemDetails] = useState<{ [key: string]: CustomerOrderItemDetail[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  const fetchCustomerOrders = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      console.log('Fetching customer orders for admin dashboard...');
      
      const { data, error } = await supabase
        .from('customer_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch customer orders",
          variant: "destructive",
        });
      } else {
        console.log('Customer orders fetched successfully:', data?.length || 0);
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching customer orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOrderItemDetails = async (orderId: string) => {
    if (orderItemDetails[orderId]) return;

    try {
      const { data, error } = await supabase
        .from('customer_order_item_details')
        .select('*')
        .eq('order_id', orderId);

      if (!error && data) {
        setOrderItemDetails(prev => ({ ...prev, [orderId]: data }));
      }
    } catch (error) {
      console.error('Error fetching customer order item details:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
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
          description: "Failed to update order status",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Order status updated successfully",
        });
        fetchCustomerOrders(true);
      }
    } catch (error) {
      console.error('Unexpected error updating customer order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = async (order: CustomerOrder) => {
    setSelectedOrder(order);
    await fetchOrderItemDetails(order.id);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading customer orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Order Management</h1>
        <Button onClick={() => fetchCustomerOrders(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Total Customer Orders</p>
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
            <div className="text-2xl font-bold">{orders.filter(o => o.combo_applied).length}</div>
            <p className="text-xs text-muted-foreground">Combo Orders</p>
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
                  <TableCell className="font-medium">
                    <div>
                      {order.order_number}
                      {order.combo_applied && (
                        <Badge variant="outline" className="ml-2 text-xs">Combo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-gray-600">{order.customer_email}</p>
                    </div>
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
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
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
                          <DialogTitle>Customer Order Details - {selectedOrder?.order_number}</DialogTitle>
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
                                  <p><strong>Customer Type:</strong> <Badge className="ml-2">Registered</Badge></p>
                                </div>
                                <div>
                                  <p><strong>Order Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                                  <p><strong>Status:</strong> 
                                    <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                                      {selectedOrder.status.replace('_', ' ')}
                                    </Badge>
                                  </p>
                                  <p><strong>Delivery Address:</strong></p>
                                  <p className="text-sm text-gray-600">{selectedOrder.delivery_address}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Order Items */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Order Items</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {orderItemDetails[selectedOrder.id] && (
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
                                      {orderItemDetails[selectedOrder.id].map((item) => (
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
                                          <TableCell>Rs. {item.unit_price.toFixed(2)}</TableCell>
                                          <TableCell>Rs. {item.total_price.toFixed(2)}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline">
                                              {item.pricing_mode}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
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
                                    <p><strong>Subtotal:</strong> Rs. {selectedOrder.subtotal.toFixed(2)}</p>
                                    <p><strong>Delivery Charge:</strong> Rs. {selectedOrder.delivery_charge.toFixed(2)}</p>
                                    <p><strong>Total Amount:</strong> Rs. {selectedOrder.total_amount.toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p><strong>Paid Amount:</strong> Rs. {selectedOrder.paid_amount.toFixed(2)}</p>
                                    <p><strong>Remaining:</strong> Rs. {selectedOrder.remaining_amount.toFixed(2)}</p>
                                    {selectedOrder.combo_applied && (
                                      <p><strong>Combo Applied:</strong> Yes</p>
                                    )}
                                    {selectedOrder.promocode_used && (
                                      <div>
                                        <p><strong>Promo Code:</strong> {selectedOrder.promocode_used}</p>
                                        <p><strong>Discount:</strong> Rs. {selectedOrder.promocode_discount.toFixed(2)}</p>
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
            </TableBody>
          </Table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No customer orders found</p>
              <Button onClick={() => fetchCustomerOrders(true)} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Orders
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
