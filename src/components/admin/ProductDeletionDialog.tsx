import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Archive } from 'lucide-react';

interface ProductDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onConfirm: () => void;
}

export function ProductDeletionDialog({
  isOpen,
  onClose,
  productId,
  productName,
  onConfirm,
}: ProductDeletionDialogProps) {
  const [archiving, setArchiving] = useState(false);
  const { toast } = useToast();

  const handleArchiveProduct = async () => {
    setArchiving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;

      // Reset all inventory for this product so that historical stock does not
      // leak back when the product is reactivated or transformed into a new item.
      const { error: invError } = await supabase
        .from('product_inventory')
        .update({
          stock_quantity: 0,
          reserved_stock: 0,
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', productId);

      if (invError) {
        console.error('Error resetting inventory on archive:', invError);
      }

      toast({
        title: 'Product Archived',
        description: `"${productName}" has been deactivated, hidden from the store, and its stock has been reset.`,
      });

      onConfirm();
      onClose();
    } catch (error) {
      console.error('Error archiving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive product',
        variant: 'destructive',
      });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Archive Product</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to archive <strong>"{productName}"</strong>?
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>The product will be hidden from the store</li>
            <li>All inventory, orders, and variants will be preserved</li>
            <li>You can reactivate it at any time from the Inactive tab</li>
          </ul>
        </div>

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={onClose} disabled={archiving}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleArchiveProduct}
            disabled={archiving}
          >
            <Archive className="h-4 w-4 mr-2" />
            {archiving ? 'Archiving...' : 'Archive Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
