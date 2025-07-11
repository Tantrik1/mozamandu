
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, AlertTriangle } from 'lucide-react';
import { InventoryEditDialog } from './InventoryEditDialog';

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

interface InventoryItemCardProps {
  item: InventoryItem;
  onRefresh: () => void;
}

export function InventoryItemCard({ item, onRefresh }: InventoryItemCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const isLowStock = item.available_stock <= item.low_stock_threshold && item.available_stock > 0;

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleSave = () => {
    onRefresh();
  };

  return (
    <>
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">pro</span>
              <span className="font-medium text-gray-900">{item.sku}</span>
              {isLowStock && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="font-medium">{item.product_name}</div>
              {item.color_name && <div>Color: {item.color_name}</div>}
              {item.size_name && <div>Size: {item.size_name}</div>}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{item.available_stock}</div>
              <div className="text-xs text-gray-500">Available</div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditClick}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Total Stock: {item.stock_quantity}</span>
          <span>Reserved: {item.reserved_stock}</span>
          <Badge 
            variant={item.available_stock === 0 ? "destructive" : isLowStock ? "secondary" : "default"}
            className="text-xs"
          >
            Available: {item.available_stock}
          </Badge>
        </div>
      </div>

      <InventoryEditDialog
        item={item}
        isOpen={isEditDialogOpen}
        onClose={handleDialogClose}
        onSave={handleSave}
      />
    </>
  );
}
