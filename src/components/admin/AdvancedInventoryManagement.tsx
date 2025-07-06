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
          matchesStockStatus = item.available_stock > 0 && item.available_stock <= item.low_stock_threshold;
          break;
        case 'in_stock':
          matchesStockStatus = item.available_stock > item.low_stock_threshold;
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
      }
    } catch (error) {
      console.error('Error updating stock:', error);
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
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
    }
  };

  // Get stock status badge
  const getStockStatusBadge = (item: InventoryItem) => {
    if (item.available_stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.available_stock <= item.low_stock_threshold) {
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
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => document.getElementById('low-stock-tab')?.click()}
            >
              View details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="low-stock" id="low-stock-tab">
            Low Stock Alerts ({lowStockAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
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
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items ({filteredItems.length})</CardTitle>
              <CardDescription>
                Real-time inventory status and management
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableHead>Utilization</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.color_name && `${item.color_name}`}
                              {item.size_name && ` - ${item.size_name}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.stock_quantity}</TableCell>
                        <TableCell>{item.reserved_stock}</TableCell>
                        <TableCell className="font-medium">{item.available_stock}</TableCell>
                        <TableCell>{getStockStatusBadge(item)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={getStockUtilization(item)} className="w-16" />
                            <span className="text-xs">{getStockUtilization(item)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setStockUpdateDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setThresholdDialog(true);
                                setNewThreshold(item.low_stock_threshold);
                              }}
                            >
                              <Settings className="h-3 w-3" />
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
        </TabsContent>

        {/* Low Stock Alerts Tab */}
        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
              <CardDescription>
                Items that need restocking attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Stock Needed</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.product_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {alert.variant_name && `${alert.variant_name}`}
                              {alert.size_name && ` - ${alert.size_name}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{alert.product_sku}</TableCell>
                        <TableCell className="font-medium">{alert.available_stock}</TableCell>
                        <TableCell>{alert.low_stock_threshold}</TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          +{alert.stock_needed}
                        </TableCell>
                        <TableCell>
                          {new Date(alert.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const item = inventoryItems.find(i => i.id === alert.id);
                              if (item) {
                                setSelectedItem(item);
                                setStockChange(alert.stock_needed);
                                setReservationChange(0);
                                setUpdateReason('Restock from low stock alert');
                                setStockUpdateDialog(true);
                              }
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory History</CardTitle>
              <CardDescription>
                Recent inventory changes and audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryHistory.map((change) => (
                      <TableRow key={change.id}>
                        <TableCell>
                          <Badge variant="outline">{change.action_type}</Badge>
                        </TableCell>
                        <TableCell>{change.product_id}</TableCell>
                        <TableCell className="font-medium">
                          {change.change_amount > 0 ? '+' : ''}{change.change_amount}
                        </TableCell>
                        <TableCell>{change.reason}</TableCell>
                        <TableCell>
                          {new Date(change.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>
                Configure inventory management preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Real-time Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable live inventory updates across all devices
                  </p>
                </div>
                <Button
                  variant={realTimeEnabled ? "default" : "outline"}
                  onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                >
                  {realTimeEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Stock Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    Default threshold for low stock alerts
                  </p>
                </div>
                <Input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value) || 10)}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Update Dialog */}
      <Dialog open={stockUpdateDialog} onOpenChange={setStockUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Update stock quantity and reservations for {selectedItem?.product_name}
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
                placeholder="Enter stock change (+ or -)"
              />
            </div>
            <div>
              <Label htmlFor="reservation-change">Reservation Change</Label>
              <Input
                id="reservation-change"
                type="number"
                value={reservationChange}
                onChange={(e) => setReservationChange(parseInt(e.target.value) || 0)}
                placeholder="Enter reservation change (+ or -)"
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
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

      {/* Threshold Update Dialog */}
      <Dialog open={thresholdDialog} onOpenChange={setThresholdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Low Stock Threshold</DialogTitle>
            <DialogDescription>
              Set the low stock threshold for {selectedItem?.product_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="threshold">Low Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value) || 10)}
                placeholder="Enter threshold value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleThresholdUpdate}>
              Update Threshold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 