
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
  isGuestOrder?: boolean; // Track if order is from guest (orders table) vs customer (customer_orders table)
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
      console.log('Fetching all orders from both tables...');
      
      // Fetch from both customer_orders and orders tables in parallel
      const [customerOrdersResult, guestOrdersResult] = await Promise.all([
        supabase
          .from('customer_orders')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (customerOrdersResult.error) {
        console.error('Error fetching customer orders:', customerOrdersResult.error);
      }
      
      if (guestOrdersResult.error) {
        console.error('Error fetching guest orders:', guestOrdersResult.error);
      }

      const customerOrders = customerOrdersResult.data || [];
      const guestOrders = guestOrdersResult.data || [];

      console.log('Fetched customer orders count:', customerOrders.length);
      console.log('Fetched guest orders count:', guestOrders.length);

      // Get unique user IDs that are not null from customer orders
      const userIds = customerOrders
        .filter(order => order.user_id)
        .map(order => order.user_id)
        .filter((id, index, array) => array.indexOf(id) === index);
      
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
            profilesMap = (profiles || []).reduce((acc, profile) => {
              acc[profile.id] = { role: profile.role };
              return acc;
            }, {} as { [key: string]: { role: string } });
          }
        } catch (profileError) {
          console.error('Profile fetch failed:', profileError);
        }
      }

      // Transform customer orders with profile data
      const transformedCustomerOrders = customerOrders.map(order => ({
        ...order,
        user_role: order.user_id ? profilesMap[order.user_id]?.role || 'customer' : null,
        isGuestOrder: false
      }));

      // Transform guest orders
      const transformedGuestOrders = guestOrders.map(order => ({
        ...order,
        user_role: 'guest',
        isGuestOrder: true
      }));

      // Combine and sort by created_at descending
      const allOrders = [...transformedCustomerOrders, ...transformedGuestOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('Final combined orders:', allOrders.length);
      setOrders(allOrders);
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
      
      // Find the order to determine which table to update
      const order = orders.find(o => o.id === orderId);
      const tableName = order?.isGuestOrder ? 'orders' : 'customer_orders';
      
      console.log('Updating in table:', tableName);
      
      const { error } = await supabase
        .from(tableName)
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage customer orders</p>
        </div>
        <Button onClick={fetchOrders} disabled={loading} size="sm">
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
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-6 md:w-full">
            <TabsTrigger value="all" className="text-xs md:text-sm whitespace-nowrap">
              All ({getOrdersByStatus('all').length})
            </TabsTrigger>
            <TabsTrigger value="pending_payment" className="text-xs md:text-sm whitespace-nowrap">
              Pending ({getOrdersByStatus('pending_payment').length})
            </TabsTrigger>
            <TabsTrigger value="payment_confirmed" className="text-xs md:text-sm whitespace-nowrap">
              Confirmed ({getOrdersByStatus('payment_confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="on_delivery" className="text-xs md:text-sm whitespace-nowrap">
              Delivery ({getOrdersByStatus('on_delivery').length})
            </TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs md:text-sm whitespace-nowrap">
              Delivered ({getOrdersByStatus('delivered').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs md:text-sm whitespace-nowrap">
              Cancelled ({getOrdersByStatus('cancelled').length})
            </TabsTrigger>
          </TabsList>
        </div>

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
