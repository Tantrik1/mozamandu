import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Package, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { getInventoryOverview, getLowStockAlerts, getInventoryAnalytics } from '@/utils/inventoryManager';

export function InventoryManagement() {
  const [inventoryOverview, setInventoryOverview] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewData, alertsData, analyticsData] = await Promise.all([
        getInventoryOverview(),
        getLowStockAlerts(),
        getInventoryAnalytics()
      ]);

      setInventoryOverview(overviewData);
      setLowStockAlerts(alertsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredInventory = inventoryOverview.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Loading inventory data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                placeholder="Search inventory..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <Button onClick={fetchData}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_items}</div>
            <div className="text-sm text-gray-500">Total number of products</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.low_stock_items}</div>
            <div className="text-sm text-gray-500">Products nearing stock threshold</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Out of Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.out_of_stock_items}</div>
            <div className="text-sm text-gray-500">Products with zero stock</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {analytics?.total_stock_value}</div>
            <div className="text-sm text-gray-500">Total value of all stock</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.active_items}</div>
            <div className="text-sm text-gray-500">Currently active products</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Available Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_available_stock}</div>
            <div className="text-sm text-gray-500">Total available stock across all products</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Inventory Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.category_name}</TableCell>
                    <TableCell>{item.subcategory_name}</TableCell>
                    <TableCell>{item.variant_name || '-'}</TableCell>
                    <TableCell>{item.size_name || '-'}</TableCell>
                    <TableCell>{item.stock_quantity}</TableCell>
                    <TableCell>{item.reserved_stock}</TableCell>
                    <TableCell>{item.available_stock}</TableCell>
                    <TableCell className="text-right">
                      {item.stock_status === 'Out of Stock' && (
                        <Badge variant="destructive">Out of Stock</Badge>
                      )}
                      {item.stock_status === 'Low Stock' && (
                        <Badge variant="secondary">Low Stock</Badge>
                      )}
                      {item.stock_status === 'In Stock' && (
                        <Badge variant="secondary">In Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInventory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Low Stock Alerts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Available Stock</TableHead>
                  <TableHead>Low Stock Threshold</TableHead>
                  <TableHead className="text-right">Stock Needed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.product_name}</TableCell>
                    <TableCell>{alert.product_sku}</TableCell>
                    <TableCell>{alert.variant_name || '-'}</TableCell>
                    <TableCell>{alert.size_name || '-'}</TableCell>
                    <TableCell>{alert.available_stock}</TableCell>
                    <TableCell>{alert.low_stock_threshold}</TableCell>
                    <TableCell className="text-right">{alert.stock_needed}</TableCell>
                  </TableRow>
                ))}
                {lowStockAlerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No low stock alerts.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
