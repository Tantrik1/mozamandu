import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  RefreshCw,
  Download,
  Filter,
  Package,
  MoreVertical,
  Pencil,
  Plus,
  Minus,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  SlidersHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InventoryStats } from './InventoryStats';
import { InventoryEditDialog } from './InventoryEditDialog';
import { ButtonColorful } from '@/components/ui/button-colorful';

interface InventoryItem {
  id: string;
  sku: string;
  product_id: string;
  product_name: string;
  category_name?: string;
  subcategory_name?: string;
  color_name?: string;
  color_code?: string;
  size_name?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  cost_price: number;
  selling_price?: number;
  is_active: boolean;
  image_url?: string;
  updated_at: string;
  products?: {
    image_url?: string;
    status?: string;
    category_id?: string;
    subcategory_id?: string;
  };
}

export function ModernInventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_id: string }[]>([]);

  const { toast } = useToast();

  // Stats calculations
  const stats = {
    totalItems: filteredInventory.length,
    availableStock: filteredInventory.reduce((sum, item) => sum + (item.available_stock || 0), 0),
    lowStockItems: filteredInventory.filter(item => 
      item.available_stock <= item.low_stock_threshold && item.available_stock > 0
    ).length,
    outOfStockItems: filteredInventory.filter(item => item.available_stock === 0).length,
  };

  useEffect(() => {
    fetchInventory();
    fetchCategoriesAndSubcategories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventory, searchTerm, statusFilter, categoryFilter, subcategoryFilter, activeTab]);

  const fetchCategoriesAndSubcategories = async () => {
    try {
      const [catsRes, subcatsRes] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
    } catch (err) {
      console.error('Error fetching filter categories:', err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_inventory')
        .select('*, products!inner(status, image_url, category_id, subcategory_id)')
        .eq('is_active', true)
        .eq('products.status', 'active')
        .order('updated_at', { ascending: false });

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

  const applyFilters = () => {
    let filtered = inventory;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.sku.toLowerCase().includes(term) ||
        item.product_name.toLowerCase().includes(term) ||
        (item.color_name && item.color_name.toLowerCase().includes(term)) ||
        (item.size_name && item.size_name.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        switch (statusFilter) {
          case 'in-stock':
            return item.available_stock > item.low_stock_threshold;
          case 'low-stock':
            return item.available_stock <= item.low_stock_threshold && item.available_stock > 0;
          case 'out-of-stock':
            return item.available_stock === 0;
          case 'active':
            return item.is_active;
          case 'inactive':
            return !item.is_active;
          default:
            return true;
        }
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.products?.category_id === categoryFilter || item.category_name === categories.find(c => c.id === categoryFilter)?.name
      );
    }

    // Subcategory filter
    if (subcategoryFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.products?.subcategory_id === subcategoryFilter || item.subcategory_name === subcategories.find(s => s.id === subcategoryFilter)?.name
      );
    }

    // Tab-specific filtering
    if (activeTab === 'low-stock') {
      filtered = filtered.filter(item => 
        item.available_stock <= item.low_stock_threshold && item.available_stock > 0
      );
    }

    setFilteredInventory(filtered);
  };

  const handleQuickStock = async (item: InventoryItem, delta: number) => {
    const newStock = Math.max(0, item.stock_quantity + delta);
    try {
      const { error } = await supabase
        .from('product_inventory')
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;
      toast({ title: 'Stock Updated', description: `${item.sku} total stock set to ${newStock}` });
      fetchInventory();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' });
    }
  };

  const handleResetReserved = async (item: InventoryItem) => {
    try {
      const { error } = await supabase
        .from('product_inventory')
        .update({
          reserved_stock: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;
      toast({ title: 'Reserved Stock Reset', description: `${item.sku} reserved stock reset to 0` });
      fetchInventory();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to reset reserved stock', variant: 'destructive' });
    }
  };

  const exportInventory = async () => {
    try {
      const csv = [
        ['S.N', 'Product Name', 'SKU', 'Variant Color', 'Variant Size', 'Total Stock', 'Reserved', 'Available', 'Cost Price', 'Selling Price', 'Status'].join(','),
        ...filteredInventory.map((item, index) => [
          index + 1,
          `"${item.product_name}"`,
          item.sku,
          `"${item.color_name || ''}"`,
          `"${item.size_name || ''}"`,
          item.stock_quantity,
          item.reserved_stock,
          item.available_stock,
          item.cost_price,
          item.selling_price || 0,
          item.available_stock === 0 ? 'Out of Stock' : 
          item.available_stock <= item.low_stock_threshold ? 'Low Stock' : 'In Stock'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-overview-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Inventory exported successfully',
      });
    } catch (error) {
      console.error('Error exporting inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to export inventory',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 w-full">
        <div className="flex justify-center items-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-sm font-medium">Loading inventory data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Real-time stock monitoring & variant level control</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchInventory} variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold rounded-xl">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <ButtonColorful onClick={exportInventory} className="h-9 px-4 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5 text-white" />
            Export CSV
          </ButtonColorful>
        </div>
      </div>

      {/* Stats Cards */}
      <InventoryStats {...stats} />

      {/* Search and Dropdown Filter Bar */}
      <div className="bg-card p-3.5 sm:p-4 rounded-2xl border border-border/60 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search product, SKU, color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          {/* Status Dropdown */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9.5 text-xs font-medium rounded-xl">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Dropdown */}
          <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setSubcategoryFilter('all'); }}>
            <SelectTrigger className="h-9.5 text-xs font-medium rounded-xl">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subcategory Dropdown */}
          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="h-9.5 text-xs font-medium rounded-xl">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Subcategories" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Subcategories</SelectItem>
              {subcategories
                .filter(s => categoryFilter === 'all' || s.category_id === categoryFilter)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filter Clear Pill */}
        {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || subcategoryFilter !== 'all') && (
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
            <span className="text-muted-foreground text-[11px]">
              Showing {filteredInventory.length} of {inventory.length} items
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
                setSubcategoryFilter('all');
              }}
              className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 px-2.5 rounded-lg"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xs h-10 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="overview" className="text-xs font-bold rounded-lg">Overview ({filteredInventory.length})</TabsTrigger>
          <TabsTrigger value="low-stock" className="text-xs font-bold rounded-lg text-amber-600 dark:text-amber-400">Low Stock</TabsTrigger>
        </TabsList>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-4">
          {filteredInventory.length === 0 ? (
            <div className="bg-card rounded-2xl border p-12 text-center shadow-xs">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-base font-bold text-foreground">No Inventory Items Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {inventory.length === 0 ? 'No active inventory rows detected.' : 'No items match your active filters.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 border-b border-border/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">S.N</TableHead>
                      <TableHead className="min-w-[220px] text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">Product Name</TableHead>
                      <TableHead className="min-w-[120px] text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">SKU</TableHead>
                      <TableHead className="min-w-[120px] text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">Variant Color</TableHead>
                      <TableHead className="min-w-[100px] text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">Variant Size</TableHead>
                      <TableHead className="text-center min-w-[100px] text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">Total Stock</TableHead>
                      <TableHead className="text-center min-w-[90px] text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">Reserved</TableHead>
                      <TableHead className="min-w-[130px] text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">Available</TableHead>
                      <TableHead className="w-16 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground py-3.5">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item, index) => {
                      const isLowStock = item.available_stock <= item.low_stock_threshold && item.available_stock > 0;
                      const isOutOfStock = item.available_stock === 0;

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                          {/* 1. S.N */}
                          <TableCell className="text-center text-xs font-extrabold text-muted-foreground">
                            {index + 1}
                          </TableCell>

                          {/* 2. Product Name */}
                          <TableCell>
                            <div className="flex items-center gap-3 py-0.5">
                              <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted border border-border/50 shrink-0 flex items-center justify-center">
                                {item.image_url || item.products?.image_url ? (
                                  <img
                                    src={item.image_url || item.products?.image_url}
                                    alt={item.product_name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder.svg';
                                    }}
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-muted-foreground/50" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[220px]" title={item.product_name}>
                                  {item.product_name}
                                </p>
                                {(item.category_name || item.subcategory_name) && (
                                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                                    {item.category_name} {item.subcategory_name ? `› ${item.subcategory_name}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 3. SKU */}
                          <TableCell>
                            <span className="font-mono text-[11px] font-extrabold px-2.5 py-1 bg-muted/60 rounded-md border border-border/50 text-foreground inline-block">
                              {item.sku}
                            </span>
                          </TableCell>

                          {/* 4. Variant Color */}
                          <TableCell>
                            {item.color_name ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-accent/60 border border-border/60">
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: item.color_code || '#888' }}
                                />
                                <span className="truncate max-w-[90px]">{item.color_name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs font-semibold">-</span>
                            )}
                          </TableCell>

                          {/* 5. Variant Size */}
                          <TableCell>
                            {item.size_name ? (
                              <Badge variant="outline" className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-background border-border/80">
                                {item.size_name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs font-semibold">-</span>
                            )}
                          </TableCell>

                          {/* 6. Total Stock */}
                          <TableCell className="text-center">
                            <span className="text-xs font-black text-foreground px-2.5 py-1 rounded-xl bg-muted/50 border border-border/40 inline-block shadow-2xs">
                              {item.stock_quantity}
                            </span>
                          </TableCell>

                          {/* 7. Reserved */}
                          <TableCell className="text-center">
                            <span className="text-xs font-bold text-muted-foreground">
                              {item.reserved_stock || 0}
                            </span>
                          </TableCell>

                          {/* 8. Available */}
                          <TableCell>
                            {isOutOfStock ? (
                              <Badge variant="destructive" className="text-[11px] font-extrabold gap-1 px-2.5 py-1 rounded-full">
                                <XCircle className="w-3 h-3" /> Out of Stock
                              </Badge>
                            ) : isLowStock ? (
                              <Badge className="text-[11px] font-extrabold gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Low ({item.available_stock})
                              </Badge>
                            ) : (
                              <Badge className="text-[11px] font-extrabold gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item.available_stock} Avail
                              </Badge>
                            )}
                          </TableCell>

                          {/* 9. Action Dropdown */}
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-accent border border-border/40">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl p-1.5 space-y-0.5">
                                <DropdownMenuLabel className="text-[11px] font-extrabold text-muted-foreground uppercase px-2 py-1">
                                  Quick Actions
                                </DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setEditingItem(item)} className="cursor-pointer font-semibold rounded-lg">
                                  <Pencil className="h-3.5 w-3.5 mr-2 text-primary" /> Edit Stock & Price
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickStock(item, 10)} className="cursor-pointer font-semibold rounded-lg text-emerald-600">
                                  <Plus className="h-3.5 w-3.5 mr-2" /> Add +10 Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickStock(item, -10)} className="cursor-pointer font-semibold rounded-lg text-rose-600">
                                  <Minus className="h-3.5 w-3.5 mr-2" /> Subtract -10 Stock
                                </DropdownMenuItem>
                                {item.reserved_stock > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleResetReserved(item)} className="cursor-pointer font-semibold rounded-lg text-amber-600">
                                      <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset Reserved (0)
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Low Stock Tab Content */}
        <TabsContent value="low-stock" className="space-y-4">
          {filteredInventory.length === 0 ? (
            <div className="bg-card rounded-2xl border p-12 text-center shadow-xs">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-base font-bold text-foreground">No Low Stock Items</h3>
              <p className="text-xs text-muted-foreground mt-1">All items have sufficient stock levels.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/30 bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-amber-500/10 border-b border-amber-500/20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">S.N</TableHead>
                      <TableHead className="min-w-[220px] text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">Product Name</TableHead>
                      <TableHead className="min-w-[120px] text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">SKU</TableHead>
                      <TableHead className="min-w-[120px] text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">Variant Color</TableHead>
                      <TableHead className="min-w-[100px] text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">Variant Size</TableHead>
                      <TableHead className="text-center min-w-[100px] text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">Total Stock</TableHead>
                      <TableHead className="text-center min-w-[90px] text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">Reserved</TableHead>
                      <TableHead className="min-w-[130px] text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">Available</TableHead>
                      <TableHead className="w-16 text-center text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 py-3.5">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-amber-500/5 transition-colors">
                        <TableCell className="text-center text-xs font-extrabold text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted border border-border/50 shrink-0 flex items-center justify-center">
                              {item.image_url || item.products?.image_url ? (
                                <img src={item.image_url || item.products?.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground/50" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[200px]">{item.product_name}</p>
                              {(item.category_name || item.subcategory_name) && (
                                <p className="text-[11px] text-muted-foreground truncate">{item.category_name} {item.subcategory_name ? `› ${item.subcategory_name}` : ''}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-[11px] font-extrabold px-2.5 py-1 bg-muted/60 rounded-md border border-border/50">{item.sku}</span>
                        </TableCell>
                        <TableCell>{item.color_name || '-'}</TableCell>
                        <TableCell>{item.size_name || '-'}</TableCell>
                        <TableCell className="text-center font-extrabold">{item.stock_quantity}</TableCell>
                        <TableCell className="text-center">{item.reserved_stock || 0}</TableCell>
                        <TableCell>
                          <Badge className="text-[11px] font-extrabold gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Low ({item.available_stock})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" onClick={() => setEditingItem(item)} className="h-8 text-xs font-semibold rounded-xl">
                            Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <InventoryEditDialog
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={fetchInventory}
      />
    </div>
  );
}
