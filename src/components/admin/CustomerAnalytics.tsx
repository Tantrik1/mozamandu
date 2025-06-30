
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

interface OrderData {
  date: string;
  orders: number;
  revenue: number;
}

export function CustomerAnalytics() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderData, setOrderData] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerAnalytics();
  }, []);

  const fetchCustomerAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch customer data with order statistics
      const { data: customerData, error: customerError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          contact_number,
          created_at
        `)
        .eq('role', 'customer');

      if (customerError) {
        console.error('Error fetching customers:', customerError);
        return;
      }

      // Fetch order statistics for each customer
      const customersWithStats = await Promise.all(
        (customerData || []).map(async (customer) => {
          // Get customer orders count and total
          const { data: orders, error: ordersError } = await supabase
            .from('customer_orders')
            .select('total_amount')
            .eq('user_id', customer.id);

          if (ordersError) {
            console.error('Error fetching customer orders:', ordersError);
            return {
              ...customer,
              total_orders: 0,
              total_spent: 0
            };
          }

          const totalOrders = orders?.length || 0;
          const totalSpent = orders?.reduce((sum, order) => {
            const amount = parseFloat(order.total_amount?.toString() || '0');
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0) || 0;

          return {
            ...customer,
            total_orders: totalOrders,
            total_spent: totalSpent
          };
        })
      );

      setCustomers(customersWithStats);

      // Fetch order data for charts
      const { data: recentOrders, error: ordersError } = await supabase
        .from('customer_orders')
        .select('created_at, total_amount')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) {
        console.error('Error fetching order data:', ordersError);
        return;
      }

      // Group orders by date
      const ordersByDate = (recentOrders || []).reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        const amount = parseFloat(order.total_amount?.toString() || '0');
        
        if (!acc[date]) {
          acc[date] = { orders: 0, revenue: 0 };
        }
        acc[date].orders += 1;
        acc[date].revenue += isNaN(amount) ? 0 : amount;
        
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      const chartData = Object.entries(ordersByDate).map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue
      }));

      setOrderData(chartData);

    } catch (error) {
      console.error('Error in fetchCustomerAnalytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading customer analytics...</div>;
  }

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.total_spent, 0);
  const avgOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Customer Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {orderData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={orderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers
              .sort((a, b) => b.total_spent - a.total_spent)
              .slice(0, 10)
              .map((customer) => (
                <div key={customer.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{customer.full_name}</div>
                    <div className="text-sm text-gray-600">{customer.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">Rs. {customer.total_spent.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">{customer.total_orders} orders</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
