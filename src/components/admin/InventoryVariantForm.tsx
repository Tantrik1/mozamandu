
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
import { 
  getProductInventory, 
  getInventorySummary, 
  syncProductToInventory,
  createInventoryItem,
  deleteInventoryItem,
  addStock,
  InventoryItem,
  InventorySummary 
} from '@/utils/inventoryManager';
import { useRealTimeInventory } from '@/hooks/useRealTimeInventory';
import { RealTimeStockIndicator } from '@/components/inventory/RealTimeStockIndicator';
import { InventoryManagementPanel } from '@/components/inventory/InventoryManagementPanel';

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
  const [stockUpdates, setStockUpdates] = useState<{ [key: string]: number }>({});
  const [newVariant, setNewVariant] = useState<NewVariantForm>({
    colorName: '',
    sizeName: '',
    sizeCode: '',
    stockQuantity: 0
  });

  // Real-time inventory monitoring
  const { lastUpdate, refetch } = useRealTimeInventory({
    productId,
    enableRealTime: true
  });

  useEffect(() => {
    if (productId) {
      loadInventory();
    }
  }, [productId, lastUpdate]);

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

  const handleStockUpdate = async (inventoryId: string, stockToAdd: number) => {
    if (stockToAdd <= 0) return;

    try {
      const success = await addStock(inventoryId, stockToAdd, 'Manual stock addition');
      
      if (success) {
        toast({
          title: 'Success',
          description: `Added ${stockToAdd} units to inventory`,
        });
        setStockUpdates(prev => ({ ...prev, [inventoryId]: 0 }));
        await loadInventory();
      } else {
        throw new Error('Failed to add stock');
      }
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

  if (isLoading) {
    return <div className="text-center py-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Inventory Management Panel */}
      <InventoryManagementPanel productId={productId} />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Product Inventory Variants</CardTitle>
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
                      <Label htmlFor="stockQuantity">Initial Stock Quantity *</Label>
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
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Add Stock</TableHead>
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
                      <RealTimeStockIndicator
                        productId={item.product_id}
                        productInventoryId={item.id}
                        showDetails={true}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          className="w-20"
                          value={stockUpdates[item.id] || ''}
                          onChange={(e) => setStockUpdates(prev => ({
                            ...prev,
                            [item.id]: parseInt(e.target.value) || 0
                          }))}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleStockUpdate(item.id, stockUpdates[item.id] || 0)}
                          disabled={!stockUpdates[item.id] || stockUpdates[item.id] <= 0}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
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
