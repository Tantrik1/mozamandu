
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
}

interface InventoryTableProps {
  items: InventoryItem[];
  onRefresh: () => void;
}

export function InventoryTable({ items, onRefresh }: InventoryTableProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const getStockStatus = (item: InventoryItem) => {
    if (item.available_stock === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    }
    if (item.available_stock <= item.low_stock_threshold) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  const updateStock = async (itemId: string, newStock: number) => {
    setUpdating(itemId);
    try {
      const { error } = await supabase
        .from('product_inventory')
        .update({ 
          stock_quantity: newStock,
          available_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stock updated successfully',
      });

      setStockUpdates(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });

      onRefresh();
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

  const handleStockChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStockUpdates(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  };

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Reserved</TableHead>
            <TableHead className="text-center">Available</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
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
                    <div className="text-sm text-gray-500">
                      {item.color_name && <span>Color: {item.color_name}</span>}
                      {item.color_name && item.size_name && <span> • </span>}
                      {item.size_name && <span>Size: {item.size_name}</span>}
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
                <TableCell className="text-center font-medium">
                  {item.reserved_stock}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {hasUpdate ? pendingUpdate : item.available_stock}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {hasUpdate && (
                      <Button
                        size="sm"
                        onClick={() => updateStock(item.id, pendingUpdate)}
                        disabled={updating === item.id}
                        className="h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Update
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setStockUpdates(prev => {
                          const updated = { ...prev };
                          delete updated[item.id];
                          return updated;
                        });
                      }}
                      className="h-8"
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
