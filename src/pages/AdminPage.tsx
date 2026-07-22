
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Routes, Route, Navigate } from 'react-router-dom';
import { EnhancedAdminDashboard } from '@/components/admin/EnhancedAdminDashboard';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { EnhancedOrderManagement } from '@/components/admin/EnhancedOrderManagement';
import { CustomerManagement } from '@/components/admin/CustomerManagement';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SubcategoryManagement } from '@/components/admin/SubcategoryManagement';
import { DeliveryChargeManagement } from '@/components/admin/DeliveryChargeManagement';
import { PaymentMethodManagement } from '@/components/admin/PaymentMethodManagement';
import { FAQManagement } from '@/components/admin/FAQManagement';
import { NoticeManagement } from '@/components/admin/NoticeManagement';
import { TopBarTextManagement } from '@/components/admin/TopBarTextManagement';
import { ReviewManagement } from '@/components/admin/ReviewManagement';
import { PromocodeManagement } from '@/components/admin/PromocodeManagement';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { ModernInventoryManagement } from '@/components/inventory/ModernInventoryManagement';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { AnalyticsSettings } from '@/components/admin/AnalyticsSettings';
import { BlogManagement } from '@/components/admin/BlogManagement';
import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { MediaPage } from '@/pages/admin/MediaPage';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (profile?.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the admin panel.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route index element={<EnhancedAdminDashboard />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="inventory" element={<ModernInventoryManagement />} />
              <Route path="orders" element={<EnhancedOrderManagement />} />
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="subcategories" element={<SubcategoryManagement />} />
              <Route path="delivery-charges" element={<DeliveryChargeManagement />} />
              <Route path="payments" element={<PaymentMethodManagement />} />
              <Route path="promocodes" element={<PromocodeManagement />} />
              <Route path="faqs" element={<FAQManagement />} />
              <Route path="notices" element={<NoticeManagement />} />
              <Route path="top-bar-text" element={<TopBarTextManagement />} />
              <Route path="reviews" element={<ReviewManagement />} />
              <Route path="blogs" element={<BlogManagement />} />
              <Route path="blogs/new" element={<BlogPostForm />} />
              <Route path="blogs/edit/:blogId" element={<BlogPostForm />} />
              <Route path="media" element={<MediaPage />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="analytics-settings" element={<AnalyticsSettings />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
