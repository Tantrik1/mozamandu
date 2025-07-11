
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Package, AlertCircle } from 'lucide-react';

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

export function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('is_active', true)
        .order('product_name');

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

  const updateStock = async (variantId: string, change: number, reason: string) => {
    setUpdating(variantId);
    try {
      const { data, error } = await supabase.rpc('safe_update_stock', {
        p_product_id: null, // Not needed when using variant_id from product_inventory
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

  const getStockStatus = (item: InventoryItem) => {
    if (item.available_stock === 0) return { status: 'out-of-stock', color: 'destructive' as const };
    if (item.available_stock <= item.low_stock_threshold) return { status: 'low-stock', color: 'secondary' as const };
    return { status: 'in-stock', color: 'default' as const };
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <Button onClick={fetchInventory} variant="outline">
          <Package className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {inventory.map((item) => {
          const stockStatus = getStockStatus(item);
          return (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{item.product_name}</h3>
                      <Badge variant="outline">{item.sku}</Badge>
                      {stockStatus.status === 'low-stock' && (
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      {item.color_name && (
                        <p><span className="font-medium">Color:</span> {item.color_name}</p>
                      )}
                      {item.size_name && (
                        <p><span className="font-medium">Size:</span> {item.size_name}</p>
                      )}
                      <div className="flex items-center space-x-4">
                        <span><span className="font-medium">Total Stock:</span> {item.stock_quantity}</span>
                        <span><span className="font-medium">Reserved:</span> {item.reserved_stock}</span>
                        <Badge variant={stockStatus.color}>
                          Available: {item.available_stock}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStock(item.id, -1, 'Manual adjustment - decrease')}
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
                      onClick={() => updateStock(item.id, 1, 'Manual adjustment - increase')}
                      disabled={updating === item.id}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {inventory.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No inventory items found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
