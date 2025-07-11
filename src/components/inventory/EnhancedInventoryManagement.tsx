
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Package, AlertCircle, Search, Filter, Download, Upload, Edit2, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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

interface StockAdjustment {
  id: string;
  adjustment: number;
  reason: string;
}

export function EnhancedInventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [bulkAdjustments, setBulkAdjustments] = useState<StockAdjustment[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventory, searchTerm, statusFilter, stockFilter]);

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
      filtered = filtered.filter(item => 
        statusFilter === 'active' ? item.is_active : !item.is_active
      );
    }

    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        switch (stockFilter) {
          case 'in-stock':
            return item.available_stock > item.low_stock_threshold;
          case 'low-stock':
            return item.available_stock <= item.low_stock_threshold && item.available_stock > 0;
          case 'out-of-stock':
            return item.available_stock === 0;
          default:
            return true;
        }
      });
    }

    setFilteredInventory(filtered);
  };

  const updateStock = async (itemId: string, change: number, reason: string) => {
    setUpdating(itemId);
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');

      const { error } = await supabase.rpc('safe_update_stock', {
        p_product_id: null, // Using inventory ID directly
        p_stock_change: change,
        p_color_variant_id: null,
        p_size_variant_id: null,
        p_reservation_change: 0,
        p_reason: reason,
        p_transaction_type: 'adjust'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Stock ${change > 0 ? 'increased' : 'decreased'} successfully`,
      });

      fetchInventory(); // Refresh data
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stock',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const updateInventoryItem = async (updatedItem: InventoryItem) => {
    try {
      const { error } = await supabase
        .from('product_inventory')
        .update({
          sku: updatedItem.sku,
          stock_quantity: updatedItem.stock_quantity,
          low_stock_threshold: updatedItem.low_stock_threshold,
          cost_price: updatedItem.cost_price,
          selling_price: updatedItem.selling_price,
          is_active: updatedItem.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedItem.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Inventory item updated successfully',
      });

      setEditingItem(null);
      fetchInventory();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update inventory item',
        variant: 'destructive',
      });
    }
  };

  const processBulkAdjustments = async () => {
    try {
      const validAdjustments = bulkAdjustments.filter(adj => adj.adjustment !== 0 && adj.reason.trim());
      
      if (validAdjustments.length === 0) {
        toast({
          title: 'Warning',
          description: 'No valid adjustments to process',
          variant: 'destructive',
        });
        return;
      }

      for (const adjustment of validAdjustments) {
        await updateStock(adjustment.id, adjustment.adjustment, adjustment.reason);
      }

      setBulkAdjustments([]);
      setShowBulkDialog(false);
      
      toast({
        title: 'Success',
        description: `Processed ${validAdjustments.length} bulk adjustments`,
      });
    } catch (error) {
      console.error('Error processing bulk adjustments:', error);
      toast({
        title: 'Error',
        description: 'Failed to process bulk adjustments',
        variant: 'destructive',
      });
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.available_stock === 0) return { status: 'Out of Stock', color: 'destructive' as const };
    if (item.available_stock <= item.low_stock_threshold) return { status: 'Low Stock', color: 'secondary' as const };
    return { status: 'In Stock', color: 'default' as const };
  };

  const exportInventory = async () => {
    try {
      const csv = [
        ['SKU', 'Product', 'Category', 'Subcategory', 'Color', 'Size', 'Stock', 'Reserved', 'Available', 'Cost Price', 'Selling Price', 'Status'].join(','),
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
          item.cost_price,
          item.selling_price || '',
          getStockStatus(item).status
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Enhanced Inventory Management</h2>
        <div className="flex space-x-2">
          <Button onClick={exportInventory} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Adjust
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Bulk Stock Adjustments</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {filteredInventory.slice(0, 10).map((item) => (
                  <div key={item.id} className="grid grid-cols-5 gap-4 items-center p-4 border rounded">
                    <div>
                      <p className="font-medium">{item.sku}</p>
                      <p className="text-sm text-gray-600">{item.product_name}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Current: {item.available_stock}</p>
                    </div>
                    <Input
                      type="number"
                      placeholder="±0"
                      onChange={(e) => {
                        const adjustment = parseInt(e.target.value) || 0;
                        setBulkAdjustments(prev => 
                          prev.filter(a => a.id !== item.id).concat({
                            id: item.id,
                            adjustment,
                            reason: prev.find(a => a.id === item.id)?.reason || ''
                          })
                        );
                      }}
                    />
                    <Input
                      placeholder="Reason for adjustment"
                      onChange={(e) => {
                        const reason = e.target.value;
                        setBulkAdjustments(prev => 
                          prev.filter(a => a.id !== item.id).concat({
                            id: item.id,
                            adjustment: prev.find(a => a.id === item.id)?.adjustment || 0,
                            reason
                          })
                        );
                      }}
                    />
                    <div className="text-center">
                      {bulkAdjustments.find(a => a.id === item.id)?.adjustment && (
                        <Badge variant="outline">
                          {bulkAdjustments.find(a => a.id === item.id)?.adjustment! > 0 ? '+' : ''}
                          {bulkAdjustments.find(a => a.id === item.id)?.adjustment}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={processBulkAdjustments}>
                    Process Adjustments
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={fetchInventory} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredInventory.length} of {inventory.length} items
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="grid gap-4">
        {filteredInventory.map((item) => {
          const stockStatus = getStockStatus(item);
          const isEditing = editingItem?.id === item.id;
          
          return (
            <Card key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>SKU</Label>
                        <Input
                          value={editingItem.sku}
                          onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Stock Quantity</Label>
                        <Input
                          type="number"
                          value={editingItem.stock_quantity}
                          onChange={(e) => setEditingItem({...editingItem, stock_quantity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label>Low Stock Threshold</Label>
                        <Input
                          type="number"
                          value={editingItem.low_stock_threshold}
                          onChange={(e) => setEditingItem({...editingItem, low_stock_threshold: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label>Cost Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingItem.cost_price}
                          onChange={(e) => setEditingItem({...editingItem, cost_price: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label>Selling Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingItem.selling_price || ''}
                          onChange={(e) => setEditingItem({...editingItem, selling_price: parseFloat(e.target.value) || undefined})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingItem(null)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => updateInventoryItem(editingItem)}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{item.product_name}</h3>
                        <Badge variant="outline">{item.sku}</Badge>
                        {stockStatus.status === 'Low Stock' && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                        {!item.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        {item.category_name && (
                          <p><span className="font-medium">Category:</span> {item.category_name} &gt; {item.subcategory_name}</p>
                        )}
                        {(item.color_name || item.size_name) && (
                          <div className="flex space-x-4">
                            {item.color_name && (
                              <span><span className="font-medium">Color:</span> {item.color_name}</span>
                            )}
                            {item.size_name && (
                              <span><span className="font-medium">Size:</span> {item.size_name}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center space-x-6">
                          <span><span className="font-medium">Total:</span> {item.stock_quantity}</span>
                          <span><span className="font-medium">Reserved:</span> {item.reserved_stock}</span>
                          <Badge variant={stockStatus.color}>
                            Available: {item.available_stock}
                          </Badge>
                          <span><span className="font-medium">Cost:</span> Rs {item.cost_price}</span>
                          {item.selling_price && (
                            <span><span className="font-medium">Price:</span> Rs {item.selling_price}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingItem(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStock(item.id, -1, 'Manual decrease')}
                        disabled={updating === item.id || item.available_stock <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <div className="w-16 text-center font-mono text-lg">
                        {item.available_stock}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStock(item.id, 1, 'Manual increase')}
                        disabled={updating === item.id}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              {inventory.length === 0 ? 'No inventory items found' : 'No items match your filters'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
