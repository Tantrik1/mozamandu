
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Eye, Search, Filter, Gift, Tag, User, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Order {
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
  delivery_charge: number;
  subtotal: number;
  status: string;
  created_at: string;
  combo_applied: boolean;
  combo_details: any;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
  payment_notes: string | null;
  delivery_location: {
    place_name: string;
  } | null;
  payment_method: {
    name: string;
  } | null;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        contact_number,
        whatsapp_number,
        delivery_address,
        total_amount,
        paid_amount,
        remaining_amount,
        delivery_charge,
        subtotal,
        status,
        created_at,
        combo_applied,
        combo_details,
        promocode_used,
        promocode_discount,
        payment_screenshot_url,
        payment_notes,
        delivery_charges:delivery_location_id(place_name),
        payment_methods:payment_method_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } else {
      setOrders(data?.map(order => ({
        ...order,
        delivery_location: Array.isArray(order.delivery_charges) ? order.delivery_charges[0] : order.delivery_charges,
        payment_method: Array.isArray(order.payment_methods) ? order.payment_methods[0] : order.payment_methods
      })) || []);
    }
    setLoading(false);
  };

  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return; // Already fetched

    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (!error && data) {
      setOrderItems(prev => ({ ...prev, [orderId]: data }));
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
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
      fetchOrders();
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

  const getPricingModeIcon = (mode: string) => {
    switch (mode) {
      case 'combo': return <Gift className="w-3 h-3 text-purple-500" />;
      case 'discount': return <Tag className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  const getPricingModeLabel = (mode: string) => {
    switch (mode) {
      case 'combo': return 'Combo Price';
      case 'discount': return 'MOQ Discount';
      default: return 'Regular Price';
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
    return <div className="p-6">Loading orders...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Button onClick={fetchOrders}>Refresh</Button>
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
                  <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-green-600">${order.paid_amount.toFixed(2)}</p>
                      {order.remaining_amount > 0 && (
                        <p className="text-sm text-orange-600">
                          Remaining: ${order.remaining_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          <Badge className={getStatusColor(order.status)}>
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
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="grid lg:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-6">
                              {/* Customer Info */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center">
                                    <User className="w-5 h-5 mr-2" />
                                    Customer Information
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">{selectedOrder.customer_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span>{selectedOrder.customer_email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <span>{selectedOrder.contact_number}</span>
                                  </div>
                                  {selectedOrder.whatsapp_number && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-500" />
                                      <span>WhatsApp: {selectedOrder.whatsapp_number}</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Delivery Info */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center">
                                    <MapPin className="w-5 h-5 mr-2" />
                                    Delivery Information
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div>
                                    <p className="font-medium">{selectedOrder.delivery_location?.place_name}</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.delivery_address}</p>
                                    <p className="text-sm font-medium text-green-600 mt-1">
                                      Delivery Charge: ${selectedOrder.delivery_charge.toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    <p><strong>Order Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                                    <p><strong>Status:</strong> 
                                      <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                      </Badge>
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                              {/* Order Items with Detailed Breakdown */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Order Items & Pricing</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {orderItems[selectedOrder.id] && (
                                    <div className="space-y-4">
                                      {orderItems[selectedOrder.id].map((item) => (
                                        <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <h4 className="font-medium">{item.product_name}</h4>
                                              {item.color_name && (
                                                <p className="text-sm text-gray-600">Color: {item.color_name}</p>
                                              )}
                                              {item.size_name && (
                                                <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                                              )}
                                              <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm">Qty: {item.quantity}</span>
                                                <div className="flex items-center gap-1">
                                                  {getPricingModeIcon(item.pricing_mode)}
                                                  <Badge variant="outline" className="text-xs">
                                                    {getPricingModeLabel(item.pricing_mode)}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <p className="text-xs text-gray-500 mt-1">
                                                ${item.unit_price.toFixed(2)} each
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="font-medium">${item.total_price.toFixed(2)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      <Separator />
                                      
                                      {/* Price Breakdown */}
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span>Subtotal</span>
                                          <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Delivery Charge</span>
                                          <span>${selectedOrder.delivery_charge.toFixed(2)}</span>
                                        </div>
                                        {selectedOrder.promocode_discount > 0 && (
                                          <div className="flex justify-between text-green-600">
                                            <span>Promo Discount ({selectedOrder.promocode_used})</span>
                                            <span>-${selectedOrder.promocode_discount.toFixed(2)}</span>
                                          </div>
                                        )}
                                        <Separator />
                                        <div className="flex justify-between font-bold text-lg">
                                          <span>Total Amount</span>
                                          <span>${selectedOrder.total_amount.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Payment Information */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Payment Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p><strong>Payment Method:</strong></p>
                                      <p>{selectedOrder.payment_method?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p><strong>Payment Status:</strong></p>
                                      <p className={selectedOrder.remaining_amount > 0 ? 'text-orange-600' : 'text-green-600'}>
                                        {selectedOrder.remaining_amount > 0 ? 'Partial Payment' : 'Fully Paid'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p><strong>Paid Amount:</strong></p>
                                      <p className="text-green-600 font-medium">${selectedOrder.paid_amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p><strong>Remaining:</strong></p>
                                      <p className="text-orange-600 font-medium">${selectedOrder.remaining_amount.toFixed(2)}</p>
                                    </div>
                                  </div>

                                  {selectedOrder.combo_applied && (
                                    <div>
                                      <p><strong>Combo Applied:</strong> Yes</p>
                                      {selectedOrder.combo_details && (
                                        <p className="text-sm text-gray-600">
                                          {JSON.stringify(selectedOrder.combo_details)}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {selectedOrder.payment_notes && (
                                    <div>
                                      <p><strong>Payment Notes:</strong></p>
                                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedOrder.payment_notes}</p>
                                    </div>
                                  )}
                                  
                                  {selectedOrder.payment_screenshot_url && (
                                    <div>
                                      <p className="font-medium mb-2">Payment Screenshot:</p>
                                      <img
                                        src={selectedOrder.payment_screenshot_url}
                                        alt="Payment Screenshot"
                                        className="max-w-full h-auto border rounded-lg"
                                      />
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
