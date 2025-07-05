
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save, RefreshCw } from 'lucide-react';
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
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Inventory'}
            </Button>
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
                    {hasColorVariants && <TableCell>{item.color_name || '-'}</TableCell>}
                    {hasSizeVariants && <TableCell>{item.size_name || '-'}</TableCell>}
                    <TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
