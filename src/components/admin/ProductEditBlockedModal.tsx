
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ProductEditBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  pendingOrdersCount?: number;
}

export function ProductEditBlockedModal({
  isOpen,
  onClose,
  reason,
  pendingOrdersCount
}: ProductEditBlockedModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <DialogTitle>Cannot Edit Product</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {reason}
          </DialogDescription>
        </DialogHeader>
        
        {pendingOrdersCount && pendingOrdersCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              <strong>Pending Orders:</strong> {pendingOrdersCount}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              You can edit this product once all orders are completed (delivered or cancelled).
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
