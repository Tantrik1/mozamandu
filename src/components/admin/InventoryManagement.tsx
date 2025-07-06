import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  getInventoryItems,
  getInventoryOverview,
  getLowStockAlerts,
  getInventoryAnalytics,
  searchInventory,
  type InventoryItem,
  type InventoryOverview,
  type InventoryAnalytics,
  type LowStockAlert
} from '../../utils/inventoryManager';
import { RefreshCw, Search } from 'lucide-react';

export function InventoryManagement() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data with proper function signature
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, overview, analyticsData] = await Promise.all([
        getInventoryItems(),
        getInventoryOverview(),
        getInventoryAnalytics()
      ]);

      setInventoryItems(items);
      setInventoryOverview(overview);
      // Convert InventoryItem[] to LowStockAlert[] with proper mapping
      const mappedAlerts = items
        .filter(item => item.available_stock <= (item.low_stock_threshold || 10))
        .map(item => ({
          ...item,
          low_stock_threshold: item.low_stock_threshold || 10,
          stock_needed: Math.max(0, (item.low_stock_threshold || 10) - item.available_stock),
          variant_name: item.color_name,
          product_sku: item.sku
        }));
      setLowStockAlerts(mappedAlerts);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update the search function to match the correct signature
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadData();
      return;
    }

    try {
      const results = await searchInventory(query);
      setInventoryItems(results);
    } catch (error) {
      console.error('Error searching inventory:', error);
    }
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Overview</CardTitle>
          <CardDescription>
            View a summary of your current inventory status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_items}</div>
                  <p className="text-sm text-muted-foreground">
                    {analytics.active_items} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_available_stock}</div>
                  <p className="text-sm text-muted-foreground">
                    {analytics.total_reserved_stock} reserved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{analytics.low_stock_items}</div>
                  <p className="text-sm text-muted-foreground">
                    {analytics.out_of_stock_items} out of stock
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analytics.total_stock_value.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total inventory value
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p>Loading analytics...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Inventory</CardTitle>
          <CardDescription>
            Search for specific items in your inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            A list of all inventory items with their current stock levels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p>Loading inventory items...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventoryOverview.map((item) => (
                <div key={item.id} className="border rounded p-4">
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="text-sm text-gray-500">
                    SKU: {item.product_sku || 'N/A'} | Status: {item.stock_status || 'Unknown'}
                  </p>
                  <div className="mt-2">
                    <p>Stock: {item.stock_quantity || 0}</p>
                    <p>Reserved: {item.reserved_stock || 0}</p>
                    <p>Available: {item.available_stock || 0}</p>
                  </div>
                  {item.variant_name && (
                    <p className="text-sm text-blue-600">Variant: {item.variant_name}</p>
                  )}
                  {item.size_name && (
                    <p className="text-sm text-green-600">Size: {item.size_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
          <CardDescription>
            Items that are running low on stock and need attention.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p>Loading low stock alerts...</p>
          ) : (
            <div className="space-y-2">
              {lowStockAlerts.map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{alert.product_name}</strong> - SKU: {alert.product_sku || 'N/A'}
                    <br />
                    Available: {alert.available_stock || 0} | Needed: {alert.stock_needed || 0}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
