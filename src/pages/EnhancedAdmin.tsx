
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedProductForm } from '@/components/admin/EnhancedProductForm';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { OrderManagement } from '@/components/admin/OrderManagement';
import { CustomerOrderManagement } from '@/components/admin/CustomerOrderManagement';
import { PaymentMethodManagement } from '@/components/admin/PaymentMethodManagement';
import { DeliveryChargeManagement } from '@/components/admin/DeliveryChargeManagement';
import { PromocodeManagement } from '@/components/admin/PromocodeManagement';
import { ComboManagement } from '@/components/admin/ComboManagement';
import { DiscountTierManagement } from '@/components/admin/DiscountTierManagement';
import { NoticeManagement } from '@/components/admin/NoticeManagement';
import { FAQManagement } from '@/components/admin/FAQManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { NavbarManagement } from '@/components/admin/NavbarManagement';
import { TopBarManagement } from '@/components/admin/TopBarManagement';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  Truck, 
  Tag, 
  Gift,
  TrendingDown,
  Bell,
  HelpCircle,
  Settings,
  Navigation,
  MessageSquare,
  LogOut,
  DollarSign,
  TrendingUp,
  Eye,
  Plus
} from 'lucide-react';

type AdminView = 'dashboard' | 'products' | 'create-product' | 'categories' | 'orders' | 'customer-orders' | 'users' | 'payments' | 'delivery' | 'promocodes' | 'combos' | 'discounts' | 'notices' | 'faqs' | 'navbar' | 'topbar';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  recentOrders: any[];
  lowStockProducts: any[];
}

export default function EnhancedAdmin() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    recentOrders: [],
    lowStockProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchDashboardStats();
    }
  }, [currentView]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch basic stats
      const [productsResult, ordersResult, customersResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, total_amount', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' })
      ]);

      const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalCustomers: customersResult.count || 0,
        totalRevenue,
        recentOrders: recentOrders || [],
        lowStockProducts: [] // Empty since inventory system is removed
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'create-product':
        return (
          <EnhancedProductForm
            onSave={() => setCurrentView('dashboard')}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'categories':
        return <CategoryManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'customer-orders':
        return <CustomerOrderManagement />;
      case 'users':
        return <UserManagement />;
      case 'payments':
        return <PaymentMethodManagement />;
      case 'delivery':
        return <DeliveryChargeManagement />;
      case 'promocodes':
        return <PromocodeManagement />;
      case 'combos':
        return <ComboManagement />;
      case 'discounts':
        return <DiscountTierManagement />;
      case 'notices':
        return <NoticeManagement />;
      case 'faqs':
        return <FAQManagement />;
      case 'navbar':
        return <NavbarManagement />;
      case 'topbar':
        return <TopBarManagement />;
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Enhanced Admin Dashboard</h1>
              <div className="flex space-x-2">
                <Badge variant="outline">Welcome back, Admin!</Badge>
                <Button onClick={() => setCurrentView('create-product')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rs. {stats.totalRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-gray-500">{order.customer_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Rs. {order.total_amount}</p>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No recent orders</p>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Enhanced Admin</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        
        <nav className="mt-4">
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main</h3>
          </div>
          <Button
            variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('dashboard')}
          >
            <TrendingUp className="mr-3 h-4 w-4" />
            Dashboard
          </Button>

          <div className="px-4 py-2 mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Products</h3>
          </div>
          <Button
            variant={currentView === 'create-product' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('create-product')}
          >
            <Package className="mr-3 h-4 w-4" />
            Create Product
          </Button>
          <Button
            variant={currentView === 'categories' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('categories')}
          >
            <Tag className="mr-3 h-4 w-4" />
            Categories
          </Button>

          <div className="px-4 py-2 mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</h3>
          </div>
          <Button
            variant={currentView === 'orders' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('orders')}
          >
            <ShoppingCart className="mr-3 h-4 w-4" />
            Guest Orders
          </Button>
          <Button
            variant={currentView === 'customer-orders' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('customer-orders')}
          >
            <Eye className="mr-3 h-4 w-4" />
            Customer Orders
          </Button>

          <div className="px-4 py-2 mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Users</h3>
          </div>
          <Button
            variant={currentView === 'users' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('users')}
          >
            <Users className="mr-3 h-4 w-4" />
            Users
          </Button>

          <div className="px-4 py-2 mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</h3>
          </div>
          <Button
            variant={currentView === 'payments' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('payments')}
          >
            <CreditCard className="mr-3 h-4 w-4" />
            Payment Methods
          </Button>
          <Button
            variant={currentView === 'delivery' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('delivery')}
          >
            <Truck className="mr-3 h-4 w-4" />
            Delivery Charges
          </Button>
          <Button
            variant={currentView === 'promocodes' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('promocodes')}
          >
            <Tag className="mr-3 h-4 w-4" />
            Promocodes
          </Button>
          <Button
            variant={currentView === 'combos' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('combos')}
          >
            <Gift className="mr-3 h-4 w-4" />
            Combos
          </Button>
          <Button
            variant={currentView === 'discounts' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('discounts')}
          >
            <TrendingDown className="mr-3 h-4 w-4" />
            Discount Tiers
          </Button>

          <div className="px-4 py-2 mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Content</h3>
          </div>
          <Button
            variant={currentView === 'notices' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('notices')}
          >
            <Bell className="mr-3 h-4 w-4" />
            Notices
          </Button>
          <Button
            variant={currentView === 'faqs' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('faqs')}
          >
            <HelpCircle className="mr-3 h-4 w-4" />
            FAQs
          </Button>
          <Button
            variant={currentView === 'navbar' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('navbar')}
          >
            <Navigation className="mr-3 h-4 w-4" />
            Navbar
          </Button>
          <Button
            variant={currentView === 'topbar' ? 'secondary' : 'ghost'}
            className="w-full justify-start px-4 py-2"
            onClick={() => setCurrentView('topbar')}
          >
            <MessageSquare className="mr-3 h-4 w-4" />
            Top Bar
          </Button>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
