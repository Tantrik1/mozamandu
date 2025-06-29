import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserPlus, Heart, ShoppingBag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgCustomerLifetimeValue: number;
  abandonedCartRate: number;
  customerGrowth: Array<{ month: string; customers: number }>;
  customerSegments: Array<{ segment: string; count: number; value: number }>;
}

export function CustomerAnalytics() {
  const [analytics, setAnalytics] = useState<CustomerAnalytics>({
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    avgCustomerLifetimeValue: 0,
    abandonedCartRate: 0,
    customerGrowth: [],
    customerSegments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerAnalytics();
  }, []);

  const fetchCustomerAnalytics = async () => {
    try {
      // Fetch customers and their orders
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at, role')
        .eq('role', 'customer');

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at, status');

      if (profilesError || ordersError) {
        throw profilesError || ordersError;
      }

      calculateCustomerAnalytics(profiles || [], orders || []);
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCustomerAnalytics = (profiles: any[], orders: any[]) => {
    const totalCustomers = profiles.length;
    
    // Calculate new vs returning customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newCustomers = profiles.filter(p => 
      new Date(p.created_at) >= thirtyDaysAgo
    ).length;

    // Calculate returning customers (customers with more than 1 order)
    const customerOrderCounts = orders.reduce((acc, order) => {
      if (order.status !== 'cancelled') {
        acc[order.user_id] = (acc[order.user_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const returningCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length;

    // Calculate average customer lifetime value
    const customerTotalSpent = orders
      .filter(order => order.status !== 'cancelled')
      .reduce((acc, order) => {
        const amount = Number(order.total_amount) || 0;
        acc[order.user_id] = (acc[order.user_id] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

    const avgCustomerLifetimeValue = Object.keys(customerTotalSpent).length > 0 ?
      Object.values(customerTotalSpent).reduce((sum, value) => sum + value, 0) / Object.keys(customerTotalSpent).length : 0;

    // Calculate abandoned cart rate (simplified - customers with orders vs total customers)
    const customersWithOrders = new Set(orders.map(order => order.user_id)).size;
    const abandonedCartRate = totalCustomers > 0 ? 
      ((totalCustomers - customersWithOrders) / totalCustomers) * 100 : 0;

    // Generate customer growth data (last 12 months)
    const customerGrowth = generateCustomerGrowthData(profiles);

    // Generate customer segments based on spending
    const customerSegments = generateCustomerSegments(customerTotalSpent);

    setAnalytics({
      totalCustomers,
      newCustomers,
      returningCustomers,
      avgCustomerLifetimeValue,
      abandonedCartRate,
      customerGrowth,
      customerSegments
    });
  };

  const generateCustomerGrowthData = (profiles: any[]) => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleDateString('en', { month: 'short' }),
        year: date.getFullYear(),
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      };
    }).reverse();

    return months.map(({ month, key }) => ({
      month,
      customers: profiles.filter(profile => {
        const profileMonth = new Date(profile.created_at).toISOString().substring(0, 7);
        return profileMonth === key;
      }).length
    }));
  };

  const generateCustomerSegments = (customerTotalSpent: Record<string, number>) => {
    const spendingAmounts = Object.values(customerTotalSpent);
    
    const highValue = spendingAmounts.filter(amount => amount > 10000).length;
    const mediumValue = spendingAmounts.filter(amount => amount > 5000 && amount <= 10000).length;
    const lowValue = spendingAmounts.filter(amount => amount <= 5000).length;

    return [
      { segment: 'High Value (>Rs 10,000)', count: highValue, value: 10000 },
      { segment: 'Medium Value (Rs 5,000-10,000)', count: mediumValue, value: 7500 },
      { segment: 'Low Value (<Rs 5,000)', count: lowValue, value: 2500 }
    ];
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
      {/* Customer Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Customers</p>
                <p className="text-2xl font-bold text-green-600">{analytics.newCustomers}</p>
                <Badge variant="outline" className="text-xs mt-1">Last 30 days</Badge>
              </div>
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Returning</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.returningCustomers}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {analytics.totalCustomers > 0 ? ((analytics.returningCustomers / analytics.totalCustomers) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
              <Heart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg CLTV</p>
                <p className="text-2xl font-bold">Rs {analytics.avgCustomerLifetimeValue.toFixed(0)}</p>
                <p className="text-xs text-gray-500">Customer Lifetime Value</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Abandoned Cart Rate</p>
              <p className="text-2xl font-bold text-red-600">{analytics.abandonedCartRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Customers without orders</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Growth (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="customers" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.customerSegments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="segment" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
