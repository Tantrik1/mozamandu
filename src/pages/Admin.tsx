
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SubcategoryManagement } from '@/components/admin/SubcategoryManagement';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { EnhancedOrderManagement } from '@/components/admin/EnhancedOrderManagement';
import { CustomerManagement } from '@/components/admin/CustomerManagement';
import { ComboManagement } from '@/components/admin/ComboManagement';
import { PromocodeManagement } from '@/components/admin/PromocodeManagement';
import { PaymentMethodManagement } from '@/components/admin/PaymentMethodManagement';
import { DeliveryChargeManagement } from '@/components/admin/DeliveryChargeManagement';
import { NoticeManagement } from '@/components/admin/NoticeManagement';
import { TopBarTextManagement } from '@/components/admin/TopBarTextManagement';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { SidebarProvider } from '@/components/ui/sidebar';

function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Total Orders</h2>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Total Products</h2>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Total Customers</h2>
          <p className="text-3xl font-bold text-purple-600">0</p>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, userProfile } = useAuth();

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
            <Route path="orders" element={<EnhancedOrderManagement />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="combos" element={<ComboManagement />} />
            <Route path="promocodes" element={<PromocodeManagement />} />
            <Route path="payments" element={<PaymentMethodManagement />} />
            <Route path="delivery-charges" element={<DeliveryChargeManagement />} />
            <Route path="notices" element={<NoticeManagement />} />
            <Route path="top-bar-text" element={<TopBarTextManagement />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
}
