import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  getInventoryItems,
  updateStock,
  InventoryItem,
  bulkUpdateStock,
  getInventoryOverview,
  InventoryOverview
} from '@/utils/inventoryManager';
import { Loader2, Plus, Edit, Check, X } from 'lucide-react';

interface BulkUpdateItem {
  productId: string;
  productName: string;
  stockChange: number;
  colorVariantId?: string;
  sizeVariantId?: string;
  reservationChange?: number;
  reason?: string;
}

export function AdvancedInventoryManagement() {
  const [inventory, setInventory] = useState<InventoryOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<InventoryOverview | null>(null);
  const [stockChange, setStockChange] = useState(0);
  const [reason, setReason] = useState('');
  const [bulkUpdates, setBulkUpdates] = useState<BulkUpdateItem[]>([]);
  const [newBulkUpdate, setNewBulkUpdate] = useState<Omit<BulkUpdateItem, 'productName'>>({
    productId: '',
    stockChange: 0,
    colorVariantId: '',
    sizeVariantId: '',
    reservationChange: 0,
    reason: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getInventoryOverview();
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const success = await updateStock(
        selectedProduct.id,
        stockChange,
        selectedProduct.variant_name || undefined,
        selectedProduct.size_name || undefined,
        0,
        reason
      );

      if (success) {
        toast({
          title: "Success",
          description: "Stock updated successfully",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: "Failed to update stock",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Stock update error:', error);
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBulk = () => {
    if (!newBulkUpdate.productId) {
      toast({
        title: "Missing Product ID",
        description: "Please enter a product ID",
        variant: "destructive",
      });
      return;
    }

    const product = inventory.find(item => item.id === newBulkUpdate.productId);
    if (!product) {
      toast({
        title: "Product Not Found",
        description: "Product ID not found in inventory",
        variant: "destructive",
      });
      return;
    }

    const newItem: BulkUpdateItem = {
      ...newBulkUpdate,
      productName: product.product_name
    };

    setBulkUpdates(prev => [...prev, newItem]);
    setNewBulkUpdate({
      productId: '',
      stockChange: 0,
      colorVariantId: '',
      sizeVariantId: '',
      reservationChange: 0,
      reason: ''
    });
  };

  const handleRemoveFromBulk = (index: number) => {
    const updated = bulkUpdates.filter((_, i) => i !== index);
    setBulkUpdates(updated);
  };

  const handleBulkUpdate = async () => {
    if (bulkUpdates.length === 0) {
      toast({
        title: "No Updates",
        description: "Please add some updates first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updates = bulkUpdates.map(update => ({
        product_id: update.productId,
        stock_change: update.stockChange,
        color_variant_id: update.colorVariantId || null,
        size_variant_id: update.sizeVariantId || null,
        reservation_change: update.reservationChange || 0,
        reason: update.reason || 'Bulk update'
      }));

      const result = await bulkUpdateStock(updates);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setBulkUpdates([]);
        fetchData();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk update",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await getInventoryItems();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Error",
        description: "Failed to perform search",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory with advanced tools
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Single Product Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="productId">Select Product</Label>
              <Select onValueChange={(value) => {
                const product = inventory.find(item => item.id === value);
                setSelectedProduct(product || null);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProduct && (
              <>
                <div>
                  <Label htmlFor="stockChange">Stock Change</Label>
                  <Input
                    type="number"
                    id="stockChange"
                    value={stockChange}
                    onChange={(e) => setStockChange(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    type="text"
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <Button onClick={handleUpdateStock} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Stock"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkProductId">Product ID</Label>
              <Input
                type="text"
                id="bulkProductId"
                value={newBulkUpdate.productId}
                onChange={(e) => setNewBulkUpdate(prev => ({ ...prev, productId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkStockChange">Stock Change</Label>
              <Input
                type="number"
                id="bulkStockChange"
                value={newBulkUpdate.stockChange}
                onChange={(e) => setNewBulkUpdate(prev => ({ ...prev, stockChange: parseInt(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkReason">Reason</Label>
              <Input
                type="text"
                id="bulkReason"
                value={newBulkUpdate.reason || ''}
                onChange={(e) => setNewBulkUpdate(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
            <Button onClick={handleAddToBulk} variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Add to Bulk
            </Button>

            {bulkUpdates.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium">Bulk Updates</h4>
                <ul className="mt-2 space-y-1">
                  {bulkUpdates.map((update, index) => (
                    <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                      <span>{update.productName} - Change: {update.stockChange} - Reason: {update.reason}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveFromBulk(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button onClick={handleBulkUpdate} disabled={loading} className="mt-4">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Perform Bulk Update"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search Functionality (Optional) */}
      {/* <div>
        <Label htmlFor="searchTerm">Search Inventory</Label>
        <div className="flex space-x-2">
          <Input
            type="text"
            id="searchTerm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium">Search Results</h4>
            <ul>
              {searchResults.map((item) => (
                <li key={item.id}>{item.product_name} ({item.sku})</li>
              ))}
            </ul>
          </div>
        )}
      </div> */}
    </div>
  );
}
