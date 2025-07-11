
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Plus, Save } from 'lucide-react';

interface InventoryItem {
  id?: string;
  sku: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  stock_quantity: number;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number;
  color_variant_id?: string;
  size_variant_id?: string;
}

interface InventoryManagementPopupProps {
  productId: string;
  onClose: () => void;
  isOpen: boolean;
}

export function InventoryManagementPopup({ productId, onClose, isOpen }: InventoryManagementPopupProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productInfo, setProductInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && productId) {
      fetchProductAndInventory();
    }
  }, [isOpen, productId]);

  const fetchProductAndInventory = async () => {
    setLoading(true);
    try {
      // Fetch product info
      const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProductInfo(product);

      console.log('Product info:', product);

      // Generate inventory items based on product variants
      if (product.has_color_variants) {
        await generateVariantInventory(product);
      } else {
        // Simple product - single inventory item
        const simpleItem: InventoryItem = {
          sku: generateSKU(product.name),
          product_name: product.name,
          stock_quantity: 0,
          cost_price: product.cost_price,
          selling_price: product.selling_price || product.cost_price,
          low_stock_threshold: 10,
        };
        setInventoryItems([simpleItem]);
      }
    } catch (error) {
      console.error('Error fetching product and inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateVariantInventory = async (product: any) => {
    try {
      const items: InventoryItem[] = [];

      // Fetch color variants
      const { data: colorVariants, error: colorError } = await supabase
        .from('color_variants')
        .select('*')
        .eq('product_id', productId);

      if (colorError) throw colorError;

      console.log('Color variants:', colorVariants);

      for (const colorVariant of colorVariants || []) {
        if (product.color_has_size_variants) {
          // Fetch size variants for this color
          const { data: sizeVariants, error: sizeError } = await supabase
            .from('size_variants')
            .select('*')
            .eq('color_variant_id', colorVariant.id);

          if (sizeError) throw sizeError;

          console.log('Size variants for color', colorVariant.color_name, ':', sizeVariants);

          for (const sizeVariant of sizeVariants || []) {
            items.push({
              sku: generateSKU(product.name, colorVariant.color_name, sizeVariant.size_name),
              product_name: product.name,
              color_name: colorVariant.color_name,
              size_name: sizeVariant.size_name,
              stock_quantity: 0,
              cost_price: product.cost_price,
              selling_price: product.selling_price || product.cost_price,
              low_stock_threshold: 10,
              color_variant_id: colorVariant.id,
              size_variant_id: sizeVariant.id,
            });
          }
        } else {
          // Color variant without sizes
          items.push({
            sku: generateSKU(product.name, colorVariant.color_name),
            product_name: product.name,
            color_name: colorVariant.color_name,
            stock_quantity: 0,
            cost_price: product.cost_price,
            selling_price: product.selling_price || product.cost_price,
            low_stock_threshold: 10,
            color_variant_id: colorVariant.id,
          });
        }
      }

      setInventoryItems(items);
    } catch (error) {
      console.error('Error generating variant inventory:', error);
    }
  };

  const generateSKU = (productName: string, colorName?: string, sizeName?: string) => {
    let sku = productName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    
    if (colorName) {
      sku += '-' + colorName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
    }
    
    if (sizeName) {
      sku += '-' + sizeName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 2);
    }
    
    return sku + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  };

  const updateInventoryItem = (index: number, field: keyof InventoryItem, value: any) => {
    const updated = [...inventoryItems];
    updated[index] = { ...updated[index], [field]: value };
    setInventoryItems(updated);
  };

  const addCustomInventoryItem = () => {
    const newItem: InventoryItem = {
      sku: generateSKU(productInfo?.name || 'PRODUCT'),
      product_name: productInfo?.name || '',
      stock_quantity: 0,
      cost_price: productInfo?.cost_price || 0,
      selling_price: productInfo?.selling_price || productInfo?.cost_price || 0,
      low_stock_threshold: 10,
    };
    setInventoryItems([...inventoryItems, newItem]);
  };

  const removeInventoryItem = (index: number) => {
    const updated = inventoryItems.filter((_, i) => i !== index);
    setInventoryItems(updated);
  };

  const saveInventory = async () => {
    setSaving(true);
    try {
      const category = productInfo?.categories?.name || '';
      const subcategory = productInfo?.subcategories?.name || '';

      for (const item of inventoryItems) {
        const inventoryData = {
          sku: item.sku,
          product_id: productId,
          color_variant_id: item.color_variant_id || null,
          size_variant_id: item.size_variant_id || null,
          product_name: item.product_name,
          category_name: category,
          subcategory_name: subcategory,
          color_name: item.color_name || null,
          size_name: item.size_name || null,
          stock_quantity: item.stock_quantity,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          low_stock_threshold: item.low_stock_threshold,
          is_active: true,
        };

        console.log('Inserting inventory record:', inventoryData);

        const { error } = await supabase
          .from('product_inventory')
          .insert(inventoryData);

        if (error) {
          console.error('Error inserting inventory item:', error);
          throw error;
        }
      }

      toast({
        title: 'Success',
        description: 'Inventory records created successfully',
      });

      onClose();
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save inventory records',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Management - {productInfo?.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading product information...</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Product Inventory Items</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Total Items: {inventoryItems.length}
                    </Badge>
                    <Button
                      type="button"
                      onClick={addCustomInventoryItem}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Item
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inventoryItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-4 border rounded-lg">
                      <div className="col-span-2">
                        <Label>SKU</Label>
                        <Input
                          value={item.sku}
                          onChange={(e) => updateInventoryItem(index, 'sku', e.target.value)}
                          placeholder="SKU"
                        />
                      </div>
                      
                      {item.color_name && (
                        <div className="col-span-1">
                          <Label>Color</Label>
                          <Input value={item.color_name} disabled className="bg-gray-50" />
                        </div>
                      )}
                      
                      {item.size_name && (
                        <div className="col-span-1">
                          <Label>Size</Label>
                          <Input value={item.size_name} disabled className="bg-gray-50" />
                        </div>
                      )}
                      
                      <div className="col-span-1">
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={item.stock_quantity}
                          onChange={(e) => updateInventoryItem(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label>Cost Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.cost_price}
                          onChange={(e) => updateInventoryItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label>Selling Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.selling_price}
                          onChange={(e) => updateInventoryItem(index, 'selling_price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <Label>Threshold</Label>
                        <Input
                          type="number"
                          value={item.low_stock_threshold}
                          onChange={(e) => updateInventoryItem(index, 'low_stock_threshold', parseInt(e.target.value) || 0)}
                          placeholder="10"
                        />
                      </div>
                      
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeInventoryItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {inventoryItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No inventory items to configure.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={saveInventory} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Inventory'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
