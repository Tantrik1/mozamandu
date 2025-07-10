
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createInventoryItem, generateProductSKU } from '@/utils/inventoryManager';
import { supabase } from '@/integrations/supabase/client';

interface InventorySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  costPrice: number;
  sellingPrice?: number;
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  onComplete: () => void;
}

interface InventoryRow {
  id: string;
  sku: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  size_code?: string;
  stock_quantity: number;
  color_variant_id?: string;
  size_variant_id?: string;
}

export function InventorySetupModal({
  isOpen,
  onClose,
  productId,
  productName,
  costPrice,
  sellingPrice,
  hasColorVariants,
  hasSizeVariants,
  onComplete
}: InventorySetupModalProps) {
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && productId) {
      generateInventoryRows();
    }
  }, [isOpen, productId]);

  const generateInventoryRows = async () => {
    try {
      setLoading(true);
      const rows: InventoryRow[] = [];

      if (!hasColorVariants && !hasSizeVariants) {
        // Simple product without variants
        const sku = await generateProductSKU(productName);
        rows.push({
          id: `simple-${Date.now()}`,
          sku,
          product_name: productName,
          stock_quantity: 0
        });
      } else if (hasColorVariants) {
        // Get color variants for this product
        const { data: colorVariants, error } = await supabase
          .from('color_variants')
          .select('id, color_name')
          .eq('product_id', productId);

        if (error) throw error;

        for (const color of colorVariants || []) {
          if (hasSizeVariants) {
            // Get size variants for this color
            const { data: sizeVariants, error: sizeError } = await supabase
              .from('size_variants')
              .select('id, size_name, size_code')
              .eq('color_variant_id', color.id);

            if (sizeError) throw sizeError;

            for (const size of sizeVariants || []) {
              const sku = await generateProductSKU(productName, color.color_name, size.size_name);
              rows.push({
                id: `${color.id}-${size.id}`,
                sku,
                product_name: productName,
                color_name: color.color_name,
                size_name: size.size_name,
                size_code: size.size_code,
                stock_quantity: 0,
                color_variant_id: color.id,
                size_variant_id: size.id
              });
            }
          } else {
            // Color variants without sizes
            const sku = await generateProductSKU(productName, color.color_name);
            rows.push({
              id: color.id,
              sku,
              product_name: productName,
              color_name: color.color_name,
              stock_quantity: 0,
              color_variant_id: color.id
            });
          }
        }
      }

      setInventoryRows(rows);
    } catch (error) {
      console.error('Error generating inventory rows:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate inventory setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInventoryRow = (id: string, field: string, value: string | number) => {
    setInventoryRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate that all SKUs are unique and non-empty
      const skus = inventoryRows.map(row => row.sku);
      const uniqueSkus = new Set(skus);
      
      if (skus.some(sku => !sku.trim())) {
        toast({
          title: 'Error',
          description: 'All SKUs must be filled',
          variant: 'destructive',
        });
        return;
      }

      if (uniqueSkus.size !== skus.length) {
        toast({
          title: 'Error',
          description: 'All SKUs must be unique',
          variant: 'destructive',
        });
        return;
      }

      // Create inventory items
      for (const row of inventoryRows) {
        await createInventoryItem({
          product_id: productId,
          sku: row.sku,
          color_variant_id: row.color_variant_id || null,
          size_variant_id: row.size_variant_id || null,
          product_name: row.product_name,
          color_name: row.color_name || null,
          size_name: row.size_name || null,
          size_code: row.size_code || null,
          stock_quantity: row.stock_quantity,
          reserved_stock: 0,
          available_stock: row.stock_quantity,
          low_stock_threshold: 10,
          cost_price: costPrice,
          selling_price: sellingPrice || null,
          is_active: true
        });
      }

      toast({
        title: 'Success',
        description: 'Inventory setup completed successfully',
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save inventory setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Inventory for {productName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-center">Loading inventory setup...</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Configure SKUs and initial stock quantities for each variant:
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 font-medium text-sm">
                <div>SKU</div>
                <div>Product</div>
                <div>Color</div>
                <div>Size</div>
                <div>Size Code</div>
                <div>Initial Stock</div>
              </div>
              
              {inventoryRows.map((row) => (
                <div key={row.id} className="grid grid-cols-6 gap-4 p-4 border-t">
                  <div>
                    <Input
                      value={row.sku}
                      onChange={(e) => updateInventoryRow(row.id, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="text-sm"
                    />
                  </div>
                  <div className="text-sm flex items-center">{row.product_name}</div>
                  <div className="text-sm flex items-center">{row.color_name || '-'}</div>
                  <div className="text-sm flex items-center">{row.size_name || '-'}</div>
                  <div className="text-sm flex items-center">{row.size_code || '-'}</div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      value={row.stock_quantity}
                      onChange={(e) => updateInventoryRow(row.id, 'stock_quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Inventory Setup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
