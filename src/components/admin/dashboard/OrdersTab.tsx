import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ShoppingCart, Package, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

const orderStatusData = [
  { status: 'Pending', count: 45, fill: 'hsl(var(--chart-1))' },
  { status: 'Confirmed', count: 123, fill: 'hsl(var(--chart-2))' },
  { status: 'On Delivery', count: 67, fill: 'hsl(var(--chart-3))' },
  { status: 'Delivered', count: 289, fill: 'hsl(var(--chart-4))' },
  { status: 'Cancelled', count: 12, fill: 'hsl(var(--chart-5))' },
];

const revenueData = [
  { date: '2024-01-01', revenue: 12500, orders: 45 },
  { date: '2024-01-02', revenue: 15800, orders: 52 },
  { date: '2024-01-03', revenue: 18200, orders: 61 },
  { date: '2024-01-04', revenue: 16900, orders: 58 },
  { date: '2024-01-05', revenue: 21300, orders: 72 },
  { date: '2024-01-06', revenue: 24500, orders: 83 },
  { date: '2024-01-07', revenue: 22800, orders: 76 },
];

const topProducts = [
  { name: 'Premium T-Shirt', orders: 234, revenue: 15600 },
  { name: 'Designer Jeans', orders: 189, revenue: 23450 },
  { name: 'Sport Shoes', orders: 156, revenue: 18720 },
  { name: 'Casual Shirt', orders: 134, revenue: 12750 },
  { name: 'Summer Dress', orders: 98, revenue: 9800 },
];

export function OrdersTab() {
  const [realtimeStats, setRealtimeStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderStats();
    
    // Setup realtime subscription with proper cleanup
    const channel = supabase
      .channel('orders-realtime-' + Math.random().toString(36).substr(2, 9))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_orders'
        },
        (payload) => {
          console.log('Order change detected:', payload);
          fetchOrderStats();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrderStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: todayOrders } = await supabase
        .from('customer_orders')
        .select('total_amount, status')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      const { data: pendingOrders } = await supabase
        .from('customer_orders')
        .select('id')
        .eq('status', 'pending_payment');

      if (todayOrders) {
        const revenue = todayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const avgOrderValue = todayOrders.length > 0 ? revenue / todayOrders.length : 0;

        setRealtimeStats({
          todayOrders: todayOrders.length,
          todayRevenue: revenue,
          averageOrderValue: avgOrderValue,
          pendingOrders: pendingOrders?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Realtime Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Today's Orders</p>
                <p className="text-2xl font-bold text-blue-700">{realtimeStats.todayOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Today's Revenue</p>
                <p className="text-2xl font-bold text-green-700">${realtimeStats.todayRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold text-purple-700">${realtimeStats.averageOrderValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Pending Orders</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-orange-700">{realtimeStats.pendingOrders}</p>
                  {realtimeStats.pendingOrders > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      Action Needed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
              }}
              className="h-[200px]"
            >
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Orders", color: "hsl(var(--chart-2))" },
              }}
              className="h-[200px]"
            >
              <BarChart data={orderStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.orders} orders</p>
                  </div>
                  <Badge variant="outline">${product.revenue.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders vs Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Orders vs Revenue Correlation</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                orders: { label: "Orders", color: "hsl(var(--chart-3))" },
                revenue: { label: "Revenue", color: "hsl(var(--chart-4))" },
              }}
              className="h-[200px]"
            >
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Order Processing Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">2.3h</p>
              <p className="text-sm text-muted-foreground">Avg Processing Time</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">1.2d</p>
              <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">97.8%</p>
              <p className="text-sm text-muted-foreground">Order Success Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}