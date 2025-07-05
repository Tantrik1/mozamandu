
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Save, RefreshCw, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  getProductInventory, 
  getInventorySummary, 
  syncProductToInventory,
  createInventoryItem,
  deleteInventoryItem,
  InventoryItem,
  InventorySummary 
} from '@/utils/inventoryManager';

interface InventoryVariantFormProps {
  productId?: string;
  productName: string;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  costPrice: number;
  sellingPrice?: number | null;
  onInventoryChange: (summary: InventorySummary) => void;
}

interface NewVariantForm {
  colorName: string;
  sizeName: string;
  sizeCode: string;
  stockQuantity: number;
}

export function InventoryVariantForm({
  productId,
  productName,
  hasColorVariants,
  hasSizeVariants,
  costPrice,
  sellingPrice,
  onInventoryChange
}: InventoryVariantFormProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    total_stock: 0,
    available_stock: 0,
    reserved_stock: 0,
    variant_count: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newVariant, setNewVariant] = useState<NewVariantForm>({
    colorName: '',
    sizeName: '',
    sizeCode: '',
    stockQuantity: 0
  });

  useEffect(() => {
    if (productId) {
      loadInventory();
    }
  }, [productId]);

  const loadInventory = async () => {
    if (!productId) return;

    try {
      setIsLoading(true);
      const [inventoryData, summaryData] = await Promise.all([
        getProductInventory(productId),
        getInventorySummary(productId)
      ]);
      
      setInventory(inventoryData);
      setSummary(summaryData);
      onInventoryChange(summaryData);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!productId) return;

    try {
      setIsSyncing(true);
      await syncProductToInventory(productId);
      await loadInventory();
      toast({
        title: 'Success',
        description: 'Inventory synced successfully',
      });
    } catch (error) {
      console.error('Error syncing inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync inventory',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStockUpdate = async (inventoryId: string, newStock: number) => {
    try {
      const item = inventory.find(i => i.id === inventoryId);
      if (!item) return;

      const stockChange = newStock - item.stock_quantity;
      
      // Update in database
      const { error } = await supabase
        .from('product_inventory')
        .update({ stock_quantity: newStock })
        .eq('id', inventoryId);

      if (error) throw error;

      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === inventoryId 
          ? { ...item, stock_quantity: newStock, available_stock: newStock - item.reserved_stock }
          : item
      ));

      // Refresh summary
      await loadInventory();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stock',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (inventoryId: string) => {
    try {
      await deleteInventoryItem(inventoryId);
      setInventory(prev => prev.filter(item => item.id !== inventoryId));
      await loadInventory();
      toast({
        title: 'Success',
        description: 'Inventory item deleted',
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete inventory item',
        variant: 'destructive',
      });
    }
  };

  const handleAddVariant = async () => {
    if (!productId) return;

    try {
      const item = {
        product_id: productId,
        product_name: productName,
        color_name: hasColorVariants ? newVariant.colorName : null,
        size_name: hasSizeVariants ? newVariant.sizeName : null,
        size_code: hasSizeVariants ? newVariant.sizeCode : null,
        stock_quantity: newVariant.stockQuantity,
        cost_price: costPrice,
        selling_price: sellingPrice,
        color_variant_id: null,
        size_variant_id: null
      };

      await createInventoryItem(item);
      setNewVariant({
        colorName: '',
        sizeName: '',
        sizeCode: '',
        stockQuantity: 0
      });
      setIsAddDialogOpen(false);
      await loadInventory();
      
      toast({
        title: 'Success',
        description: 'Variant added successfully',
      });
    } catch (error) {
      console.error('Error adding variant:', error);
      toast({
        title: 'Error',
        description: 'Failed to add variant',
        variant: 'destructive',
      });
    }
  };

  const handleEditItem = async (item: InventoryItem) => {
    try {
      const { error } = await supabase
        .from('product_inventory')
        .update({
          color_name: item.color_name,
          size_name: item.size_name,
          size_code: item.size_code,
          stock_quantity: item.stock_quantity,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      setEditingItem(null);
      await loadInventory();
      
      toast({
        title: 'Success',
        description: 'Variant updated successfully',
      });
    } catch (error) {
      console.error('Error updating variant:', error);
      toast({
        title: 'Error',
        description: 'Failed to update variant',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventory Management</CardTitle>
              <div className="flex gap-4 mt-2">
                <Badge variant="outline">Total: {summary.total_stock}</Badge>
                <Badge variant="outline" className="text-green-600">Available: {summary.available_stock}</Badge>
                <Badge variant="outline" className="text-orange-600">Reserved: {summary.reserved_stock}</Badge>
                <Badge variant="secondary">Variants: {summary.variant_count}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Variant</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {hasColorVariants && (
                      <div>
                        <Label htmlFor="colorName">Color Name *</Label>
                        <Input
                          id="colorName"
                          value={newVariant.colorName}
                          onChange={(e) => setNewVariant(prev => ({ ...prev, colorName: e.target.value }))}
                          placeholder="Enter color name"
                        />
                      </div>
                    )}
                    {hasSizeVariants && (
                      <>
                        <div>
                          <Label htmlFor="sizeName">Size Name *</Label>
                          <Input
                            id="sizeName"
                            value={newVariant.sizeName}
                            onChange={(e) => setNewVariant(prev => ({ ...prev, sizeName: e.target.value }))}
                            placeholder="Enter size name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sizeCode">Size Code</Label>
                          <Input
                            id="sizeCode"
                            value={newVariant.sizeCode}
                            onChange={(e) => setNewVariant(prev => ({ ...prev, sizeCode: e.target.value }))}
                            placeholder="Enter size code"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                      <Input
                        id="stockQuantity"
                        type="number"
                        min="0"
                        value={newVariant.stockQuantity}
                        onChange={(e) => setNewVariant(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddVariant}>
                        Add Variant
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                onClick={handleSync} 
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Inventory'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {inventory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  {hasColorVariants && <TableHead>Color</TableHead>}
                  {hasSizeVariants && <TableHead>Size</TableHead>}
                  <TableHead>Stock</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    {hasColorVariants && (
                      <TableCell>
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem.color_name || ''}
                            onChange={(e) => setEditingItem({...editingItem, color_name: e.target.value})}
                            className="w-24"
                          />
                        ) : (
                          item.color_name || '-'
                        )}
                      </TableCell>
                    )}
                    {hasSizeVariants && (
                      <TableCell>
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem.size_name || ''}
                            onChange={(e) => setEditingItem({...editingItem, size_name: e.target.value})}
                            className="w-20"
                          />
                        ) : (
                          item.size_name || '-'
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          type="number"
                          min="0"
                          value={editingItem.stock_quantity}
                          onChange={(e) => setEditingItem({...editingItem, stock_quantity: parseInt(e.target.value) || 0})}
                          className="w-20"
                        />
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          value={item.stock_quantity}
                          onChange={(e) => {
                            const newStock = parseInt(e.target.value) || 0;
                            handleStockUpdate(item.id, newStock);
                          }}
                          className="w-20"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600">
                        {item.available_stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600">
                        {item.reserved_stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingItem?.id === item.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(editingItem)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingItem(null)}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              ✕
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingItem(item)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No inventory items found.</p>
              <p className="text-sm text-gray-400 mb-4">
                This usually means the product hasn't been synced to the new inventory system yet.
              </p>
              <Button onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
