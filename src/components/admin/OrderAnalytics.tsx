
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  avgFulfillmentTime: number;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  dailyOrders: Array<{ date: string; orders: number }>;
}

export function OrderAnalytics() {
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    avgFulfillmentTime: 0,
    statusDistribution: [],
    dailyOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderAnalytics();
  }, []);

  const fetchOrderAnalytics = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      calculateOrderStats(orders || []);
    } catch (error) {
      console.error('Error fetching order analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderStats = (orders: any[]) => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const pendingOrders = orders.filter(o => ['pending_payment', 'confirmed', 'processing', 'shipped'].includes(o.status)).length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const returnedOrders = orders.filter(o => o.status === 'returned').length;

    // Calculate average fulfillment time (from creation to delivery)
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const avgFulfillmentTime = deliveredOrders.length > 0 ? 
      deliveredOrders.reduce((sum, order) => {
        const created = new Date(order.created_at);
        const delivered = new Date(order.updated_at);
        return sum + (delivered.getTime() - created.getTime());
      }, 0) / deliveredOrders.length / (1000 * 60 * 60 * 24) : 0; // Convert to days

    // Status distribution for pie chart
    const statusDistribution = [
      { name: 'Completed', value: completedOrders, color: '#10b981' },
      { name: 'Pending', value: pendingOrders, color: '#f59e0b' },
      { name: 'Cancelled', value: cancelledOrders, color: '#ef4444' },
      { name: 'Returned', value: returnedOrders, color: '#8b5cf6' }
    ].filter(item => item.value > 0);

    // Daily orders for last 30 days
    const dailyOrders = generateDailyOrdersData(orders);

    setStats({
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      returnedOrders,
      avgFulfillmentTime,
      statusDistribution,
      dailyOrders
    });
  };

  const generateDailyOrdersData = (orders: any[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(date => ({
      date: date.split('-').slice(1).join('/'), // Format: MM/DD
      orders: orders.filter(order => 
        order.created_at.startsWith(date)
      ).length
    }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {stats.totalOrders > 0 ? ((stats.pendingOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {stats.totalOrders > 0 ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Fulfillment</p>
                <p className="text-2xl font-bold">{stats.avgFulfillmentTime.toFixed(1)}</p>
                <p className="text-xs text-gray-500">days</p>
              </div>
              <RotateCcw className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Orders (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
