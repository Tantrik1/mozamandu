
import { Badge } from '@/components/ui/badge';
import { useVariantStock } from '@/hooks/useInventoryManager';

interface StockDisplayProps {
  productId: string;
  colorVariantId?: string;
  sizeVariantId?: string;
  showDetailedInfo?: boolean;
}

export function StockDisplay({ productId, colorVariantId, sizeVariantId, showDetailedInfo = false }: StockDisplayProps) {
  const { stock, loading } = useVariantStock(productId, colorVariantId, sizeVariantId);

  if (loading) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (!stock) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }

  const getStockBadge = () => {
    if (stock.isOutOfStock) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stock.isLowStock) {
      return <Badge variant="secondary">Low Stock ({stock.availableStock})</Badge>;
    } else {
      return <Badge variant="default">In Stock ({stock.availableStock})</Badge>;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {getStockBadge()}
      {showDetailedInfo && (
        <div className="text-xs text-gray-500">
          <span>Reserved: {stock.reservedStock}</span>
          {stock.sku && <span className="ml-2">SKU: {stock.sku}</span>}
        </div>
      )}
    </div>
  );
}
