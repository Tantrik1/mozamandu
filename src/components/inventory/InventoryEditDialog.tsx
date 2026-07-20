
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  cost_price: number;
  selling_price?: number;
}

interface InventoryEditDialogProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function InventoryEditDialog({ item, isOpen, onClose, onSave }: InventoryEditDialogProps) {
  const [formData, setFormData] = useState({
    stock_quantity: 0,
    low_stock_threshold: 0,
    cost_price: 0,
    selling_price: 0,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setFormData({
        stock_quantity: item.stock_quantity,
        low_stock_threshold: item.low_stock_threshold,
        cost_price: item.cost_price,
        selling_price: item.selling_price || 0,
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    setSaving(true);
    try {
      // available_stock is a generated column (stock_quantity - reserved_stock)
      // computed by the database — do NOT write it.
      const { error } = await supabase
        .from('product_inventory')
        .update({
          stock_quantity: formData.stock_quantity,
          low_stock_threshold: formData.low_stock_threshold,
          cost_price: formData.cost_price,
          selling_price: formData.selling_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Inventory updated successfully',
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to update inventory',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Inventory</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-sm text-gray-900">{item.sku}</div>
            <div className="text-sm text-gray-600">{item.product_name}</div>
            {item.color_name && (
              <div className="text-xs text-gray-500">Color: {item.color_name}</div>
            )}
            {item.size_name && (
              <div className="text-xs text-gray-500">Size: {item.size_name}</div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock_quantity">Stock Quantity</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                value={formData.low_stock_threshold}
                onChange={(e) => handleInputChange('low_stock_threshold', e.target.value)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => handleInputChange('cost_price', e.target.value)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="selling_price">Selling Price</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => handleInputChange('selling_price', e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Current Status</div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Reserved Stock: {item.reserved_stock}</div>
              <div>Available Stock: {item.available_stock}</div>
              <div>New Available: {formData.stock_quantity - item.reserved_stock}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
