import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminHeader } from './AdminHeader';
import { VisitorsTab } from './dashboard/VisitorsTab';
import { OrdersTab } from './dashboard/OrdersTab';
import { CustomersTab } from './dashboard/CustomersTab';
import { InventoryTab } from './dashboard/InventoryTab';
import { Users, ShoppingCart, Package, Eye } from 'lucide-react';

export function EnhancedAdminDashboard() {
  const [activeTab, setActiveTab] = useState('visitors');

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 rounded-xl border">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights and analytics for your business
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4 lg:justify-start">
            <TabsTrigger value="visitors" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Visitors</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visitors" className="space-y-6">
            <VisitorsTab />
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomersTab />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}