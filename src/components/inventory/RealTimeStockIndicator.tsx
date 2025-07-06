
import { useRealTimeInventory } from '@/hooks/useRealTimeInventory';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface RealTimeStockIndicatorProps {
  productId: string;
  productInventoryId?: string;
  showDetails?: boolean;
  className?: string;
}

export function RealTimeStockIndicator({
  productId,
  productInventoryId,
  showDetails = false,
  className = ''
}: RealTimeStockIndicatorProps) {
  const { stockData, loading, error } = useRealTimeInventory({
    productId,
    productInventoryId,
    enableRealTime: true
  });

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading stock...</span>
      </div>
    );
  }

  if (error || !stockData) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <Badge variant="destructive">Stock Error</Badge>
      </div>
    );
  }

  const getStockStatus = () => {
    if (!stockData.is_active) {
      return { label: 'Inactive', variant: 'secondary' as const, icon: AlertCircle };
    }
    if (stockData.available_stock === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, icon: AlertCircle };
    }
    if (stockData.available_stock <= 10) {
      return { label: 'Low Stock', variant: 'default' as const, icon: AlertCircle };
    }
    return { label: 'In Stock', variant: 'default' as const, icon: CheckCircle };
  };

  const status = getStockStatus();
  const Icon = status.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon className={`h-4 w-4 ${
        status.variant === 'destructive' ? 'text-red-500' : 
        status.variant === 'secondary' ? 'text-gray-500' : 
        'text-green-500'
      }`} />
      <Badge variant={status.variant}>
        {status.label}
        {showDetails && stockData.is_active && (
          <span className="ml-1">({stockData.available_stock})</span>
        )}
      </Badge>
      {showDetails && stockData.is_active && (
        <div className="text-xs text-gray-500">
          Total: {stockData.stock_quantity} | Reserved: {stockData.reserved_stock}
        </div>
      )}
    </div>
  );
}
