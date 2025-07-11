
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface InventoryItemCardProps {
  item: InventoryItem;
  onRefresh: () => void;
}

export function InventoryItemCard({ item, onRefresh }: InventoryItemCardProps) {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const updateStock = async (change: number) => {
    setUpdating(true);
    try {
      const newStock = item.stock_quantity + change;
      
      if (newStock < 0) {
        toast({
          title: 'Error',
          description: 'Stock cannot be negative',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('product_inventory')
        .update({ 
          stock_quantity: newStock,
          available_stock: newStock - item.reserved_stock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Stock ${change > 0 ? 'increased' : 'decreased'} successfully`,
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
      setUpdating(false);
    }
  };

  const isLowStock = item.available_stock <= item.low_stock_threshold && item.available_stock > 0;

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">pro</span>
            <span className="font-medium text-gray-900">{item.sku}</span>
            {isLowStock && <AlertTriangle className="h-4 w-4 text-orange-500" />}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {item.color_name && <div>Color: {item.color_name}</div>}
            {item.size_name && <div>Size: {item.size_name}</div>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStock(-1)}
            disabled={updating || item.available_stock <= 0}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <span className="w-12 text-center font-mono text-lg">
            {item.available_stock}
          </span>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStock(1)}
            disabled={updating}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>Total Stock: {item.stock_quantity}</span>
        <span>Reserved: {item.reserved_stock}</span>
        <Badge 
          variant={item.available_stock === 0 ? "destructive" : isLowStock ? "secondary" : "default"}
          className="text-xs"
        >
          Available: {item.available_stock}
        </Badge>
      </div>
    </div>
  );
}
