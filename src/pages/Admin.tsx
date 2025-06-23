
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SubcategoryManagement } from '@/components/admin/SubcategoryManagement';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { PromocodeManagement } from '@/components/admin/PromocodeManagement';
import { DeliveryChargeManagement } from '@/components/admin/DeliveryChargeManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';

function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Categories</h3>
          <p className="text-gray-600">Manage product categories</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Products</h3>
          <p className="text-gray-600">Manage your products</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Promocodes</h3>
          <p className="text-gray-600">Manage discount codes</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Delivery</h3>
          <p className="text-gray-600">Manage delivery charges</p>
        </div>
      </div>
    </div>
  );
}

function CombosPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Combos Management</h1>
      <p className="text-gray-600">Combo management feature coming soon...</p>
    </div>
  );
}

export default function Admin() {
  const { user, isLoading } = useAuth();
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
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <SidebarInset>
          <Header />
          <div className="flex-1 flex flex-col">
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center px-4">
                <SidebarTrigger className="-ml-1" />
              </div>
            </div>
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/categories" element={<CategoryManagement />} />
                <Route path="/subcategories" element={<SubcategoryManagement />} />
                <Route path="/products" element={<ProductManagement />} />
                <Route path="/combos" element={<CombosPlaceholder />} />
                <Route path="/promocodes" element={<PromocodeManagement />} />
                <Route path="/delivery-charges" element={<DeliveryChargeManagement />} />
              </Routes>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
