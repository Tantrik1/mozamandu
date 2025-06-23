
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SubcategoryManagement } from '@/components/admin/SubcategoryManagement';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>
          
          <TabsContent value="subcategories">
            <SubcategoryManagement />
          </TabsContent>
          
          <TabsContent value="products">
            <ProductManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
