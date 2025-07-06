import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Copy,
  Edit,
  PackageCheck,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Eye,
  Package,
  Ban,
  CheckCircle2,
  Clock4,
  Truck,
  AlertCircle,
  FileText,
  CreditCard,
  Wallet,
  Contact2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  updateOrderStatus,
  rollbackStockReservations
} from '@/utils/inventoryManager';

interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  shipping_method: string;
  order_notes: string;
  user_id: string | null;
  contact_number: string;
  delivery_address: string;
}

interface CustomerOrder {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  total_amount: number;
  payment_method: string;
  shipping_method: string;
  order_notes: string;
  user_id: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_inventory_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CustomerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_inventory_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface DataTableColumnHeaderProps<TData, TValue> {
  column: {
    id: string;
    title: string;
    accessorKey?: string;
    cell?: (info: { row: { original: TData } }) => JSX.Element;
  };
  onSort: (columnId: string, direction: 'asc' | 'desc') => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
}

function DataTableColumnHeader<TData, TValue>({
  column,
  onSort,
  sortColumn,
  sortDirection,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const isSorted = sortColumn === column.id && !!sortDirection;

  const handleClick = () => {
    if (isSorted) {
      onSort(column.id, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(column.id, 'asc');
    }
  };

  return (
    <TableHead className="cursor-pointer" onClick={handleClick}>
      <div className="flex items-center">
        {column.title}
        {isSorted && (
          <ChevronsUpDown
            className={cn(
              'ml-auto h-4 w-4',
              sortDirection === 'desc' ? 'rotate-0' : 'rotate-180'
            )}
          />
        )}
      </div>
    </TableHead>
  );
}

interface Filter {
  status?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  dateRange?: DateRange | undefined;
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerOrderItems, setCustomerOrderItems] = useState<CustomerOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomerOrder, setSelectedCustomerOrder] = useState<CustomerOrder | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isCustomerOrderDetailsOpen, setIsCustomerOrderDetailsOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>({});
  const [isCustomerOrderView, setIsCustomerOrderView] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
  const [shippingMethodFilter, setShippingMethodFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isBulkStatusUpdateDialogOpen, setIsBulkStatusUpdateDialogOpen] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<string>('');
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isNewStatusDialogOpen, setIsNewStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch guest orders - map the response to match our interface
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setError('Failed to fetch orders');
      } else {
        // Map database fields to our interface
        const mappedOrders = (ordersData || []).map(order => ({
          ...order,
          customer_phone: order.contact_number,
          customer_address: order.delivery_address,
          payment_method: order.payment_method_id || 'unknown',
          shipping_method: 'standard',
          order_notes: order.whatsapp_number || ''
        }));
        setOrders(mappedOrders);
      }

      // Fetch customer orders - map the response to match our interface
      const { data: customerOrdersData, error: customerOrdersError } = await supabase
        .from('customer_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerOrdersError) {
        console.error('Error fetching customer orders:', customerOrdersError);
        setError('Failed to fetch customer orders');
      } else {
        // Map database fields to our interface
        const mappedCustomerOrders = (customerOrdersData || []).map(order => ({
          ...order,
          payment_method: order.payment_method_id || 'unknown',
          shipping_method: 'standard',
          order_notes: order.whatsapp_number || ''
        }));
        setCustomerOrders(mappedCustomerOrders);
      }

      // Fetch order items - map the response to match our interface
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*');

      if (orderItemsError) {
        console.error('Error fetching order items:', orderItemsError);
        setError('Failed to fetch order items');
      } else {
        // Map database fields to our interface (add default values for missing fields)
        const mappedOrderItems = (orderItemsData || []).map(item => ({
          ...item,
          unit_price: 0, // Default value
          total_price: 0  // Default value
        }));
        setOrderItems(mappedOrderItems);
      }

      // Fetch customer order items - map the response to match our interface
      const { data: customerOrderItemsData, error: customerOrderItemsError } = await supabase
        .from('customer_order_items')
        .select('*');

