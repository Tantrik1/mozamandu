import { useAuth } from '@/hooks/useAuth';
import { Navigate, Routes, Route } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SubcategoryManagement } from '@/components/admin/SubcategoryManagement';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { EnhancedOrderManagement } from '@/components/admin/EnhancedOrderManagement';
import { CustomerManagement } from '@/components/admin/CustomerManagement';
import { ComboManagement } from '@/components/admin/ComboManagement';
import { PromocodeManagement } from '@/components/admin/PromocodeManagement';
import { PaymentMethodManagement } from '@/components/admin/PaymentMethodManagement';
import { DeliveryChargeManagement } from '@/components/admin/DeliveryChargeManagement';
import { NoticeManagement } from '@/components/admin/NoticeManagement';
import { TopBarTextManagement } from '@/components/admin/TopBarTextManagement';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { FAQManagement } from '@/components/admin/FAQManagement';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { OrdersChart } from '@/components/admin/OrdersChart';
import { TopProducts } from '@/components/admin/TopProducts';
import { TopCustomers } from '@/components/admin/TopCustomers';
import { RecentNotifications } from '@/components/admin/RecentNotifications';
import { RevenueOverview } from '@/components/admin/RevenueOverview';
import { OrderAnalytics } from '@/components/admin/OrderAnalytics';
import { CustomerAnalytics } from '@/components/admin/CustomerAnalytics';
import { RefreshCw } from 'lucide-react';
import { NavbarManagement } from '@/components/admin/NavbarManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Comprehensive business analytics and insights</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardStats />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrdersChart />
            <div className="grid grid-cols-1 gap-6">
              <TopProducts />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopCustomers />
            <RecentNotifications />
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueOverview />
        </TabsContent>

        <TabsContent value="orders">
          <OrderAnalytics />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EnhancedAdmin() {
  const { user, userProfile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="subcategories" element={<SubcategoryManagement />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="orders" element={<EnhancedOrderManagement />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="combos" element={<ComboManagement />} />
            <Route path="promocodes" element={<PromocodeManagement />} />
            <Route path="payments" element={<PaymentMethodManagement />} />
            <Route path="delivery-charges" element={<DeliveryChargeManagement />} />
            <Route path="notices" element={<NoticeManagement />} />
            <Route path="top-bar-text" element={<TopBarTextManagement />} />
            <Route path="navbar" element={<NavbarManagement />} />
            <Route path="faqs" element={<FAQManagement />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
}
