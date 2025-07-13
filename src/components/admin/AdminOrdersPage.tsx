
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AdminOrdersStats } from './AdminOrdersStats';
import { AdminOrdersFilters } from './AdminOrdersFilters';
import { AdminOrdersTable } from './AdminOrdersTable';

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
  user_id: string | null;
  user_role?: string;
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log('Fetching all customer orders...');
      
      // Fetch all customer orders from the unified table
      const { data: ordersData, error: ordersError } = await supabase
        .from('customer_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching customer orders:', ordersError);
        toast({
          title: "Error",
          description: "Failed to fetch orders: " + ordersError.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched customer orders count:', ordersData?.length || 0);

      // Get unique user IDs that are not null
      const userIds = ordersData
        ?.filter(order => order.user_id)
        .map(order => order.user_id)
        .filter((id, index, array) => array.indexOf(id) === index) || [];
      
      let profilesMap: { [key: string]: { role: string } } = {};
      
      // Only fetch profiles if we have user IDs
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, role')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          } else {
            // Create a map for quick lookup
            profilesMap = (profiles || []).reduce((acc, profile) => {
              acc[profile.id] = { role: profile.role };
              return acc;
            }, {} as { [key: string]: { role: string } });
          }
        } catch (profileError) {
          console.error('Profile fetch failed:', profileError);
        }
      }

      // Transform orders with profile data
      const transformedOrders = ordersData?.map(order => ({
        ...order,
        user_role: order.user_id ? profilesMap[order.user_id]?.role || 'customer' : null
      })) || [];

      console.log('Final transformed orders:', transformedOrders.length);
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Unexpected error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      console.log('Updating order status:', orderId, 'to', newStatus);
      
      const { error } = await supabase
        .from('customer_orders')
        .update({ 
          status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled', 
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
        const inventoryMessage = (newStatus === 'delivered' || newStatus === 'cancelled') 
          ? ' Inventory changes have been applied automatically.' 
          : '';
          
        toast({
          title: "Success",
          description: `Order status updated to ${newStatus.replace('_', ' ')}.${inventoryMessage}`,
        });
        
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus as 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled' }
            : order
        ));
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading orders...
      </div>
    );
  }

  // Helper function to get orders by status
  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => {
      const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && (status === 'all' || order.status === status);
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Button onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <AdminOrdersStats orders={orders} />
      
      <AdminOrdersFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            All Orders ({getOrdersByStatus('all').length})
          </TabsTrigger>
          <TabsTrigger value="pending_payment">
            Pending ({getOrdersByStatus('pending_payment').length})
          </TabsTrigger>
          <TabsTrigger value="payment_confirmed">
            Confirmed ({getOrdersByStatus('payment_confirmed').length})
          </TabsTrigger>
          <TabsTrigger value="on_delivery">
            On Delivery ({getOrdersByStatus('on_delivery').length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Delivered ({getOrdersByStatus('delivered').length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({getOrdersByStatus('cancelled').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Orders ({getOrdersByStatus('all').length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminOrdersTable
                orders={orders}
                filteredOrders={getOrdersByStatus('all')}
                updating={updating}
                onUpdateStatus={updateOrderStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending_payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payment Orders ({getOrdersByStatus('pending_payment').length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminOrdersTable
                orders={orders}
                filteredOrders={getOrdersByStatus('pending_payment')}
                updating={updating}
                onUpdateStatus={updateOrderStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment_confirmed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Confirmed Orders ({getOrdersByStatus('payment_confirmed').length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminOrdersTable
                orders={orders}
                filteredOrders={getOrdersByStatus('payment_confirmed')}
                updating={updating}
                onUpdateStatus={updateOrderStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="on_delivery" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>On Delivery Orders ({getOrdersByStatus('on_delivery').length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminOrdersTable
                orders={orders}
                filteredOrders={getOrdersByStatus('on_delivery')}
                updating={updating}
                onUpdateStatus={updateOrderStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Orders ({getOrdersByStatus('delivered').length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminOrdersTable
                orders={orders}
                filteredOrders={getOrdersByStatus('delivered')}
                updating={updating}
                onUpdateStatus={updateOrderStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Orders ({getOrdersByStatus('cancelled').length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AdminOrdersTable
                orders={orders}
                filteredOrders={getOrdersByStatus('cancelled')}
                updating={updating}
                onUpdateStatus={updateOrderStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