      if (customerOrderItemsError) {
        console.error('Error fetching customer order items:', customerOrderItemsError);
        setError('Failed to fetch customer order items');
      } else {
        // Map database fields to our interface (add default values for missing fields)
        const mappedCustomerOrderItems = (customerOrderItemsData || []).map(item => ({
          ...item,
          unit_price: 0, // Default value
          total_price: 0  // Default value
        }));
        setCustomerOrderItems(mappedCustomerOrderItems);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onSort = (columnId: string, direction: 'asc' | 'desc') => {
    setSortColumn(columnId);
    setSortDirection(direction);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValue = a[sortColumn as keyof Order];
    const bValue = b[sortColumn as keyof Order];

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredOrders = sortedOrders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesPaymentMethod = !paymentMethodFilter || order.payment_method === paymentMethodFilter;
    const matchesShippingMethod = !shippingMethodFilter || order.shipping_method === shippingMethodFilter;

    const matchesDateRange = !dateRange?.from || !dateRange?.to ||
      (new Date(order.created_at) >= dateRange.from && new Date(order.created_at) <= dateRange.to);

    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesShippingMethod && matchesDateRange;
  });

  const sortedCustomerOrders = [...customerOrders].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValue = a[sortColumn as keyof CustomerOrder];
    const bValue = b[sortColumn as keyof CustomerOrder];

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredCustomerOrders = sortedCustomerOrders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesPaymentMethod = !paymentMethodFilter || order.payment_method === paymentMethodFilter;
    const matchesShippingMethod = !shippingMethodFilter || order.shipping_method === shippingMethodFilter;

