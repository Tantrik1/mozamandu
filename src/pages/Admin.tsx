import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SubcategoryManagement } from '@/components/admin/SubcategoryManagement';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { ComboManagement } from '@/components/admin/ComboManagement';
import { PromocodeManagement } from '@/components/admin/PromocodeManagement';
import { PaymentMethodManagement } from '@/components/admin/PaymentMethodManagement';
import { DeliveryChargeManagement } from '@/components/admin/DeliveryChargeManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
function AdminDashboard() {
  return <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Categories</h3>
          <p className="text-gray-600">Manage product categories</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Products</h3>
          <p className="text-gray-600">Manage your products</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Combos</h3>
          <p className="text-gray-600">Manage product combos</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Payments</h3>
          <p className="text-gray-600">Manage payment methods</p>
        </div>
      </div>
    </div>;
}
export default function Admin() {
  const {
    user,
    isLoading
  } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchUserProfile();
    }
  }, [user, isLoading, navigate]);
  const fetchUserProfile = async () => {
    if (!user) return;
    const {
      data,
      error
    } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) {
      console.error('Error fetching user profile:', error);
      return;
    }
    setUserProfile(data);
    if (data?.role !== 'admin') {
      navigate('/');
    }
  };
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!user || userProfile?.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center">Access denied. Admin only.</div>;
  }
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <main className="h-screen overflow-auto bg-white px-[40px] py-[15px]">
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/categories" element={<CategoryManagement />} />
              <Route path="/subcategories" element={<SubcategoryManagement />} />
              <Route path="/products" element={<ProductManagement />} />
              <Route path="/combos" element={<ComboManagement />} />
              <Route path="/promocodes" element={<PromocodeManagement />} />
              <Route path="/payments" element={<PaymentMethodManagement />} />
              <Route path="/delivery-charges" element={<DeliveryChargeManagement />} />
            </Routes>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>;
}