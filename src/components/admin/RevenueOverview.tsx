
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, DollarSign, Calculator } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueData {
  period: string;
  revenue: number;
  orders: number;
  profit: number;
}

export function RevenueOverview() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState('daily');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    avgOrderValue: 0,
    grossProfit: 0,
    netProfit: 0,
    revenueGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, [currentPeriod]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, subtotal, created_at, status')
        .not('status', 'eq', 'cancelled');

      if (error) throw error;

      const processedData = processRevenueData(orders || [], currentPeriod);
      setRevenueData(processedData);
      calculateStats(orders || []);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRevenueData = (orders: any[], period: string) => {
    const grouped: Record<string, { revenue: number; orders: number; costs: number }> = {};
    
    orders.forEach(order => {
      let key: string;
      const date = new Date(order.created_at);
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = { revenue: 0, orders: 0, costs: 0 };
      }
      
      grouped[key].revenue += Number(order.total_amount);
      grouped[key].orders += 1;
      grouped[key].costs += Number(order.subtotal) * 0.7; // Assuming 70% cost ratio
    });

    return Object.entries(grouped)
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        orders: data.orders,
        profit: data.revenue - data.costs
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-30); // Last 30 periods
  };

  const calculateStats = (orders: any[]) => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const grossProfit = totalRevenue * 0.3; // Assuming 30% margin
    const netProfit = grossProfit * 0.8; // Assuming 20% expenses

    // Calculate growth (comparing last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentRevenue = orders
      .filter(order => new Date(order.created_at) >= thirtyDaysAgo)
      .reduce((sum, order) => sum + Number(order.total_amount), 0);

    const previousRevenue = orders
      .filter(order => {
        const date = new Date(order.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      })
      .reduce((sum, order) => sum + Number(order.total_amount), 0);

    const revenueGrowth = previousRevenue > 0 ? 
      ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    setStats({
      totalRevenue,
      avgOrderValue,
      grossProfit,
      netProfit,
      revenueGrowth
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">Rs {stats.totalRevenue.toFixed(2)}</p>
                <div className="flex items-center mt-1">
                  {stats.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.revenueGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold">Rs {stats.avgOrderValue.toFixed(2)}</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                <p className="text-2xl font-bold">Rs {stats.grossProfit.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold">Rs {stats.netProfit.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <Tabs value={currentPeriod} onValueChange={setCurrentPeriod}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => [`Rs ${Number(value).toFixed(2)}`, 'Revenue']} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
