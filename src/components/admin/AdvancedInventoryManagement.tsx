
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  Eye,
  BarChart3,
  History,
  Settings,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInventoryItems,
  getInventoryOverview,
  getLowStockAlerts,
  getInventoryAnalytics,
  getInventoryHistory,
  updateStock,
  reserveStock,
  releaseStock,
  deductStock,
  restoreStock,
  bulkUpdateStock,
  setLowStockThreshold,
  searchInventory,
  useInventoryRealtime,
  type InventoryItem,
  type InventoryOverview,
  type LowStockAlert,
  type InventoryAnalytics,
  type InventoryChange
} from '../../utils/inventoryManager';

export default function AdvancedInventoryManagement() {
  // State management
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Dialog states
  const [stockUpdateDialog, setStockUpdateDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockChange, setStockChange] = useState(0);
  const [reservationChange, setReservationChange] = useState(0);
  const [updateReason, setUpdateReason] = useState('');
  const [thresholdDialog, setThresholdDialog] = useState(false);
  const [newThreshold, setNewThreshold] = useState(10);

  // Real-time subscription
  const { subscribe } = useInventoryRealtime('admin-inventory');

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, overview, alerts, analyticsData] = await Promise.all([
        getInventoryItems(),
        getInventoryOverview(),
        getLowStockAlerts(),
        getInventoryAnalytics()
      ]);

      setInventoryItems(items);
      setInventoryOverview(overview);
      setLowStockAlerts(alerts);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time updates
  useEffect(() => {
    if (realTimeEnabled) {
      const unsubscribe = subscribe((payload) => {
        console.log('Real-time inventory update:', payload);
        loadData(); // Reload data on any change
      });

      return unsubscribe;
    }
  }, [realTimeEnabled, subscribe, loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search and filter
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = 
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.color_name && item.color_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.size_name && item.size_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    
    let matchesStockStatus = true;
    if (selectedStockStatus) {
      switch (selectedStockStatus) {
        case 'out_of_stock':
          matchesStockStatus = item.available_stock === 0;
          break;
        case 'low_stock':
          matchesStockStatus = item.available_stock > 0 && item.available_stock <= (item.low_stock_threshold || 10);
          break;
        case 'in_stock':
          matchesStockStatus = item.available_stock > (item.low_stock_threshold || 10);
          break;
      }
    }

    return matchesSearch && matchesCategory && matchesStockStatus;
  });

  // Handle stock update
  const handleStockUpdate = async () => {
    if (!selectedItem) return;

    try {
      const success = await updateStock(
        selectedItem.product_id,
        stockChange,
        selectedItem.color_variant_id,
        selectedItem.size_variant_id,
        reservationChange,
        updateReason
      );

      if (success) {
        setStockUpdateDialog(false);
        setSelectedItem(null);
        setStockChange(0);
        setReservationChange(0);
        setUpdateReason('');
        await loadData();
        toast.success('Stock updated successfully');
      } else {
        toast.error('Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Error updating stock');
    }
  };

  // Handle threshold update
  const handleThresholdUpdate = async () => {
    if (!selectedItem) return;

    try {
      const success = await setLowStockThreshold(selectedItem.id, newThreshold);
      if (success) {
        setThresholdDialog(false);
        setSelectedItem(null);
        setNewThreshold(10);
        await loadData();
        toast.success('Threshold updated successfully');
      } else {
        toast.error('Failed to update threshold');
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
      toast.error('Error updating threshold');
    }
  };

  // Get stock status badge
  const getStockStatusBadge = (item: InventoryItem) => {
    if (item.available_stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.available_stock <= (item.low_stock_threshold || 10)) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  // Get stock utilization percentage
  const getStockUtilization = (item: InventoryItem) => {
    if (item.stock_quantity === 0) return 0;
    return Math.round((item.reserved_stock / item.stock_quantity) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Inventory Management</h1>
          <p className="text-muted-foreground">
            Real-time inventory tracking and management with comprehensive analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={realTimeEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            <Zap className="h-4 w-4 mr-2" />
            {realTimeEnabled ? 'Real-time ON' : 'Real-time OFF'}
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_items}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.active_items} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_available_stock}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.total_reserved_stock} reserved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{analytics.low_stock_items}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.out_of_stock_items} out of stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.total_stock_value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total inventory value
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{lowStockAlerts.length} items</strong> are running low on stock and need attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
          <CardDescription>
            Manage your inventory items with real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by product name, SKU, color, or size..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="stock-status">Stock Status</Label>
              <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        {(item.color_name || item.size_name) && (
                          <div className="text-sm text-gray-500">
                            {item.color_name} {item.size_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>{item.stock_quantity}</TableCell>
                    <TableCell>{item.reserved_stock}</TableCell>
                    <TableCell>{item.available_stock}</TableCell>
                    <TableCell>{getStockStatusBadge(item)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setStockUpdateDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Update Dialog */}
      <Dialog open={stockUpdateDialog} onOpenChange={setStockUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Update stock levels for {selectedItem?.product_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stock-change">Stock Change</Label>
              <Input
                id="stock-change"
                type="number"
                value={stockChange}
                onChange={(e) => setStockChange(parseInt(e.target.value) || 0)}
                placeholder="Enter stock change (+ to add, - to remove)"
              />
            </div>
            <div>
              <Label htmlFor="update-reason">Reason</Label>
              <Input
                id="update-reason"
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="Enter reason for update"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate}>
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
