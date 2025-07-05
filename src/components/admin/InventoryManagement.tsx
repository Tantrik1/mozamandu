import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Plus, Edit, AlertTriangle, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface InventoryItem {
    id: string;
    product_id: string;
    sku: string;
    color_variant_id?: string | null;
    size_variant_id?: string | null;
    product_name: string;
    color_name?: string | null;
    size_name?: string | null;
    size_code?: string | null;
    stock_quantity: number;
    reserved_stock: number;
    available_stock: number;
    cost_price?: number | null;
    selling_price?: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    product?: {
        name: string;
        category?: {
            name: string;
        };
        subcategory?: {
            name: string;
        };
    };
}

interface Category {
    id: string;
    name: string;
}

interface Subcategory {
    id: string;
    name: string;
    category_id: string;
}

export function InventoryManagement() {
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { toast } = useToast();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState('all');
    const [stockFilter, setStockFilter] = useState('all'); // all, low, out, in-stock
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

    useEffect(() => {
        fetchInventoryItems();
        fetchCategories();
        fetchSubcategories();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [inventoryItems, searchTerm, selectedCategory, selectedSubcategory, stockFilter, statusFilter]);

    const fetchInventoryItems = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('product_inventory')
                .select(`
          *,
          product:products(
            name,
            category:categories(name),
            subcategory:subcategories(name)
          )
        `)
                .order('product_name')
                .order('color_name')
                .order('size_name');

            if (error) throw error;
            setInventoryItems(data || []);
        } catch (err) {
            setError('Failed to fetch inventory items.');
            setInventoryItems([]);
            toast({
                title: 'Error',
                description: 'Failed to fetch inventory items',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .eq('status', 'on')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchSubcategories = async () => {
        try {
            const { data, error } = await supabase
                .from('subcategories')
                .select('id, name, category_id')
                .eq('status', 'on')
                .order('name');

            if (error) throw error;
            setSubcategories(data || []);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        }
    };

    const applyFilters = () => {
        let filtered = [...inventoryItems];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.color_name && item.color_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.size_name && item.size_name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Category filter
        if (selectedCategory && selectedCategory !== 'all') {
            filtered = filtered.filter(item =>
                item.product?.category?.name === selectedCategory
            );
        }

        // Subcategory filter
        if (selectedSubcategory && selectedSubcategory !== 'all') {
            filtered = filtered.filter(item =>
                item.product?.subcategory?.name === selectedSubcategory
            );
        }

        // Stock filter
        switch (stockFilter) {
            case 'low':
                filtered = filtered.filter(item => item.available_stock > 0 && item.available_stock <= 10);
                break;
            case 'out':
                filtered = filtered.filter(item => item.available_stock === 0);
                break;
            case 'in-stock':
                filtered = filtered.filter(item => item.available_stock > 0);
                break;
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item =>
                statusFilter === 'active' ? item.is_active : !item.is_active
            );
        }

        setFilteredItems(filtered);
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        try {
            const { error } = await supabase
                .from('product_inventory')
                .update(updates)
                .eq('id', itemId);

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Inventory item updated successfully',
            });

            fetchInventoryItems();
            setIsEditDialogOpen(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Error updating inventory item:', error);
            toast({
                title: 'Error',
                description: 'Failed to update inventory item',
                variant: 'destructive',
            });
        }
    };

    const getStockStatus = (availableStock: number) => {
        if (availableStock === 0) return { status: 'out', label: 'Out of Stock', color: 'destructive' };
        if (availableStock <= 10) return { status: 'low', label: 'Low Stock', color: 'secondary' };
        return { status: 'in-stock', label: 'In Stock', color: 'default' };
    };

    const getFilteredSubcategories = () => {
        if (!selectedCategory || selectedCategory === 'all') return [];
        const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);
        if (!selectedCategoryObj) return [];
        return subcategories.filter(sub => sub.category_id === selectedCategoryObj.id);
    };

    const getStats = () => {
        const totalItems = inventoryItems.length;
        const activeItems = inventoryItems.filter(item => item.is_active).length;
        const lowStockItems = inventoryItems.filter(item => item.available_stock > 0 && item.available_stock <= 10).length;
        const outOfStockItems = inventoryItems.filter(item => item.available_stock === 0).length;
        const totalStock = inventoryItems.reduce((sum, item) => sum + item.available_stock, 0);

        return { totalItems, activeItems, lowStockItems, outOfStockItems, totalStock };
    };

    const stats = getStats();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Management</h1>
                    <p className="text-gray-600">Manage product inventory and stock levels</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">Loading inventory items...</div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <Package className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Items</p>
                                        <p className="text-2xl font-bold">{stats.totalItems}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Active Items</p>
                                        <p className="text-2xl font-bold">{stats.activeItems}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Low Stock</p>
                                        <p className="text-2xl font-bold">{stats.lowStockItems}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                                        <p className="text-2xl font-bold">{stats.outOfStockItems}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <Package className="h-5 w-5 text-purple-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Stock</p>
                                        <p className="text-2xl font-bold">{stats.totalStock}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Filter className="h-5 w-5" />
                                <span>Filters</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                <div className="lg:col-span-2">
                                    <Label htmlFor="search">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="search"
                                            placeholder="Search by name, SKU, color, size..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All categories</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.name}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="subcategory">Subcategory</Label>
                                    <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All subcategories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All subcategories</SelectItem>
                                            {getFilteredSubcategories().map((subcategory) => (
                                                <SelectItem key={subcategory.id} value={subcategory.name}>
                                                    {subcategory.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="stock">Stock Status</Label>
                                    <Select value={stockFilter} onValueChange={setStockFilter}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="in-stock">In Stock</SelectItem>
                                            <SelectItem value="low">Low Stock</SelectItem>
                                            <SelectItem value="out">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
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
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">Loading inventory items...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Variant</TableHead>
                                                <TableHead>Stock</TableHead>
                                                <TableHead>Cost Price</TableHead>
                                                <TableHead>Selling Price</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredItems.map((item) => {
                                                const stockStatus = getStockStatus(item.available_stock);
                                                return (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{item.product_name}</div>
                                                                <div className="text-sm text-gray-500">
                                                                    {item.product?.category?.name} → {item.product?.subcategory?.name}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                                                {item.sku}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                {item.color_name && (
                                                                    <Badge variant="outline" className="mr-1">
                                                                        {item.color_name}
                                                                    </Badge>
                                                                )}
                                                                {item.size_name && (
                                                                    <Badge variant="outline">
                                                                        {item.size_name}
                                                                    </Badge>
                                                                )}
                                                                {!item.color_name && !item.size_name && (
                                                                    <span className="text-gray-500">Base product</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{item.available_stock}</div>
                                                                <Badge variant={stockStatus.color as any}>
                                                                    {stockStatus.label}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.cost_price ? `Rs. ${item.cost_price}` : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.selling_price ? `Rs. ${item.selling_price}` : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                                {item.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingItem(item);
                                                                    setIsEditDialogOpen(true);
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4 mr-1" />
                                                                Edit
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>

                                    {filteredItems.length === 0 && !error && (
                                        <div className="text-center py-8 text-gray-500">
                                            No inventory items found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Edit Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Inventory Item</DialogTitle>
                            </DialogHeader>
                            {editingItem && (
                                <div className="space-y-4">
                                    <div>
                                        <Label>Product</Label>
                                        <p className="text-sm font-medium">{editingItem.product_name}</p>
                                    </div>

                                    <div>
                                        <Label>SKU</Label>
                                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                            {editingItem.sku}
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="stock_quantity">Stock Quantity</Label>
                                        <Input
                                            id="stock_quantity"
                                            type="number"
                                            min="0"
                                            value={editingItem.stock_quantity}
                                            onChange={(e) => setEditingItem({
                                                ...editingItem,
                                                stock_quantity: parseInt(e.target.value) || 0
                                            })}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="cost_price">Cost Price</Label>
                                        <Input
                                            id="cost_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editingItem.cost_price || ''}
                                            onChange={(e) => setEditingItem({
                                                ...editingItem,
                                                cost_price: e.target.value ? parseFloat(e.target.value) : null
                                            })}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="selling_price">Selling Price</Label>
                                        <Input
                                            id="selling_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editingItem.selling_price || ''}
                                            onChange={(e) => setEditingItem({
                                                ...editingItem,
                                                selling_price: e.target.value ? parseFloat(e.target.value) : null
                                            })}
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditDialogOpen(false);
                                                setEditingItem(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => updateInventoryItem(editingItem.id, {
                                                stock_quantity: editingItem.stock_quantity,
                                                cost_price: editingItem.cost_price,
                                                selling_price: editingItem.selling_price,
                                            })}
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
} 