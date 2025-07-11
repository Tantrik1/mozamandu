
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, Download, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InventoryStats } from './InventoryStats';
import { InventoryTable } from './InventoryTable';

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  category_name?: string;
  subcategory_name?: string;
  color_name?: string;
  size_name?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  cost_price: number;
  selling_price?: number;
  is_active: boolean;
  updated_at: string;
}

export function ModernInventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Stats calculations
  const stats = {
    totalItems: filteredInventory.length,
    availableStock: filteredInventory.reduce((sum, item) => sum + item.available_stock, 0),
    lowStockItems: filteredInventory.filter(item => 
      item.available_stock <= item.low_stock_threshold && item.available_stock > 0
    ).length,
    outOfStockItems: filteredInventory.filter(item => item.available_stock === 0).length,
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventory, searchTerm, statusFilter, activeTab]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_inventory')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = inventory;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.size_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        switch (statusFilter) {
          case 'in-stock':
            return item.available_stock > item.low_stock_threshold;
          case 'low-stock':
            return item.available_stock <= item.low_stock_threshold && item.available_stock > 0;
          case 'out-of-stock':
            return item.available_stock === 0;
          case 'active':
            return item.is_active;
          case 'inactive':
            return !item.is_active;
          default:
            return true;
        }
      });
    }

    // Tab-specific filtering
    if (activeTab === 'low-stock') {
      filtered = filtered.filter(item => 
        item.available_stock <= item.low_stock_threshold && item.available_stock > 0
      );
    } else if (activeTab === 'manual-updates') {
      // Show items that need manual attention (very low stock or recently updated)
      filtered = filtered.filter(item => 
        item.available_stock <= 5 || 
        new Date(item.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
    } else if (activeTab === 'audit-trail') {
      // Show all items with recent activity
      filtered = filtered.filter(item => 
        new Date(item.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
    }

    setFilteredInventory(filtered);
  };

  const exportInventory = async () => {
    try {
      const csv = [
        ['SKU', 'Product', 'Category', 'Subcategory', 'Color', 'Size', 'Stock', 'Reserved', 'Available', 'Status'].join(','),
        ...filteredInventory.map(item => [
          item.sku,
          `"${item.product_name}"`,
          item.category_name || '',
          item.subcategory_name || '',
          item.color_name || '',
          item.size_name || '',
          item.stock_quantity,
          item.reserved_stock,
          item.available_stock,
          item.available_stock === 0 ? 'Out of Stock' : 
          item.available_stock <= item.low_stock_threshold ? 'Low Stock' : 'In Stock'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Inventory exported successfully',
      });
    } catch (error) {
      console.error('Error exporting inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to export inventory',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <InventoryStats {...stats} />

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="manual-updates">Manual Updates</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportInventory}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={fetchInventory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Inventory Overview ({filteredInventory.length} items)
            </h3>
          </div>
          <InventoryTable items={filteredInventory} onRefresh={fetchInventory} />
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-yellow-600">
              Low Stock Items ({filteredInventory.length} items)
            </h3>
          </div>
          <InventoryTable items={filteredInventory} onRefresh={fetchInventory} />
        </TabsContent>

        <TabsContent value="manual-updates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-blue-600">
              Manual Updates ({filteredInventory.length} items)
            </h3>
          </div>
          <InventoryTable items={filteredInventory} onRefresh={fetchInventory} />
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-purple-600">
              Recent Activity ({filteredInventory.length} items)
            </h3>
          </div>
          <InventoryTable items={filteredInventory} onRefresh={fetchInventory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
