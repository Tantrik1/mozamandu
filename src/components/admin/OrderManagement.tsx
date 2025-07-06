import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Edit,
  Eye,
  Package,
  Search,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  updateOrderStatus,
  rollbackStockReservations,
} from '@/utils/inventoryManager';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  delivery_address: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  product_inventory?: {
    product_name: string;
    color_name: string | null;
    size_name: string | null;
    sku: string;
  };
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product_inventory (
              product_name,
              color_name,
              size_name,
              sku
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contact_number.includes(searchQuery);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        toast.success('Order status updated successfully');
        fetchOrders();
      } else {
        toast.error(result.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const statusResult = await updateOrderStatus(orderId, 'cancelled');
      if (statusResult.success) {
        const rollbackSuccess = await rollbackStockReservations(orderId);
        if (rollbackSuccess) {
          toast.success('Order cancelled and stock released');
        } else {
          toast.warning('Order cancelled but stock rollback failed');
        }
        fetchOrders();
      } else {
        toast.error(statusResult.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return (
          <Badge variant="secondary">
            <Clock className="h-4 w-4 mr-2" />
            Pending Payment
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default">
            <Truck className="h-4 w-4 mr-2" />
            Processing
          </Badge>
        );
      case 'shipped':
        return (
          <Badge variant="default">
            <Truck className="h-4 w-4 mr-2" />
            Shipped
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="success">
            <CheckCircle className="h-4 w-4 mr-2" />
            Delivered
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="h-4 w-4 mr-2" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter orders by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{order.customer_email}</TableCell>
                      <TableCell>Rs. {order.total_amount}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'MMM dd, yyyy hh:mm a')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setNewStatus(order.status);
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Details */}
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View detailed information about the order.
            </DialogDescription>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Order ID:</span> {viewingOrder.id}
              </div>
              <div>
                <span className="font-semibold">Customer Name:</span>{' '}
                {viewingOrder.customer_name}
              </div>
              <div>
                <span className="font-semibold">Customer Email:</span>{' '}
                {viewingOrder.customer_email}
              </div>
              <div>
                <span className="font-semibold">Contact Number:</span>{' '}
                {viewingOrder.contact_number}
              </div>
              <div>
                <span className="font-semibold">Delivery Address:</span>{' '}
                {viewingOrder.delivery_address}
              </div>
              <div>
                <span className="font-semibold">Total Amount:</span> Rs.{' '}
                {viewingOrder.total_amount}
              </div>
              <div>
                <span className="font-semibold">Payment Method:</span>{' '}
                {viewingOrder.payment_method}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{' '}
                {getStatusBadge(viewingOrder.status)}
              </div>
              <div>
                <span className="font-semibold">Order Date:</span>{' '}
                {format(new Date(viewingOrder.created_at), 'MMM dd, yyyy hh:mm a')}
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold">Order Items</h3>
                {viewingOrder.order_items && viewingOrder.order_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingOrder.order_items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.product_inventory?.product_name}
                            {item.product_inventory?.color_name &&
                              ` - ${item.product_inventory?.color_name}`}
                            {item.product_inventory?.size_name &&
                              ` - ${item.product_inventory?.size_name}`}
                          </TableCell>
                          <TableCell>{item.product_inventory?.sku}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p>No items in this order.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Order Status Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Choose the new status for the order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="status">Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            {newStatus === 'cancelled' ? (
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedOrderId) {
                    handleCancelOrder(selectedOrderId);
                    setIsUpdateDialogOpen(false);
                  }
                }}
              >
                Cancel Order
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (selectedOrderId) {
                    handleStatusUpdate(selectedOrderId, newStatus);
                    setIsUpdateDialogOpen(false);
                  }
                }}
              >
                Update Status
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
