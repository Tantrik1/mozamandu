import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Clock, Activity, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  CoreBusinessStats,
  TimeBasedSalesStats,
  OrderPerformanceStats,
  ProductPerformanceStats,
  InventoryStats,
  CustomerStatsPanel,
  RevenueChart,
  DashboardDateFilter,
  OrderSourceBreakdown,
  createDateFilterValue,
  type DateFilterValue,
  type OrderSourceFilter
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

// Cache for orders data to avoid duplicate fetches
interface OrdersCache {
  data: any[] | null;
  timestamp: number;
}

export function EnhancedAdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(createDateFilterValue('allTime'));
  const [sourceFilter, setSourceFilter] = useState<OrderSourceFilter>('all');
  const [revenueChartData, setRevenueChartData] = useState<RevenueDataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const ordersCache = useRef<OrdersCache>({ data: null, timestamp: 0 });
  
  // Order Source Stats
  const [orderSourceStats, setOrderSourceStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    registeredOrders: 0,
    registeredRevenue: 0,
    guestOrders: 0,
    guestRevenue: 0,
    registeredAOV: 0,
    guestAOV: 0
  });
  
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

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orders with caching (5 minute cache) - includes both customer and guest orders
  const fetchOrdersWithCache = async () => {
    const now = Date.now();
    const cacheAge = now - ordersCache.current.timestamp;
    
    if (ordersCache.current.data && cacheAge < 300000) {
      return ordersCache.current.data;
    }

    // Fetch from BOTH order tables in parallel
    const [customerOrdersRes, guestOrdersRes] = await Promise.all([
      supabase
        .from('customer_orders')
        .select('id, created_at, total_amount, subtotal, status, customer_email, customer_name, delivery_charge, paid_amount')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('orders')
        .select('id, created_at, total_amount, subtotal, status, customer_email, customer_name, delivery_charge, paid_amount')
        .order('created_at', { ascending: false })
        .limit(1000)
    ]);

    // Combine with source tag for proper item fetching later
    const customerOrders = (customerOrdersRes.data || []).map(o => ({ ...o, source: 'customer' as const }));
    const guestOrders = (guestOrdersRes.data || []).map(o => ({ ...o, source: 'guest' as const }));
    
    const allOrders = [...customerOrders, ...guestOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    ordersCache.current = { data: allOrders, timestamp: now };
    return allOrders;
  };

  // Filter orders by date range and source
  const filterOrdersByDateRange = (orders: any[]) => {
    return orders.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate >= dateFilter.startDate && orderDate <= dateFilter.endDate;
    });
  };

  const filterOrdersBySource = (orders: any[]) => {
    if (sourceFilter === 'all') return orders;
    if (sourceFilter === 'registered') return orders.filter(o => o.source === 'customer');
    if (sourceFilter === 'guest') return orders.filter(o => o.source === 'guest');
    return orders;
  };

  const calculateOrderSourceStats = (filteredOrders: any[]) => {
    const nonCancelled = filteredOrders.filter(o => o.status !== 'cancelled');
    const registeredOrders = nonCancelled.filter(o => o.source === 'customer');
    const guestOrders = nonCancelled.filter(o => o.source === 'guest');
    
    const registeredRevenue = registeredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const guestRevenue = guestOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    setOrderSourceStats({
      totalOrders: nonCancelled.length,
      totalRevenue: registeredRevenue + guestRevenue,
      registeredOrders: registeredOrders.length,
      registeredRevenue,
      guestOrders: guestOrders.length,
      guestRevenue,
      registeredAOV: registeredOrders.length > 0 ? registeredRevenue / registeredOrders.length : 0,
      guestAOV: guestOrders.length > 0 ? guestRevenue / guestOrders.length : 0
    });
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch orders once and share across stats
      const allOrders = await fetchOrdersWithCache();
      const dateFilteredOrders = filterOrdersByDateRange(allOrders);
      
      // Calculate order source stats before applying source filter
      calculateOrderSourceStats(dateFilteredOrders);
      
      // Apply source filter for other stats
      const filteredOrders = filterOrdersBySource(dateFilteredOrders);
      
      // Run all stat calculations in parallel with filtered orders
      await Promise.all([
        calculateCoreBusinessStats(filteredOrders),
        calculateTimeBasedStats(filteredOrders, filterOrdersBySource(allOrders)),
        calculateOrderStats(filteredOrders),
        fetchProductStats(filteredOrders),
        fetchInventoryStats(),
        calculateCustomerStats(filteredOrders, filterOrdersBySource(allOrders)),
        fetchRevenueChartData(filteredOrders)
      ]);
      
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, sourceFilter]);

  useEffect(() => {
    fetchAllData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAllData, 300000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const calculateCoreBusinessStats = async (orders: any[]) => {
    const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled');
    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalSubtotal = nonCancelledOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
    const totalOrders = nonCancelledOrders.length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    
    // Fetch actual cost data from inventory
    const { data: inventoryData } = await supabase
      .from('product_inventory')
      .select('cost_price, selling_price')
      .limit(500);
    
    // Calculate actual gross margin from inventory data
    const avgCostRatio = inventoryData && inventoryData.length > 0
      ? inventoryData.reduce((sum, item) => {
          const cost = Number(item.cost_price || 0);
          const sell = Number(item.selling_price || item.cost_price || 1);
          return sum + (cost / sell);
        }, 0) / inventoryData.length
      : 0.7;
    
    const estimatedCostOfGoods = totalSubtotal * avgCostRatio;
    const netProfit = totalSubtotal - estimatedCostOfGoods;
    const grossMargin = totalSubtotal > 0 ? ((totalSubtotal - estimatedCostOfGoods) / totalSubtotal) * 100 : 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate actual rates from order data
    const refundRate = orders.length > 0 ? (cancelledOrders / orders.length) * 100 : 0;
    const returnRate = 0; // No return status in system yet
    const conversionRate = 0; // Requires website traffic data (GA removed)

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
  };

  const calculateTimeBasedStats = async (filteredOrders: any[], allOrders: any[]) => {
    const validOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    const allValidOrders = allOrders.filter(o => o.status !== 'cancelled');
    
    // Get current period stats
    const periodRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const periodOrders = validOrders.length;
    
    // Calculate comparison with previous period of same length
    const periodDays = Math.ceil((dateFilter.endDate.getTime() - dateFilter.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevPeriodEnd = new Date(dateFilter.startDate);
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
    const prevPeriodStart = new Date(prevPeriodEnd);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);
    
    const prevPeriodOrders = allValidOrders.filter(o => {
      const date = new Date(o.created_at);
      return date >= prevPeriodStart && date <= prevPeriodEnd;
    });
    const prevPeriodRevenue = prevPeriodOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    const revenueGrowth = prevPeriodRevenue > 0 
      ? ((periodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 
      : periodRevenue > 0 ? 100 : 0;

    const ordersGrowth = prevPeriodOrders.length > 0 
      ? ((periodOrders - prevPeriodOrders.length) / prevPeriodOrders.length) * 100 
      : periodOrders > 0 ? 100 : 0;

    // Calculate actual time-based stats from ALL orders (not filtered by date picker)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const todayRevenue = allValidOrders
      .filter(o => new Date(o.created_at) >= today)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const yesterdayRevenue = allValidOrders
      .filter(o => {
        const date = new Date(o.created_at);
        return date >= yesterday && date < today;
      })
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const last7DaysRevenue = allValidOrders
      .filter(o => new Date(o.created_at) >= sevenDaysAgo)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const last30DaysRevenue = allValidOrders
      .filter(o => new Date(o.created_at) >= thirtyDaysAgo)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const mtdRevenue = allValidOrders
      .filter(o => new Date(o.created_at) >= monthStart)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const ytdRevenue = allValidOrders
      .filter(o => new Date(o.created_at) >= yearStart)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

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
  };

  const calculateOrderStats = async (orders: any[]) => {
    const paidOrders = orders.filter(o => o.status === 'payment_confirmed').length;
    const pendingOrders = orders.filter(o => o.status === 'pending_payment').length;
    const shippedOrders = orders.filter(o => o.status === 'on_delivery').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    
    // COD = orders with paid_amount < total_amount (partial/no payment upfront)
    // Prepaid = orders with paid_amount >= total_amount
    const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled');
    const prepaidOrders = nonCancelledOrders.filter(o => Number(o.paid_amount || 0) >= Number(o.total_amount || 0) && Number(o.total_amount || 0) > 0).length;
    const codOrders = nonCancelledOrders.length - prepaidOrders;

    setOrderStats({
      paidOrders,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders: 0,
      codOrders,
      prepaidOrders,
      failedPayments: 0
    });
  };

  const fetchProductStats = async (filteredOrders: any[]) => {
    // Separate order IDs by source for fetching from correct tables
    const customerOrderIds = filteredOrders.filter(o => o.source === 'customer').map(o => o.id);
    const guestOrderIds = filteredOrders.filter(o => o.source === 'guest').map(o => o.id);
    
    // Parallel fetch for product stats from BOTH order item tables
    const [customerItemsRes, guestItemsRes, inventoryResponse] = await Promise.all([
      supabase
        .from('customer_order_item_details')
        .select('product_name, quantity, total_price, order_id')
        .in('order_id', customerOrderIds.length > 0 ? customerOrderIds : ['none'])
        .limit(1000),
      supabase
        .from('order_item_details')
        .select('product_name, quantity, total_price, order_id')
        .in('order_id', guestOrderIds.length > 0 ? guestOrderIds : ['none'])
        .limit(1000),
      supabase
        .from('product_inventory')
        .select('product_name, available_stock, low_stock_threshold, updated_at')
        .eq('is_active', true)
        .limit(500)
    ]);
    
    // Combine order items from both sources
    const orderItemsResponse = {
      data: [...(customerItemsRes.data || []), ...(guestItemsRes.data || [])]
    };

    const orderItems = orderItemsResponse.data || [];
    const inventory = inventoryResponse.data || [];

    const productSales = orderItems.reduce((acc, item) => {
      if (!acc[item.product_name]) {
        acc[item.product_name] = { quantity: 0, revenue: 0, profit: 0 };
      }
      acc[item.product_name].quantity += item.quantity;
      acc[item.product_name].revenue += Number(item.total_price || 0);
      acc[item.product_name].profit += Number(item.total_price || 0) * 0.3;
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    inventory.forEach(item => {
      if (item.available_stock === 0) outOfStockCount++;
      else if (item.available_stock <= (item.low_stock_threshold || 10)) lowStockCount++;
      if (item.updated_at && new Date(item.updated_at) < thirtyDaysAgo) deadStockCount++;
    });

    setProductStats({
      topSellingProducts,
      leastSellingProducts,
      outOfStockCount,
      lowStockCount,
      deadStockCount
    });
  };

  const fetchInventoryStats = async () => {
    const { data: inventory } = await supabase
      .from('product_inventory')
      .select('stock_quantity, available_stock, reserved_stock, cost_price')
      .eq('is_active', true)
      .limit(500);

    if (inventory) {
      const totalSKUs = inventory.length;
      const availableStockUnits = inventory.reduce((sum, i) => sum + (i.available_stock || 0), 0);
      const stockValueAtCost = inventory.reduce((sum, i) => sum + (i.stock_quantity * Number(i.cost_price || 0)), 0);
      const totalStock = inventory.reduce((sum, i) => sum + i.stock_quantity, 0);
      const totalReserved = inventory.reduce((sum, i) => sum + i.reserved_stock, 0);

      // Turnover = total units sold (reserved as proxy) relative to average stock
      const stockTurnoverRatio = totalStock > 0 ? totalReserved / (totalStock * 0.5) : 0;
      const inventoryFillRate = totalStock > 0 ? (availableStockUnits / totalStock) * 100 : 0;
      const avgDaysInventoryHeld = stockTurnoverRatio > 0 ? Math.round(365 / stockTurnoverRatio) : 0;

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

  const calculateCustomerStats = async (filteredOrders: any[], allOrders: any[]) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch only count for registered customers
    const { count: registeredCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer');

    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'customer')
      .gte('created_at', dateFilter.startDate.toISOString())
      .lte('created_at', dateFilter.endDate.toISOString())
      .limit(100);

    const validOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    const allValidOrders = allOrders.filter(o => o.status !== 'cancelled');
    const newCustomers = recentProfiles?.length || 0;
    
    // Count unique guest customers by email (from guest orders)
    const guestOrders = allValidOrders.filter(o => o.source === 'guest');
    const uniqueGuestEmails = new Set(guestOrders.map(o => o.customer_email?.toLowerCase()).filter(Boolean));
    const guestCustomersCount = uniqueGuestEmails.size;
    
    // Total customers = registered + unique guests
    const totalCustomers = (registeredCustomers || 0) + guestCustomersCount;

    type CustomerData = { count: number; total: number; name: string };
    const customerOrderCounts = validOrders.reduce((acc, o) => {
      const key = o.customer_email;
      if (!acc[key]) acc[key] = { count: 0, total: 0, name: o.customer_name };
      acc[key].count++;
      acc[key].total += Number(o.total_amount || 0);
      return acc;
    }, {} as Record<string, CustomerData>);

    const customerEntries = Object.entries(customerOrderCounts) as [string, CustomerData][];
    const returningCustomers = customerEntries.filter(([_, data]) => data.count > 1).length;
    const repeatPurchaseRate = customerEntries.length > 0 
      ? (returningCustomers / customerEntries.length) * 100 
      : 0;

    const totalOrdersCount = validOrders.length;
    const avgOrdersPerCustomer = customerEntries.length > 0 
      ? totalOrdersCount / customerEntries.length 
      : 0;

    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const customerLifetimeValue = customerEntries.length > 0 
      ? totalRevenue / customerEntries.length 
      : 0;

    const highValueCustomersCount = customerEntries.filter(([_, data]) => data.total > 10000).length;

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const activeCustomers = new Set(
      allValidOrders
        .filter(o => new Date(o.created_at || '') >= sixtyDaysAgo)
        .map(o => o.customer_email)
    ).size;
    
    const churnRate = (totalCustomers || 0) > 0 
      ? (((totalCustomers || 0) - activeCustomers) / (totalCustomers || 1)) * 100 
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
      totalCustomers: totalCustomers || 0,
      newCustomers,
      returningCustomers,
      repeatPurchaseRate,
      customerLifetimeValue,
      avgOrdersPerCustomer,
      churnRate: Math.min(churnRate, 100),
      highValueCustomersCount,
      topCustomers
    });
  };

  const fetchRevenueChartData = async (orders: any[]) => {
    // Use the date filter for chart data - orders are already filtered
    const validOrders = orders.filter(o => o.status !== 'cancelled');
    
    // Determine grouping based on date range span
    const daysDiff = Math.ceil((dateFilter.endDate.getTime() - dateFilter.startDate.getTime()) / (1000 * 60 * 60 * 24));
    let groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';
    
    if (daysDiff <= 1) {
      groupBy = 'hour';
    } else if (daysDiff <= 14) {
      groupBy = 'day';
    } else if (daysDiff <= 90) {
      groupBy = 'week';
    } else {
      groupBy = 'month';
    }

    const grouped = validOrders.reduce((acc, order) => {
      let key: string;
      const date = new Date(order.created_at);
      
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
      acc[key].revenue += Number(order.total_amount || 0);
      acc[key].orders += 1;
      return acc;
    }, {} as Record<string, RevenueDataPoint>);

    const sortedData: RevenueDataPoint[] = Object.values(grouped);
    // Sort chart data chronologically
    sortedData.sort((a, b) => {
      if (groupBy === 'hour') {
        return parseInt(a.period) - parseInt(b.period);
      }
      // For day/week/month, parse the date strings for proper ordering
      return new Date(a.period + ', 2025').getTime() - new Date(b.period + ', 2025').getTime();
    });

    setRevenueChartData(sortedData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 space-y-6">
        {/* Enhanced Header with Global Date Filter */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/10"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-1/2 -left-1/4 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
          </div>
          
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Dashboard Overview
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                      >
                        <Activity className="h-5 w-5 text-primary animate-pulse" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-muted-foreground">
                    Real-time business insights
                  </p>
                  <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(currentTime, 'h:mm:ss a')}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <DashboardDateFilter value={dateFilter} onChange={setDateFilter} />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  ordersCache.current = { data: null, timestamp: 0 };
                  fetchAllData();
                }}
                disabled={isLoading}
                className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Last Updated Indicator */}
          <div className="relative mt-4 pt-3 border-t border-primary/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Last updated: {format(lastRefreshed, 'MMM d, h:mm a')}
            </div>
          </div>
        </motion.div>

        {/* Order Source Breakdown with Toggle Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <OrderSourceBreakdown 
            stats={orderSourceStats}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
          />
        </motion.div>

        {/* Core Business Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <CoreBusinessStats {...coreStats} />
        </motion.div>

        {/* Revenue Chart - now uses global date filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <RevenueChart 
            data={revenueChartData}
            period={dateFilter.preset}
            onPeriodChange={() => {}}
          />
        </motion.div>

        {/* Time-Based & Order Performance */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TimeBasedSalesStats {...timeStats} />
          <OrderPerformanceStats {...orderStats} />
        </motion.div>

        {/* Product Performance & Inventory */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ProductPerformanceStats {...productStats} />
          <InventoryStats {...inventoryStats} />
        </motion.div>

        {/* Customer Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <CustomerStatsPanel {...customerStats} />
        </motion.div>
      </div>
    </div>
  );
}
