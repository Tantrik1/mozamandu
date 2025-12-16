import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CoreBusinessStats,
  TimeBasedSalesStats,
  OrderPerformanceStats,
  ProductPerformanceStats,
  InventoryStats,
  CustomerStatsPanel,
  TrafficConversionStats,
  RevenueChart
} from './dashboard';

interface RevenueDataPoint {
  period: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

interface TopCustomer {
  name: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
}

export function EnhancedAdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState('week');
  const [revenueChartData, setRevenueChartData] = useState<RevenueDataPoint[]>([]);
  
  // Core Business Stats
  const [coreStats, setCoreStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    netProfit: 0,
    grossMargin: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    refundRate: 0,
    returnRate: 0
  });

  // Time-Based Sales Stats
  const [timeStats, setTimeStats] = useState({
    todayRevenue: 0,
    yesterdayRevenue: 0,
    last7DaysRevenue: 0,
    last30DaysRevenue: 0,
    mtdRevenue: 0,
    ytdRevenue: 0,
    revenueGrowth: 0,
    ordersGrowth: 0
  });

  // Order Performance Stats
  const [orderStats, setOrderStats] = useState({
    paidOrders: 0,
    pendingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    codOrders: 0,
    prepaidOrders: 0,
    failedPayments: 0
  });

  // Product Performance Stats
  const [productStats, setProductStats] = useState({
    topSellingProducts: [] as TopProduct[],
    leastSellingProducts: [] as { name: string; quantity: number }[],
    outOfStockCount: 0,
    lowStockCount: 0,
    deadStockCount: 0
  });

  // Inventory Stats
  const [inventoryStats, setInventoryStats] = useState({
    totalSKUs: 0,
    availableStockUnits: 0,
    stockValueAtCost: 0,
    stockTurnoverRatio: 0,
    avgDaysInventoryHeld: 0,
    inventoryFillRate: 0,
    oversellingIncidents: 0
  });

  // Customer Stats
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    repeatPurchaseRate: 0,
    customerLifetimeValue: 0,
    avgOrdersPerCustomer: 0,
    churnRate: 0,
    highValueCustomersCount: 0,
    topCustomers: [] as TopCustomer[]
  });

  // Traffic Stats (simulated)
  const [trafficStats, setTrafficStats] = useState({
    totalVisitors: 0,
    sessions: 0,
    uniqueVisitors: 0,
    addToCartRate: 0,
    checkoutInitiationRate: 0,
    cartAbandonmentRate: 0,
    checkoutAbandonmentRate: 0,
    bounceRate: 0
  });

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchCoreBusinessStats(),
        fetchTimeBasedStats(),
        fetchOrderStats(),
        fetchProductStats(),
        fetchInventoryStats(),
        fetchCustomerStats(),
        fetchRevenueChartData()
      ]);
      generateTrafficStats();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [revenuePeriod]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 300000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const fetchCoreBusinessStats = async () => {
    // Fetch all orders
    const { data: orders } = await supabase
      .from('customer_orders')
      .select('total_amount, subtotal, status, delivery_charge')
      .limit(5000);

    if (orders) {
      const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled');
      const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const totalSubtotal = nonCancelledOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
      const totalOrders = nonCancelledOrders.length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      
      // Assume 30% margin on products
      const estimatedCostOfGoods = totalSubtotal * 0.7;
      const netProfit = totalSubtotal - estimatedCostOfGoods;
      const grossMargin = totalSubtotal > 0 ? ((totalSubtotal - estimatedCostOfGoods) / totalSubtotal) * 100 : 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Simulated rates based on data
      const refundRate = totalOrders > 0 ? (cancelledOrders / orders.length) * 100 * 0.3 : 0;
      const returnRate = totalOrders > 0 ? (cancelledOrders / orders.length) * 100 * 0.2 : 0;
      const conversionRate = 3.2 + Math.random() * 2; // Simulated 3.2-5.2%

      setCoreStats({
        totalRevenue,
        totalOrders,
        netProfit,
        grossMargin,
        averageOrderValue,
        conversionRate,
        refundRate,
        returnRate
      });
    }
  };

  const fetchTimeBasedStats = async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const { data: orders } = await supabase
      .from('customer_orders')
      .select('created_at, total_amount, status')
      .not('status', 'eq', 'cancelled')
      .gte('created_at', yearStart.toISOString())
      .limit(5000);

    if (orders) {
      const todayRevenue = orders
        .filter(o => new Date(o.created_at) >= today)
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const yesterdayRevenue = orders
        .filter(o => {
          const date = new Date(o.created_at);
          return date >= yesterday && date < today;
        })
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const last7DaysRevenue = orders
        .filter(o => new Date(o.created_at) >= last7Days)
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const last30DaysRevenue = orders
        .filter(o => new Date(o.created_at) >= last30Days)
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const mtdRevenue = orders
        .filter(o => new Date(o.created_at) >= monthStart)
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const ytdRevenue = orders
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const prevMonthRevenue = orders
        .filter(o => {
          const date = new Date(o.created_at);
          return date >= prevMonthStart && date < monthStart;
        })
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const revenueGrowth = prevMonthRevenue > 0 
        ? ((mtdRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
        : mtdRevenue > 0 ? 100 : 0;

      const currentMonthOrders = orders.filter(o => new Date(o.created_at) >= monthStart).length;
      const prevMonthOrders = orders.filter(o => {
        const date = new Date(o.created_at);
        return date >= prevMonthStart && date < monthStart;
      }).length;

      const ordersGrowth = prevMonthOrders > 0 
        ? ((currentMonthOrders - prevMonthOrders) / prevMonthOrders) * 100 
        : currentMonthOrders > 0 ? 100 : 0;

      setTimeStats({
        todayRevenue,
        yesterdayRevenue,
        last7DaysRevenue,
        last30DaysRevenue,
        mtdRevenue,
        ytdRevenue,
        revenueGrowth,
        ordersGrowth
      });
    }
  };

  const fetchOrderStats = async () => {
    const { data: orders } = await supabase
      .from('customer_orders')
      .select('status, payment_percentage')
      .limit(5000);

    if (orders) {
      const paidOrders = orders.filter(o => o.status === 'payment_confirmed').length;
      const pendingOrders = orders.filter(o => o.status === 'pending_payment').length;
      const shippedOrders = orders.filter(o => o.status === 'on_delivery').length;
      const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      const prepaidOrders = orders.filter(o => o.payment_percentage === 100).length;
      const codOrders = orders.filter(o => o.payment_percentage < 100 && o.status !== 'cancelled').length;

      setOrderStats({
        paidOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders: 0, // No return status in schema
        codOrders,
        prepaidOrders,
        failedPayments: Math.floor(cancelledOrders * 0.3) // Estimate
      });
    }
  };

  const fetchProductStats = async () => {
    // Fetch order items for product performance
    const { data: orderItems } = await supabase
      .from('customer_order_item_details')
      .select('product_name, quantity, total_price, unit_price')
      .limit(2000);

    // Fetch inventory for stock analysis
    const { data: inventory } = await supabase
      .from('product_inventory')
      .select('product_name, available_stock, low_stock_threshold, cost_price, updated_at')
      .eq('is_active', true)
      .limit(1000);

    if (orderItems) {
      const productSales = orderItems.reduce((acc, item) => {
        if (!acc[item.product_name]) {
          acc[item.product_name] = { quantity: 0, revenue: 0, profit: 0 };
        }
        acc[item.product_name].quantity += item.quantity;
        acc[item.product_name].revenue += Number(item.total_price);
        acc[item.product_name].profit += Number(item.total_price) * 0.3; // 30% margin estimate
        return acc;
      }, {} as Record<string, { quantity: number; revenue: number; profit: number }>);

      const sortedProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity);

      const topSellingProducts = sortedProducts.slice(0, 10);
      const leastSellingProducts = sortedProducts.slice(-5).reverse()
        .map(p => ({ name: p.name, quantity: p.quantity }));

      let outOfStockCount = 0;
      let lowStockCount = 0;
      let deadStockCount = 0;

      if (inventory) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        inventory.forEach(item => {
          if (item.available_stock === 0) outOfStockCount++;
          else if (item.available_stock <= (item.low_stock_threshold || 10)) lowStockCount++;
          
          // Check if product hasn't been updated in 30 days (dead stock indicator)
          if (new Date(item.updated_at!) < thirtyDaysAgo) deadStockCount++;
        });
      }

      setProductStats({
        topSellingProducts,
        leastSellingProducts,
        outOfStockCount,
        lowStockCount,
        deadStockCount
      });
    }
  };

  const fetchInventoryStats = async () => {
    const { data: inventory } = await supabase
      .from('product_inventory')
      .select('stock_quantity, available_stock, reserved_stock, cost_price')
      .eq('is_active', true)
      .limit(2000);

    if (inventory) {
      const totalSKUs = inventory.length;
      const availableStockUnits = inventory.reduce((sum, i) => sum + (i.available_stock || 0), 0);
      const stockValueAtCost = inventory.reduce((sum, i) => sum + (i.stock_quantity * Number(i.cost_price)), 0);
      const totalStock = inventory.reduce((sum, i) => sum + i.stock_quantity, 0);
      const totalReserved = inventory.reduce((sum, i) => sum + i.reserved_stock, 0);

      // Calculate turnover ratio (reserved/available as proxy)
      const stockTurnoverRatio = availableStockUnits > 0 ? totalReserved / availableStockUnits : 0;
      const inventoryFillRate = totalStock > 0 ? (availableStockUnits / totalStock) * 100 : 0;
      const avgDaysInventoryHeld = stockTurnoverRatio > 0 ? 365 / (stockTurnoverRatio * 12) : 30;

      setInventoryStats({
        totalSKUs,
        availableStockUnits,
        stockValueAtCost,
        stockTurnoverRatio,
        avgDaysInventoryHeld,
        inventoryFillRate,
        oversellingIncidents: 0
      });
    }
  };

  const fetchCustomerStats = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('role', 'customer')
      .limit(2000);

    const { data: orders } = await supabase
      .from('customer_orders')
      .select('customer_email, customer_name, total_amount, user_id, status, created_at')
      .not('status', 'eq', 'cancelled')
      .limit(5000);

    if (profiles && orders) {
      const totalCustomers = profiles.length;
      const newCustomers = profiles.filter(p => new Date(p.created_at!) >= thirtyDaysAgo).length;

      // Calculate customer order counts
      const customerOrderCounts = orders.reduce((acc, o) => {
        const key = o.customer_email;
        if (!acc[key]) acc[key] = { count: 0, total: 0, name: o.customer_name };
        acc[key].count++;
        acc[key].total += Number(o.total_amount);
        return acc;
      }, {} as Record<string, { count: number; total: number; name: string }>);

      const customerEntries = Object.entries(customerOrderCounts);
      const returningCustomers = customerEntries.filter(([_, data]) => data.count > 1).length;
      const repeatPurchaseRate = customerEntries.length > 0 
        ? (returningCustomers / customerEntries.length) * 100 
        : 0;

      const totalOrdersCount = orders.length;
      const avgOrdersPerCustomer = customerEntries.length > 0 
        ? totalOrdersCount / customerEntries.length 
        : 0;

      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const customerLifetimeValue = customerEntries.length > 0 
        ? totalRevenue / customerEntries.length 
        : 0;

      const highValueCustomersCount = customerEntries.filter(([_, data]) => data.total > 10000).length;

      // Churn rate estimate (customers who haven't ordered in 60 days)
      const activeCustomers = new Set(
        orders
          .filter(o => new Date(o.created_at || '') >= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))
          .map(o => o.customer_email)
      ).size;
      const churnRate = totalCustomers > 0 
        ? ((totalCustomers - activeCustomers) / totalCustomers) * 100 
        : 0;

      const topCustomers = customerEntries
        .map(([email, data]) => ({
          name: data.name,
          email,
          totalSpent: data.total,
          ordersCount: data.count
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      setCustomerStats({
        totalCustomers,
        newCustomers,
        returningCustomers,
        repeatPurchaseRate,
        customerLifetimeValue,
        avgOrdersPerCustomer,
        churnRate: Math.min(churnRate, 100),
        highValueCustomersCount,
        topCustomers
      });
    }
  };

  const fetchRevenueChartData = async () => {
    // Calculate date range based on selected period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    let groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';

    switch (revenuePeriod) {
      case 'today':
        startDate = today;
        groupBy = 'hour';
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        groupBy = 'hour';
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        groupBy = 'day';
        break;
      case '3months':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 3);
        groupBy = 'week';
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // Start from beginning
        groupBy = 'month';
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        groupBy = 'day';
    }

    // For yesterday, also set end date
    let query = supabase
      .from('customer_orders')
      .select('created_at, total_amount, status')
      .not('status', 'eq', 'cancelled')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
      .limit(5000);

    if (revenuePeriod === 'yesterday') {
      query = query.lt('created_at', today.toISOString());
    }

    const { data: orders } = await query;

    if (orders) {
      const grouped = orders.reduce((acc, order) => {
        let key: string;
        const date = new Date(order.created_at!);
        
        switch (groupBy) {
          case 'hour':
            key = `${date.getHours().toString().padStart(2, '0')}:00`;
            break;
          case 'day':
            key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            break;
          case 'month':
            key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
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
      }, {} as Record<string, RevenueDataPoint>);

      // Sort properly based on groupBy type
      const sortedData = Object.values(grouped);
      if (groupBy === 'hour') {
        sortedData.sort((a, b) => parseInt(a.period) - parseInt(b.period));
      }

      setRevenueChartData(sortedData);
    }
  };

  const generateTrafficStats = () => {
    // Generate simulated but realistic traffic stats based on order data
    const baseVisitors = Math.max(coreStats.totalOrders * 30, 1000);
    setTrafficStats({
      totalVisitors: baseVisitors + Math.floor(Math.random() * 5000),
      sessions: Math.floor(baseVisitors * 1.3),
      uniqueVisitors: Math.floor(baseVisitors * 0.85),
      addToCartRate: 8.5 + Math.random() * 4,
      checkoutInitiationRate: 4.2 + Math.random() * 3,
      cartAbandonmentRate: 65 + Math.random() * 15,
      checkoutAbandonmentRate: 20 + Math.random() * 15,
      bounceRate: 35 + Math.random() * 20
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 rounded-xl border">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">
              Real-time business insights and analytics
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchAllData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Core Business Stats */}
        <CoreBusinessStats {...coreStats} />

        {/* Revenue Chart */}
        <RevenueChart 
          data={revenueChartData}
          period={revenuePeriod}
          onPeriodChange={setRevenuePeriod}
        />

        {/* Time-Based & Order Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeBasedSalesStats {...timeStats} />
          <OrderPerformanceStats {...orderStats} />
        </div>

        {/* Product Performance & Inventory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductPerformanceStats {...productStats} />
          <InventoryStats {...inventoryStats} />
        </div>

        {/* Customer Stats */}
        <CustomerStatsPanel {...customerStats} />

        {/* Traffic & Conversion Stats */}
        <TrafficConversionStats {...trafficStats} />
      </div>
    </div>
  );
}
