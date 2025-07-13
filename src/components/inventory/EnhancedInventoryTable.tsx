
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Minus, RotateCcw, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedInventoryManager } from '@/hooks/useEnhancedInventoryManager';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
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

interface EnhancedInventoryTableProps {
  items: InventoryItem[];
  onRefresh: () => void;
}

export function EnhancedInventoryTable({ items, onRefresh }: EnhancedInventoryTableProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { updateStock } = useEnhancedInventoryManager();

  const getStockStatus = (item: InventoryItem) => {
    if (item.available_stock === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    }
    if (item.available_stock <= item.low_stock_threshold) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  const handleStockChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStockUpdates(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  };

  const handleUpdateStock = async (itemId: string, newStock: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const stockChange = newStock - item.stock_quantity;
    if (stockChange === 0) return;

    setUpdating(itemId);
    try {
      const success = await updateStock(
        itemId,
        stockChange,
        `Manual adjustment: ${stockChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(stockChange)}`
      );

      if (success) {
        setStockUpdates(prev => {
          const updated = { ...prev };
          delete updated[itemId];
          return updated;
        });
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating stock:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleQuickAdjust = async (itemId: string, change: number) => {
    setUpdating(itemId);
    try {
      const success = await updateStock(
        itemId,
        change,
        `Quick adjustment: ${change > 0 ? '+' : ''}${change}`
      );

      if (success) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleResetUpdate = (itemId: string) => {
    setStockUpdates(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No inventory items found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Details</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Reserved</TableHead>
            <TableHead className="text-center">Available</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Quick Actions</TableHead>
            <TableHead className="text-center">Update</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = getStockStatus(item);
            const pendingUpdate = stockUpdates[item.id];
            const hasUpdate = pendingUpdate !== undefined && pendingUpdate !== item.stock_quantity;

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <div className="text-sm text-gray-500 space-y-1">
                      {item.color_name && (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Color:</span>
                          <span>{item.color_name}</span>
                        </div>
                      )}
                      {item.size_name && (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Size:</span>
                          <span>{item.size_name}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Cost: Rs {item.cost_price} | 
                        {item.selling_price ? ` Sell: Rs ${item.selling_price}` : ' No sell price'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {item.sku}
                  </code>
                </TableCell>
                
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={stockUpdates[item.id] ?? item.stock_quantity}
                    onChange={(e) => handleStockChange(item.id, e.target.value)}
                    className="w-20 text-center mx-auto"
                    min="0"
                  />
                </TableCell>
                
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono">
                    {item.reserved_stock}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono">
                    {hasUpdate ? Math.max(0, pendingUpdate - item.reserved_stock) : item.available_stock}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-center">
                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAdjust(item.id, -1)}
                      disabled={updating === item.id || item.stock_quantity <= 0}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAdjust(item.id, 1)}
                      disabled={updating === item.id}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {hasUpdate && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStock(item.id, pendingUpdate)}
                        disabled={updating === item.id}
                        className="h-8"
                      >
                        Update
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetUpdate(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
