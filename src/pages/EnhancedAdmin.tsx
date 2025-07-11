import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { EnhancedOrderManagement } from '@/components/admin/EnhancedOrderManagement';
import { CustomerManagement } from '@/components/admin/CustomerManagement';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SubcategoryManagement } from '@/components/admin/SubcategoryManagement';
import { ComboManagement } from '@/components/admin/ComboManagement';
import { DeliveryChargeManagement } from '@/components/admin/DeliveryChargeManagement';
import { PaymentMethodManagement } from '@/components/admin/PaymentMethodManagement';
import { FAQManagement } from '@/components/admin/FAQManagement';
import { NoticeManagement } from '@/components/admin/NoticeManagement';
import { TopBarTextManagement } from '@/components/admin/TopBarTextManagement';
import { NavbarManagement } from '@/components/admin/NavbarManagement';
import { PromocodeManagement } from '@/components/admin/PromocodeManagement';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { InventoryManagement } from '@/components/admin/InventoryManagement';

export default function EnhancedAdmin() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your e-commerce platform</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:grid-cols-16 gap-1">
            <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
            <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs">Customers</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">Categories</TabsTrigger>
            <TabsTrigger value="subcategories" className="text-xs">Subcategories</TabsTrigger>
            <TabsTrigger value="combos" className="text-xs">Combos</TabsTrigger>
            <TabsTrigger value="delivery" className="text-xs">Delivery</TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">Payment</TabsTrigger>
            <TabsTrigger value="promocodes" className="text-xs">Promocodes</TabsTrigger>
            <TabsTrigger value="faqs" className="text-xs">FAQs</TabsTrigger>
            <TabsTrigger value="notices" className="text-xs">Notices</TabsTrigger>
            <TabsTrigger value="topbar" className="text-xs">Top Bar</TabsTrigger>
            <TabsTrigger value="navbar" className="text-xs">Navbar</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="p-0">
              <TabsContent value="dashboard" className="m-0">
                <DashboardStats />
              </TabsContent>
              
              <TabsContent value="products" className="m-0">
                <ProductManagement />
              </TabsContent>

              <TabsContent value="inventory" className="m-0">
                <InventoryManagement />
              </TabsContent>
              
              <TabsContent value="orders" className="m-0">
                <EnhancedOrderManagement />
              </TabsContent>

              <TabsContent value="customers" className="m-0">
                <CustomerManagement />
              </TabsContent>

              <TabsContent value="categories" className="m-0">
                <CategoryManagement />
              </TabsContent>

              <TabsContent value="subcategories" className="m-0">
                <SubcategoryManagement />
              </TabsContent>

              <TabsContent value="combos" className="m-0">
                <ComboManagement />
              </TabsContent>

              <TabsContent value="delivery" className="m-0">
                <DeliveryChargeManagement />
              </TabsContent>

              <TabsContent value="payment" className="m-0">
                <PaymentMethodManagement />
              </TabsContent>

              <TabsContent value="promocodes" className="m-0">
                <PromocodeManagement />
              </TabsContent>

              <TabsContent value="faqs" className="m-0">
                <FAQManagement />
              </TabsContent>

              <TabsContent value="notices" className="m-0">
                <NoticeManagement />
              </TabsContent>

              <TabsContent value="topbar" className="m-0">
                <TopBarTextManagement />
              </TabsContent>

              <TabsContent value="navbar" className="m-0">
                <NavbarManagement />
              </TabsContent>

              <TabsContent value="settings" className="m-0">
                <AdminSettings />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
