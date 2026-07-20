
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { Eye, CheckCircle, XCircle, Package, Truck } from 'lucide-react';

interface CustomerOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  delivery_address: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled';
  created_at: string;
  payment_screenshot_url?: string;
}

export function CustomerOrderManagement() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const { toast } = useToast();
  const { reserveStock, releaseStock, fulfillStock } = useInventoryManager();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as CustomerOrder[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('customer_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Handle inventory operations based on status change
      if (newStatus === 'payment_confirmed') {
        console.log('🔒 Reserving stock for order:', orderId);
        try {
          await reserveStock(orderId);
          toast({
            title: 'Success',
            description: 'Order status updated and stock reserved successfully',
          });
        } catch (stockError) {
          console.error('Stock reservation failed:', stockError);
          toast({
            title: 'Warning',
            description: 'Order updated but stock reservation failed. Please check inventory.',
            variant: 'destructive',
          });
        }
      } else if (newStatus === 'delivered') {
        console.log('📦 Fulfilling stock for order:', orderId);
        try {
          await fulfillStock(orderId);
          toast({
            title: 'Success',
            description: 'Order delivered and inventory updated successfully',
          });
        } catch (stockError) {
          console.error('Stock fulfillment failed:', stockError);
          toast({
            title: 'Warning',
            description: 'Order marked as delivered but inventory update failed.',
            variant: 'destructive',
          });
        }
      } else if (newStatus === 'cancelled') {
        console.log('🔓 Releasing reserved stock for order:', orderId);
        try {
          await releaseStock(orderId);
          toast({
            title: 'Success',
            description: 'Order cancelled and reserved stock released',
          });
        } catch (stockError) {
          console.error('Stock release failed:', stockError);
          toast({
            title: 'Warning',
            description: 'Order cancelled but stock release failed.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Success',
          description: 'Order status updated successfully',
        });
      }

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'secondary';
      case 'payment_confirmed':
        return 'default';
      case 'on_delivery':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusActions = (order: CustomerOrder) => {
    const actions = [];
    
    switch (order.status) {
      case 'pending_payment':
        actions.push(
          <Button
            key="confirm"
            size="sm"
            onClick={() => updateOrderStatus(order.id, 'payment_confirmed')}
            className="mr-2"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Confirm Payment
          </Button>
        );
        actions.push(
          <Button
            key="cancel"
            size="sm"
            variant="destructive"
            onClick={() => updateOrderStatus(order.id, 'cancelled')}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        );
        break;
      case 'payment_confirmed':
        actions.push(
          <Button
            key="ship"
            size="sm"
            onClick={() => updateOrderStatus(order.id, 'on_delivery')}
            className="mr-2"
          >
            <Truck className="h-4 w-4 mr-1" />
            Mark as On Delivery
          </Button>
        );
        break;
      case 'on_delivery':
        actions.push(
          <Button
            key="deliver"
            size="sm"
            onClick={() => updateOrderStatus(order.id, 'delivered')}
            className="mr-2"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark as Delivered
          </Button>
        );
        break;
    }
    
    return actions;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading orders...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customer Order Management</h2>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{order.order_number}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.customer_name} • {order.customer_email}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusColor(order.status)}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <p className="text-lg font-semibold mt-2">Rs {order.total_amount}</p>
                  {order.remaining_amount > 0 && (
                    <p className="text-sm text-orange-600">
                      Remaining: Rs {order.remaining_amount}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Contact: {order.contact_number}
                  </p>
                  <p className="text-sm text-gray-600">
                    Address: {order.delivery_address}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  {getStatusActions(order)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      )}
    </div>
  );
}
