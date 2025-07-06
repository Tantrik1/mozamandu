import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Package,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Search,
    Plus,
    Minus,
    Eye,
    History,
    RefreshCw,
    Filter,
    Download,
    Upload
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
    getInventoryItems,
    getInventoryOverview,
    getLowStockAlerts,
    getInventoryAnalytics,
    getInventoryHistory,
    updateStock,
    setLowStockThreshold,
    searchInventory,
    useInventoryRealtime,
    InventoryItem,
    InventoryOverview,
    LowStockAlert,
    InventoryAnalytics,
    InventoryChange
} from '@/utils/inventoryManager';

interface InventoryManagementProps {
    className?: string;
}

export function InventoryManagement({ className }: InventoryManagementProps) {
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview[]>([]);
    const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
    const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('overview');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [stockHistory, setStockHistory] = useState<InventoryChange[]>([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');

    // Real-time updates
    const realtimeData = useInventoryRealtime('inventory-updates', (data) => {
        console.log('Real-time inventory update:', data);
        if (data.eventType === 'UPDATE' || data.eventType === 'INSERT') {
            refreshData(true);
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [
                items,
                overview,
                alerts,
                analyticsData
            ] = await Promise.all([
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
            toast({
                title: "Error",
                description: "Failed to load inventory data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async (showRefreshing = false) => {
        if (showRefreshing) {
            setRefreshing(true);
        }
        await loadData();
        setRefreshing(false);
    };

    const handleStockUpdate = async (
        item: InventoryItem,
        stockChange: number,
        reason: string
    ) => {
        try {
            const success = await updateStock(
                item.product_id,
                stockChange,
                item.color_variant_id,
                item.size_variant_id,
                0,
                reason
            );

            if (success) {
                toast({
                    title: "Success",
                    description: `Stock updated successfully: ${stockChange > 0 ? '+' : ''}${stockChange} units`,
                });
                setUpdateDialogOpen(false);
                refreshData(true);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to update stock",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            toast({
                title: "Error",
                description: "Failed to update stock",
                variant: "destructive",
            });
        }
    };

    const handleThresholdUpdate = async (item: InventoryItem, threshold: number) => {
        try {
            const success = await setLowStockThreshold(item.id, threshold);
            if (success) {
                refreshData(true);
            }
        } catch (error) {
            console.error('Error updating threshold:', error);
        }
    };

    const loadStockHistory = async (item: InventoryItem) => {
        try {
            const history = await getInventoryHistory(item.product_id, 30);
            setStockHistory(history);
            setSelectedItem(item);
            setHistoryDialogOpen(true);
        } catch (error) {
            console.error('Error loading stock history:', error);
            toast({
                title: "Error",
                description: "Failed to load stock history",
                variant: "destructive",
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Stock': return 'bg-green-100 text-green-800';
            case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
            case 'Out of Stock': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getActionColor = (actionType: string) => {
        switch (actionType) {
            case 'stock_update': return 'bg-blue-100 text-blue-800';
            case 'reservation': return 'bg-purple-100 text-purple-800';
            case 'release': return 'bg-orange-100 text-orange-800';
            case 'deduction': return 'bg-red-100 text-red-800';
            case 'restoration': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredOverview = inventoryOverview.filter(item => {
        const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.product_sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || item.stock_status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
    return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Items</p>
                                <p className="text-2xl font-bold">{analytics?.total_items || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                                    <div>
                                <p className="text-sm font-medium text-gray-600">Available Stock</p>
                                <p className="text-2xl font-bold">{analytics?.total_available_stock || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <div>
                                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                                <p className="text-2xl font-bold">{analytics?.low_stock_items || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                                <p className="text-2xl font-bold">{analytics?.out_of_stock_items || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>{lowStockAlerts.length}</strong> items are running low on stock.
                        <Button
                            variant="link"
                            className="p-0 h-auto font-normal"
                            onClick={() => setSelectedTab('alerts')}
                        >
                            View details
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="alerts">Low Stock</TabsTrigger>
                    <TabsTrigger value="updates">Manual Updates</TabsTrigger>
                    <TabsTrigger value="history">Audit Trail</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="In Stock">In Stock</SelectItem>
                                <SelectItem value="Low Stock">Low Stock</SelectItem>
                                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshData(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                                </div>

                    {/* Inventory Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Overview ({filteredOverview.length} items)</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                    {filteredOverview.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    {item.variant_name && (
                                                        <p className="text-sm text-gray-600">Color: {item.variant_name}</p>
                                                    )}
                                                    {item.size_name && (
                                                        <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                                                    )}
                                                            </div>
                                                        </TableCell>
                                            <TableCell className="font-mono text-sm">{item.product_sku}</TableCell>
                                            <TableCell>{item.stock_quantity}</TableCell>
                                            <TableCell>{item.reserved_stock}</TableCell>
                                            <TableCell>{item.available_stock}</TableCell>
                                                        <TableCell>
                                                <Badge className={getStatusColor(item.stock_status)}>
                                                    {item.stock_status}
                                                </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const inventoryItem = inventoryItems.find(i => i.id === item.id);
                                                            if (inventoryItem) {
                                                                setSelectedItem(inventoryItem);
                                                                setUpdateDialogOpen(true);
                                                            }
                                                        }}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Update
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const inventoryItem = inventoryItems.find(i => i.id === item.id);
                                                            if (inventoryItem) {
                                                                loadStockHistory(inventoryItem);
                                                            }
                                                        }}
                                                    >
                                                        <History className="h-3 w-3" />
                                                    </Button>
                                                            </div>
                                                        </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Low Stock Alerts ({lowStockAlerts.length} items)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Available</TableHead>
                                        <TableHead>Threshold</TableHead>
                                        <TableHead>Needed</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStockAlerts.map((item) => (
                                        <TableRow key={item.id}>
                                                        <TableCell>
                                                            <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    <p className="text-sm text-gray-600">{item.product_sku}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                <span className="text-red-600 font-bold">{item.available_stock}</span>
                                                        </TableCell>
                                            <TableCell>{item.low_stock_threshold}</TableCell>
                                                        <TableCell>
                                                <span className="text-orange-600 font-bold">{item.stock_needed}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                        const inventoryItem = inventoryItems.find(i => i.id === item.id);
                                                        if (inventoryItem) {
                                                            setSelectedItem(inventoryItem);
                                                            setUpdateDialogOpen(true);
                                                        }
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Stock
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                    ))}
                                        </TableBody>
                                    </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="updates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bulk Stock Updates</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="bulk-file">Upload CSV File</Label>
                                        <div className="mt-2">
                                            <Button variant="outline" className="w-full">
                                                <Upload className="h-4 w-4 mr-2" />
                                                Choose File
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Download Template</Label>
                                        <div className="mt-2">
                                            <Button variant="outline" className="w-full">
                                                <Download className="h-4 w-4 mr-2" />
                                                Download CSV Template
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <p>CSV format: SKU, Stock Change, Reason</p>
                                    <p>Example: ABC123, 10, Restock from supplier</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Inventory Changes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center text-gray-500 py-8">
                                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Select a product to view its inventory history</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Stock Update Dialog */}
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Stock</DialogTitle>
                    </DialogHeader>
                    {selectedItem && (
                        <StockUpdateForm
                            item={selectedItem}
                            onUpdate={handleStockUpdate}
                            onThresholdUpdate={handleThresholdUpdate}
                            onClose={() => setUpdateDialogOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Stock History Dialog */}
            <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            Stock History - {selectedItem?.product_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Change</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stockHistory.map((change) => (
                                    <TableRow key={change.id}>
                                        <TableCell>
                                            {new Date(change.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getActionColor(change.action_type)}>
                                                {change.action_type.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={change.change_amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                                {change.change_amount > 0 ? '+' : ''}{change.change_amount}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {change.reason}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Stock Update Form Component
interface StockUpdateFormProps {
    item: InventoryItem;
    onUpdate: (item: InventoryItem, change: number, reason: string) => Promise<void>;
    onThresholdUpdate: (item: InventoryItem, threshold: number) => Promise<void>;
    onClose: () => void;
}

function StockUpdateForm({ item, onUpdate, onThresholdUpdate, onClose }: StockUpdateFormProps) {
    const [stockChange, setStockChange] = useState('');
    const [reason, setReason] = useState('');
    const [threshold, setThreshold] = useState(item.low_stock_threshold.toString());
    const [updating, setUpdating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockChange || !reason) return;

        setUpdating(true);
        try {
            await onUpdate(item, parseInt(stockChange), reason);
            onClose();
        } finally {
            setUpdating(false);
        }
    };

    const handleThresholdSubmit = async () => {
        const newThreshold = parseInt(threshold);
        if (newThreshold >= 0) {
            await onThresholdUpdate(item, newThreshold);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="product-name">Product</Label>
                <Input
                    id="product-name"
                    value={item.product_name}
                    disabled
                    className="mt-1"
                />
                                    </div>

                                    <div>
                <Label htmlFor="current-stock">Current Stock</Label>
                                        <Input
                    id="current-stock"
                    value={`${item.stock_quantity} (${item.available_stock} available)`}
                    disabled
                    className="mt-1"
                                        />
                                    </div>

                                    <div>
                <Label htmlFor="stock-change">Stock Change</Label>
                                        <Input
                    id="stock-change"
                                            type="number"
                    value={stockChange}
                    onChange={(e) => setStockChange(e.target.value)}
                    placeholder="e.g., 10 or -5"
                    className="mt-1"
                    required
                                        />
                                    </div>

                                    <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Restock from supplier, Manual adjustment"
                    className="mt-1"
                    required
                                        />
                                    </div>

            <div>
                <Label htmlFor="threshold">Low Stock Threshold</Label>
                <div className="flex gap-2 mt-1">
                    <Input
                        id="threshold"
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        min="0"
                    />
                                        <Button
                        type="button"
                                            variant="outline"
                        onClick={handleThresholdSubmit}
                    >
                        Update
                                        </Button>
                                    </div>
                                </div>

            <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updating}>
                    {updating ? 'Updating...' : 'Update Stock'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                </Button>
        </div>
        </form>
    );
} 