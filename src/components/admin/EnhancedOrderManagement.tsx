
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminOrdersPage } from './AdminOrdersPage';
import { CustomerOrderManagement } from './CustomerOrderManagement';

export function EnhancedOrderManagement() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Order Management</h1>
      
      <Tabs defaultValue="all-orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-orders">All Orders (Guest + Admin)</TabsTrigger>
          <TabsTrigger value="customer-orders">Customer Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-orders" className="mt-6">
          <AdminOrdersPage />
        </TabsContent>
        
        <TabsContent value="customer-orders" className="mt-6">
          <CustomerOrderManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
