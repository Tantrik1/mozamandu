
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  totalRevenue: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 DashboardStats: Starting stats fetch');

    // Set timeout fallback
    loadingTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('⚠️ DashboardStats: Loading timeout after 10 seconds');
        setError('Loading took too long. Please try again.');
        setIsLoading(false);
      }
    }, 10000);

    const fetchStats = async () => {
      try {
        console.log('🔄 DashboardStats: Fetching dashboard stats...');
        // Fetch from BOTH order tables (guest + customer orders)
        const [guestOrdersResponse, customerOrdersResponse, productsResponse, customersResponse] = await Promise.all([
          supabase.from('orders').select('total_amount'),
          supabase.from('customer_orders').select('total_amount'),
          supabase.from('products').select('id'),
          supabase.from('profiles').select('id').eq('role', 'customer'),
        ]);

        if (!isMounted) return;

        // Check for errors
        if (guestOrdersResponse.error) {
          console.error('❌ DashboardStats: Error fetching guest orders:', guestOrdersResponse.error);
          if (guestOrdersResponse.error.code === 'PGRST116' || guestOrdersResponse.error.message.includes('row-level security')) {
            console.warn('⚠️ DashboardStats: RLS may be blocking guest orders access');
          }
        }

        if (customerOrdersResponse.error) {
          console.error('❌ DashboardStats: Error fetching customer orders:', customerOrdersResponse.error);
          if (customerOrdersResponse.error.code === 'PGRST116' || customerOrdersResponse.error.message.includes('row-level security')) {
            console.warn('⚠️ DashboardStats: RLS may be blocking customer orders access');
          }
        }

        if (productsResponse.error) {
          console.error('❌ DashboardStats: Error fetching products:', productsResponse.error);
          if (productsResponse.error.code === 'PGRST116' || productsResponse.error.message.includes('row-level security')) {
            console.warn('⚠️ DashboardStats: RLS may be blocking products access');
          }
        }

        if (customersResponse.error) {
          console.error('❌ DashboardStats: Error fetching customers:', customersResponse.error);
          if (customersResponse.error.code === 'PGRST116' || customersResponse.error.message.includes('row-level security')) {
            console.warn('⚠️ DashboardStats: RLS may be blocking customers access');
          }
        }

        // Combine orders from both tables
        const allOrders = [
          ...(guestOrdersResponse.data || []),
          ...(customerOrdersResponse.data || [])
        ];

        const totalOrders = allOrders.length;
        const totalProducts = productsResponse.data?.length || 0;
        const totalCustomers = customersResponse.data?.length || 0;
        const totalRevenue = allOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

        console.log('✅ DashboardStats: Stats calculated:', { totalOrders, totalProducts, totalCustomers, totalRevenue });

        setStats({
          totalOrders,
          totalProducts,
          totalCustomers,
          totalRevenue,
        });
        setError(null);
      } catch (error) {
        console.error('❌ DashboardStats: Exception during stats fetch:', error);
        if (isMounted) {
          setError('Failed to load dashboard stats. Please try again.');
        }
      } finally {
        if (isMounted) {
          console.log('✅ DashboardStats: Setting loading to false');
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    fetchStats();

    return () => {
      console.log('🧹 DashboardStats: Cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, []);

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
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

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
