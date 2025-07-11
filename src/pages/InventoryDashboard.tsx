
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModernInventoryManagement } from '@/components/inventory/ModernInventoryManagement';
import { ProductListWithVariants } from '@/components/inventory/ProductListWithVariants';
import { ColorManagement } from '@/components/inventory/ColorManagement';
import { Package, List, Palette, BarChart3 } from 'lucide-react';

export default function InventoryDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management System</h1>
          <p className="text-gray-600 mt-2">Manage products, variants, and stock levels</p>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Stock Management</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span>Products & Variants</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Colors</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            <ModernInventoryManagement />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductListWithVariants />
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <ColorManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="text-center p-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Analytics coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
