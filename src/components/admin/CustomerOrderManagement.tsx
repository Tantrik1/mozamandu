import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, RefreshCw } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useOrderStockManagement } from '@/hooks/useOrderStockManagement';

type OrderStatus = 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled';

interface CustomerOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: OrderStatus;
  created_at: string;
  delivery_address: string;
  payment_method_id: string | null;
}

export function CustomerOrderManagement() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const { handleOrderStatusChange, processing: stockProcessing } = useOrderStockManagement();

  const fetchCustomerOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_orders')
        .select(`
          *,
          payment_methods!left (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingOrder(orderId);
      
      // Get current order to know old status
      const currentOrder = orders.find(order => order.id === orderId);
      const oldStatus = currentOrder?.status || 'pending_payment';
      
      console.log('Updating customer order status:', { orderId, oldStatus, newStatus });
      
      // Update order status in database
      const { error } = await supabase
        .from('customer_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      // Handle stock changes based on status change
      const stockSuccess = await handleOrderStatusChange(orderId, newStatus, oldStatus, true);
      
      if (!stockSuccess) {
        console.warn('Stock operation had issues, but order status was updated');
      }

      // Refresh orders list
      await fetchCustomerOrders();
      
      toast({
        title: "Order Updated",
        description: "Customer order status has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating customer order:', error);
      toast({
        title: "Error",
        description: "Failed to update customer order status",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'payment_confirmed':
      case 'on_delivery':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading customer orders...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Orders</h1>
          <p className="text-gray-600">Manage orders from registered customers</p>
        </div>
        <Button 
          onClick={fetchCustomerOrders} 
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.order_number}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customer_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.contact_number}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Total: ${order.total_amount}</div>
                      <div>Paid: ${order.paid_amount}</div>
                      {order.remaining_amount > 0 && (
                        <div className="text-red-600">
                          Remaining: ${order.remaining_amount}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Select
                        value={order.status}
                        onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
                        disabled={updatingOrder === order.id || stockProcessing}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending_payment">Pending Payment</SelectItem>
                          <SelectItem value="payment_confirmed">Payment Confirmed</SelectItem>
                          <SelectItem value="on_delivery">On Delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      {(updatingOrder === order.id || stockProcessing) && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="mt-1">
                      {order.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`/customer-order-summary/${order.id}`, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No customer orders found</p>
        </div>
      )}
    </div>
  );
}
