
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useInventoryManager } from '@/hooks/useInventoryManager';

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  category_name: string;
  subcategory_name: string;
  color_name?: string;
  size_name?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  cost_price: number;
  selling_price?: number;
  is_active: boolean;
}

export function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const { toast } = useToast();
  const { updateStock } = useInventoryManager();

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    const filtered = inventory.filter(item =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.size_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInventory(filtered);
  }, [inventory, searchTerm]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('product_inventory')
        .select('*')
        .order('product_name, color_name, size_name');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem || !stockAdjustment || !adjustmentReason) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateStock(
        selectedItem.id,
        parseInt(stockAdjustment),
        adjustmentReason,
        selectedItem.color_name || undefined,
        selectedItem.size_name || undefined
      );

      setSelectedItem(null);
      setStockAdjustment('');
      setAdjustmentReason('');
      fetchInventory();
    } catch (error) {
      // Error handling is done in the updateStock function
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.available_stock === 0) {
      return { status: 'Out of Stock', variant: 'destructive' as const };
    } else if (item.available_stock <= item.low_stock_threshold) {
      return { status: 'Low Stock', variant: 'secondary' as const };
    } else {
      return { status: 'In Stock', variant: 'default' as const };
    }
  };

  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => item.available_stock <= item.low_stock_threshold && item.available_stock > 0).length;
  const outOfStockItems = inventory.filter(item => item.available_stock === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.cost_price * item.stock_quantity), 0);

  if (loading) {
    return <div className="flex justify-center p-8">Loading inventory...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{outOfStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Variant</th>
                  <th className="text-left p-2">Stock</th>
                  <th className="text-left p-2">Reserved</th>
                  <th className="text-left p-2">Available</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="p-2 font-mono text-sm">{item.sku}</td>
                      <td className="p-2">{item.product_name}</td>
                      <td className="p-2">{item.category_name} &gt; {item.subcategory_name}</td>
                      <td className="p-2">
                        {item.color_name && (
                          <Badge variant="outline" className="mr-1">{item.color_name}</Badge>
                        )}
                        {item.size_name && (
                          <Badge variant="outline">{item.size_name}</Badge>
                        )}
                        {!item.color_name && !item.size_name && '-'}
                      </td>
                      <td className="p-2">{item.stock_quantity}</td>
                      <td className="p-2">{item.reserved_stock}</td>
                      <td className="p-2">{item.available_stock}</td>
                      <td className="p-2">
                        <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
                      </td>
                      <td className="p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Adjust Stock</CardTitle>
              <p className="text-sm text-gray-600">
                {selectedItem.product_name} ({selectedItem.sku})
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Stock</label>
                <p className="text-lg font-semibold">{selectedItem.stock_quantity}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Stock Adjustment</label>
                <Input
                  type="number"
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  placeholder="Enter adjustment (+ or -)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use positive numbers to add stock, negative to reduce
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Reason for adjustment"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleStockAdjustment} className="flex-1">
                  Apply Adjustment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedItem(null);
                    setStockAdjustment('');
                    setAdjustmentReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