    const matchesDateRange = !dateRange?.from || !dateRange?.to ||
      (new Date(order.created_at) >= dateRange.from && new Date(order.created_at) <= dateRange.to);

    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesShippingMethod && matchesDateRange;
  });

  const handleCancelOrder = async (orderId: string, isCustomerOrder: boolean = false) => {
    try {
      const success = await updateOrderStatus(orderId, 'cancelled', isCustomerOrder);
    
      if (success) {
        // Reload orders after successful cancellation
        await loadOrders();
        toast({
          title: 'Success',
          description: 'Order cancelled successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to cancel order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Error',
        description: 'Error cancelling order',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmOrder = async (orderId: string, isCustomerOrder: boolean = false) => {
    try {
      const success = await updateOrderStatus(orderId, 'confirmed', isCustomerOrder);
      if (success) {
        await loadOrders();
        toast({
          title: 'Success',
          description: 'Order confirmed successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to confirm order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      toast({
        title: 'Error',
        description: 'Error confirming order',
        variant: 'destructive',
      });
    }
  };

  const handleShipOrder = async (orderId: string, isCustomerOrder: boolean = false) => {
    try {
      const success = await updateOrderStatus(orderId, 'shipped', isCustomerOrder);
      if (success) {
        await loadOrders();
        toast({
          title: 'Success',
          description: 'Order shipped successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to ship order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error shipping order:', error);
      toast({
        title: 'Error',
        description: 'Error shipping order',
        variant: 'destructive',
      });
    }
  };

  const handleDeliverOrder = async (orderId: string, isCustomerOrder: boolean = false) => {
    try {
      const success = await updateOrderStatus(orderId, 'delivered', isCustomerOrder);
      if (success) {
        await loadOrders();
        toast({
          title: 'Success',
          description: 'Order delivered successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to deliver order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error delivering order:', error);
      toast({
        title: 'Error',
        description: 'Error delivering order',
        variant: 'destructive',
      });
    }
  };

  const handleRefundOrder = async (orderId: string, isCustomerOrder: boolean = false) => {
    try {
      const success = await updateOrderStatus(orderId, 'refunded', isCustomerOrder);
      if (success) {
        await loadOrders();
        toast({
          title: 'Success',
          description: 'Order refunded successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to refund order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error refunding order:', error);
      toast({
        title: 'Error',
        description: 'Error refunding order',
        variant: 'destructive',
      });
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, newStatus: string, isCustomerOrder: boolean = false) => {
    try {
      const success = await updateOrderStatus(orderId, newStatus, isCustomerOrder);
      if (success) {
        await loadOrders();
        toast({
          title: 'Success',
          description: `Order status updated to ${newStatus} successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update order status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Error updating order status',
        variant: 'destructive',
      });
    }
  };

  const handleBulkStatusUpdate = async () => {
    try {
      for (const orderId of selectedOrders) {
        await updateOrderStatus(orderId, bulkUpdateStatus, isCustomerOrderView);
      }
      await loadOrders();
      toast({
        title: 'Success',
        description: `Updated status to ${bulkUpdateStatus} for ${selectedOrders.length} orders`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Error updating order status',
        variant: 'destructive',
      });
    } finally {
      setIsBulkStatusUpdateDialogOpen(false);
      setIsBulkActionsOpen(false);
      setSelectedOrders([]);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const orderId of selectedOrders) {
        if (isCustomerOrderView) {
          await supabase.from('customer_orders').delete().eq('id', orderId);
        } else {
          await supabase.from('orders').delete().eq('id', orderId);
        }
      }
      await loadOrders();
      toast({
        title: 'Success',
        description: `Deleted ${selectedOrders.length} orders`,
      });
    } catch (error) {
      console.error('Error deleting orders:', error);
      toast({
        title: 'Error',
        description: 'Error deleting orders',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleteDialogOpen(false);
      setIsBulkActionsOpen(false);
      setSelectedOrders([]);
    }
  };

  const handleCreateNewStatus = async () => {
    try {
      for (const orderId of selectedOrders) {
        await updateOrderStatus(orderId, newStatus, isCustomerOrderView);
      }
      await loadOrders();
      toast({
        title: 'Success',
        description: `Updated status to ${newStatus} for ${selectedOrders.length} orders`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Error updating order status',
        variant: 'destructive',
      });
    } finally {
      setIsNewStatusDialogOpen(false);
      setIsBulkActionsOpen(false);
      setSelectedOrders([]);
    }
  };

  const handleToggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleToggleSelectAllOrders = () => {
    if (isCustomerOrderView) {
      if (selectedOrders.length === filteredCustomerOrders.length) {
        setSelectedOrders([]);
      } else {
        setSelectedOrders(filteredCustomerOrders.map(order => order.id));
      }
    } else {
      if (selectedOrders.length === filteredOrders.length) {
        setSelectedOrders([]);
      } else {
        setSelectedOrders(filteredOrders.map(order => order.id));
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Clock4 className="h-4 w-4 text-gray-500" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock4 className="h-4 w-4 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <PackageCheck className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'refunded':
        return <CreditCard className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPaymentMethodIcon = (paymentMethod: string) => {
    switch (paymentMethod) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4 text-gray-500" />;
      case 'wallet':
        return <Wallet className="h-4 w-4 text-gray-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const getShippingMethodIcon = (shippingMethod: string) => {
    switch (shippingMethod) {
      case 'standard':
        return <Package className="h-4 w-4 text-gray-500" />;
      case 'express':
        return <Truck className="h-4 w-4 text-gray-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getContactInfoIcon = (contactInfo: string) => {
    switch (contactInfo) {
      case 'customer_name':
        return <Contact2 className="h-4 w-4 text-gray-500" />;
      case 'customer_email':
        return <Mail className="h-4 w-4 text-gray-500" />;
      case 'customer_phone':
        return <Phone className="h-4 w-4 text-gray-500" />;
      case 'customer_address':
        return <MapPin className="h-4 w-4 text-gray-500" />;
      default:
        return <Contact2 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <Button variant="outline" onClick={loadOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Manage and view all orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsCustomerOrderView(!isCustomerOrderView)}>
                {isCustomerOrderView ? 'Switch to Guest Orders' : 'Switch to Customer Orders'}
              </Button>
              <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Filter Orders</DialogTitle>
                    <DialogDescription>
                      Filter orders based on various criteria
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All statuses</SelectItem>
                          <SelectItem value="pending_payment">Pending Payment</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method">Payment Method</Label>
                      <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All payment methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All payment methods</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping-method">Shipping Method</Label>
                      <Select value={shippingMethodFilter} onValueChange={setShippingMethodFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All shipping methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All shipping methods</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="express">Express</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-[300px] justify-start text-left font-normal',
                              !dateRange?.from && 'text-muted-foreground'
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, 'LLL dd, y')} -{' '}
                                  {format(dateRange.to, 'LLL dd, y')}
                                </>
                              ) : (
                                format(dateRange.from, 'LLL dd, y')
                              )
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : (
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isCustomerOrderView ? filteredCustomerOrders : filteredOrders).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell>
                        {isCustomerOrderView ? 
                          (order as CustomerOrder).user_id : 
                          (order as Order).customer_name
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleConfirmOrder(order.id, isCustomerOrderView)}
                            disabled={order.status !== 'pending_payment'}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleShipOrder(order.id, isCustomerOrderView)}
                            disabled={order.status !== 'confirmed'}
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelOrder(order.id, isCustomerOrderView)}
                            disabled={['delivered', 'cancelled', 'refunded'].includes(order.status)}
                          >
                            <Ban className="h-4 w-4" />
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
    </div>
  );
}
