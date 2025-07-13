import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, Cell, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, UserPlus, Star, Heart, TrendingUp, MapPin } from 'lucide-react';

const customerSegmentData = [
  { segment: 'New', count: 150, value: 23, fill: 'hsl(var(--chart-1))' },
  { segment: 'Regular', count: 320, value: 49, fill: 'hsl(var(--chart-2))' },
  { segment: 'VIP', count: 85, value: 13, fill: 'hsl(var(--chart-3))' },
  { segment: 'Inactive', count: 95, value: 15, fill: 'hsl(var(--chart-4))' },
];

const customerGrowthData = [
  { month: 'Jan', newCustomers: 45, totalCustomers: 450 },
  { month: 'Feb', newCustomers: 52, totalCustomers: 502 },
  { month: 'Mar', newCustomers: 48, totalCustomers: 550 },
  { month: 'Apr', newCustomers: 61, totalCustomers: 611 },
  { month: 'May', newCustomers: 55, totalCustomers: 666 },
  { month: 'Jun', newCustomers: 67, totalCustomers: 733 },
];

const customerLocationData = [
  { city: 'New York', customers: 145 },
  { city: 'Los Angeles', customers: 123 },
  { city: 'Chicago', customers: 98 },
  { city: 'Houston', customers: 87 },
  { city: 'Phoenix', customers: 65 },
];

const topCustomers = [
  { name: 'John Smith', orders: 23, spent: 2340, tier: 'VIP' },
  { name: 'Sarah Johnson', orders: 18, spent: 1890, tier: 'VIP' },
  { name: 'Mike Wilson', orders: 15, spent: 1560, tier: 'Regular' },
  { name: 'Emma Davis', orders: 12, spent: 1234, tier: 'Regular' },
  { name: 'David Brown', orders: 10, spent: 987, tier: 'Regular' },
];

export function CustomersTab() {
  const [realtimeStats, setRealtimeStats] = useState({
    totalCustomers: 0,
    newThisWeek: 0,
    avgLifetimeValue: 0,
    customerRetentionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerStats();
    
    // Setup realtime subscription with proper cleanup
    const channel = supabase
      .channel('customers-realtime-' + Math.random().toString(36).substr(2, 9))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          if (payload.new.role === 'customer') {
            console.log('New customer registered:', payload);
            fetchCustomerStats();
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCustomerStats = async () => {
    try {
      // Get total customers
      const { data: allCustomers } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('role', 'customer');

      // Get customers from this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: newCustomers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'customer')
        .gte('created_at', weekAgo.toISOString());

      // Get customer order data for lifetime value
      const { data: customerOrders } = await supabase
        .from('customer_orders')
        .select('user_id, total_amount')
        .not('user_id', 'is', null);

      if (allCustomers && customerOrders) {
        // Calculate average lifetime value
        const customerTotals = customerOrders.reduce((acc, order) => {
          acc[order.user_id] = (acc[order.user_id] || 0) + Number(order.total_amount);
          return acc;
        }, {} as Record<string, number>);

        const totalSpent = Object.values(customerTotals).reduce((sum, value) => sum + value, 0);
        const avgLifetimeValue = Object.keys(customerTotals).length > 0 ? totalSpent / Object.keys(customerTotals).length : 0;

        setRealtimeStats({
          totalCustomers: allCustomers.length,
          newThisWeek: newCustomers?.length || 0,
          avgLifetimeValue,
          customerRetentionRate: 68.5, // This would be calculated based on repeat purchases
        });
      }
    } catch (error) {
      console.error('Error fetching customer stats:', error);
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
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-blue-700">{realtimeStats.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">New This Week</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-green-700">{realtimeStats.newThisWeek}</p>
                  {realtimeStats.newThisWeek > 0 && (
                    <Badge variant="secondary" className="bg-green-200 text-green-700">
                      +{Math.round((realtimeStats.newThisWeek / Math.max(realtimeStats.totalCustomers, 1)) * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg Lifetime Value</p>
                <p className="text-2xl font-bold text-purple-700">${realtimeStats.avgLifetimeValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Star className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Retention Rate</p>
                <p className="text-2xl font-bold text-orange-700">{realtimeStats.customerRetentionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Segments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                new: { label: "New", color: "hsl(var(--chart-1))" },
                regular: { label: "Regular", color: "hsl(var(--chart-2))" },
                vip: { label: "VIP", color: "hsl(var(--chart-3))" },
                inactive: { label: "Inactive", color: "hsl(var(--chart-4))" },
              }}
              className="h-[200px]"
            >
              <PieChart>
                <Pie
                  data={customerSegmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ segment, value }) => `${segment}: ${value}%`}
                >
                  {customerSegmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Customer Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Customer Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                newCustomers: { label: "New Customers", color: "hsl(var(--chart-1))" },
                totalCustomers: { label: "Total Customers", color: "hsl(var(--chart-2))" },
              }}
              className="h-[200px]"
            >
              <LineChart data={customerGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="newCustomers" fill="hsl(var(--chart-1))" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalCustomers"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${customer.spent}</p>
                    <Badge variant={customer.tier === 'VIP' ? 'default' : 'secondary'}>
                      {customer.tier}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                customers: { label: "Customers", color: "hsl(var(--chart-3))" },
              }}
              className="h-[200px]"
            >
              <BarChart data={customerLocationData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="city" type="category" width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="customers" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Satisfaction */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Satisfaction Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">4.8/5</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">92%</p>
              <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">24h</p>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">85%</p>
              <p className="text-sm text-muted-foreground">Repeat Purchase Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}