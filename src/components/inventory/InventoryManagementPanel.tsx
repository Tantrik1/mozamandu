
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, RefreshCw, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { 
  getLowStockAlerts, 
  getInventorySummary, 
  addStock, 
  InventoryItem,
  InventorySummary 
} from '@/utils/inventoryManager';
import { useRealTimeInventoryMonitor } from '@/hooks/useRealTimeInventory';
import { RealTimeStockIndicator } from './RealTimeStockIndicator';
import { LowStockAlert } from '@/types/admin';

interface InventoryManagementPanelProps {
  productId?: string;
  showGlobalView?: boolean;
}

export function InventoryManagementPanel({ 
  productId, 
  showGlobalView = false 
}: InventoryManagementPanelProps) {
  const [lowStockItems, setLowStockItems] = useState<LowStockAlert[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    total_stock: 0,
    available_stock: 0,
    reserved_stock: 0,
    variant_count: 0
  });
  const [loading, setLoading] = useState(false);
  const [addingStock, setAddingStock] = useState<{ [key: string]: number }>({});

  // Monitor real-time changes
  useRealTimeInventoryMonitor(() => {
    fetchData();
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [alerts, summaryData] = await Promise.all([
        getLowStockAlerts(),
        productId ? getInventorySummary(productId) : Promise.resolve({
          total_stock: 0,
          available_stock: 0,
          reserved_stock: 0,
          variant_count: 0
        })
      ]);

      setLowStockItems(alerts);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productId]);

  const handleAddStock = async (inventoryId: string, quantity: number) => {
    if (quantity <= 0) return;

    try {
      const success = await addStock(inventoryId, quantity, 'Manual stock addition');
      
      if (success) {
        toast({
          title: 'Success',
          description: `Added ${quantity} units to inventory`,
        });
        setAddingStock(prev => ({ ...prev, [inventoryId]: 0 }));
        fetchData();
      } else {
        throw new Error('Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to add stock',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold">{summary.total_stock}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{summary.available_stock}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reserved</p>
                <p className="text-2xl font-bold text-orange-600">{summary.reserved_stock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Variants</p>
                <p className="text-2xl font-bold">{summary.variant_count}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Alerts
              {lowStockItems.length > 0 && (
                <Badge variant="destructive">{lowStockItems.length}</Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No low stock alerts</p>
              <p className="text-sm">All items are well stocked</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{item.product_name}</h4>
                      {item.product_id && (
                        <RealTimeStockIndicator
                          productId={item.product_id}
                          productInventoryId={item.id}
                          showDetails={true}
                        />
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.sku && (
                        <>SKU: {item.sku}</>
                      )}
                      {item.color_name && (
                        <span className="ml-2">• Color: {item.color_name}</span>
                      )}
                      {item.size_name && (
                        <span className="ml-2">• Size: {item.size_name}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-20"
                      value={addingStock[item.id || ''] || ''}
                      onChange={(e) => setAddingStock(prev => ({
                        ...prev,
                        [item.id || '']: parseInt(e.target.value) || 0
                      }))}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddStock(item.id || '', addingStock[item.id || ''] || 0)}
                      disabled={!addingStock[item.id || ''] || addingStock[item.id || ''] <= 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Stock
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
