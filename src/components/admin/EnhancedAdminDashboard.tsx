import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AdminHeader } from './AdminHeader';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface RevenueData {
  period: string;
  revenue: number;
  orders: number;
}

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopCustomer {
  name: string;
  email: string;
  total: number;
  orders: number;
}

interface CustomerGrowth {
  month: string;
  customers: number;
}

interface LowStockItem {
  product_name: string;
  color_name: string | null;
  size_name: string | null;
  available_stock: number;
  low_stock_threshold: number | null;
  sku: string;
}

export function EnhancedAdminDashboard() {
  const [revenuePeriod, setRevenuePeriod] = useState('week');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowth[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    orders: { label: "Orders", color: "hsl(var(--secondary))" }
  };

  const statusColors: Record<string, string> = {
    pending_payment: '#f59e0b',
    payment_confirmed: '#3b82f6', 
    on_delivery: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [revenuePeriod]);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchRevenueData(),
        fetchOrderStatusData(),
        fetchTopProducts(),
        fetchTopCustomers(),
        fetchCustomerGrowth(),
        fetchLowStockItems()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchRevenueData = async () => {
    const { data, error } = await supabase
      .from('customer_orders')
      .select('created_at, total_amount, status')
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: true });

    if (!error && data) {
      const groupedData = groupDataByPeriod(data, revenuePeriod);
      setRevenueData(groupedData);
      setTotalRevenue(data.reduce((sum, order) => sum + Number(order.total_amount), 0));
      setTotalOrders(data.length);
    }
  };

  const fetchOrderStatusData = async () => {
    const { data, error } = await supabase
      .from('customer_orders')
      .select('status')
      .not('status', 'eq', 'cancelled');

    if (!error && data) {
      const statusCounts = data.reduce((acc: Record<string, number>, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const formattedData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').toUpperCase(),
        value: count as number,
        color: statusColors[status]
      }));
      setOrderStatusData(formattedData);
    }
  };

  const fetchTopProducts = async () => {
    const { data, error } = await supabase
      .from('customer_order_item_details')
      .select('product_name, quantity, total_price')
      .order('quantity', { ascending: false });

    if (!error && data) {
      const productSales = data.reduce((acc, item) => {
        if (!acc[item.product_name]) {
          acc[item.product_name] = { quantity: 0, revenue: 0 };
        }
        acc[item.product_name].quantity += item.quantity;
        acc[item.product_name].revenue += Number(item.total_price);
        return acc;
      }, {});

      const sortedProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...(data as { quantity: number; revenue: number }) }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      setTopProducts(sortedProducts);
    }
  };

  const fetchTopCustomers = async () => {
    const { data, error } = await supabase
      .from('customer_orders')
      .select('customer_name, customer_email, total_amount')
      .not('status', 'eq', 'cancelled');

    if (!error && data) {
      const customerSales = data.reduce((acc, order) => {
        const key = order.customer_email;
        if (!acc[key]) {
          acc[key] = { name: order.customer_name, email: order.customer_email, total: 0, orders: 0 };
        }
        acc[key].total += Number(order.total_amount);
        acc[key].orders += 1;
        return acc;
      }, {});

      const sortedCustomers = (Object.values(customerSales) as TopCustomer[])
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      
      setTopCustomers(sortedCustomers);
    }
  };

  const fetchCustomerGrowth = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: true });

    if (!error && data) {
      const monthlyGrowth = data.reduce((acc: Record<string, number>, profile) => {
        const month = new Date(profile.created_at).toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      const formattedData = Object.entries(monthlyGrowth).map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        customers: count as number
      }));
      
      setCustomerGrowth(formattedData);
    }
  };

  const fetchLowStockItems = async () => {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('product_name, color_name, size_name, available_stock, low_stock_threshold, sku')
      .lte('available_stock', 10)
      .eq('is_active', true)
      .order('available_stock', { ascending: true })
      .limit(10);

    if (!error && data) {
      setLowStockItems(data);
    }
  };

  const groupDataByPeriod = (data: any[], period: string): RevenueData[] => {
    const grouped = data.reduce((acc: Record<string, RevenueData>, order: any) => {
      let key: string;
      const date = new Date(order.created_at);
      
      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = date.toISOString().slice(0, 7);
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!acc[key]) {
        acc[key] = { period: key, revenue: 0, orders: 0 };
      }
      acc[key].revenue += Number(order.total_amount);
      acc[key].orders += 1;
      return acc;
    }, {});

    return (Object.values(grouped) as RevenueData[]).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 rounded-xl border">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">
            Real-time business insights and analytics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topCustomers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Revenue and orders over time</CardDescription>
                </div>
                <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                  <Line type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Current order status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
              <CardTitle>Customer Growth</CardTitle>
              <CardDescription>New customers by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64">
                <BarChart data={customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="customers" fill="hsl(var(--primary))" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Sold Products</CardTitle>
              <CardDescription>Best performing products by quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.quantity} sold</p>
                    </div>
                    <Badge variant="secondary">${product.revenue.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Customers</CardTitle>
              <CardDescription>Highest spending customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                    </div>
                    <Badge variant="secondary">${customer.total.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Products running low on inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-medium">{item.product_name}</h4>
                  {item.color_name && <p className="text-sm text-muted-foreground">Color: {item.color_name}</p>}
                  {item.size_name && <p className="text-sm text-muted-foreground">Size: {item.size_name}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Stock: {item.available_stock}</span>
                    <Badge variant="destructive">{item.sku}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}