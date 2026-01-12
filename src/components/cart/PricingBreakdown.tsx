import { Badge } from '@/components/ui/badge';
import { Tag, TrendingDown } from 'lucide-react';

interface PricingBreakdownProps {
  basePrice: number;
  discountedPrice: number;
  quantity: number;
  savings: number;
  appliedTier: 'normal' | 'discount';
  tierInfo?: string;
  compact?: boolean;
}

export function PricingBreakdown({
  basePrice,
  discountedPrice,
  quantity,
  savings,
  appliedTier,
  tierInfo,
  compact = false,
}: PricingBreakdownProps) {
  const totalOriginal = basePrice * quantity;
  const totalFinal = discountedPrice * quantity;
  const discountPerItem = basePrice - discountedPrice;
  const hasDiscount = appliedTier === 'discount' && discountPerItem > 0;

  if (compact) {
    return (
      <div className="space-y-1">
        {/* Main price display */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">
            Rs.{totalFinal.toFixed(0)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                Rs.{totalOriginal.toFixed(0)}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-600 border-green-200">
                <Tag className="w-2.5 h-2.5 mr-1" />
                Volume
              </Badge>
            </>
          )}
        </div>
        
        {/* Per item breakdown */}
        <div className="text-xs text-muted-foreground">
          {hasDiscount ? (
            <span>
              Rs.{discountedPrice.toFixed(0)}/item 
              <span className="text-green-600 ml-1">(save Rs.{discountPerItem.toFixed(0)}/item)</span>
            </span>
          ) : (
            <span>Rs.{basePrice.toFixed(0)}/item × {quantity}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
      {/* Header with tier badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Price Breakdown</span>
        {hasDiscount ? (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 border-green-200">
            <TrendingDown className="w-3 h-3 mr-1" />
            Volume Discount
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5">
            Standard Price
          </Badge>
        )}
      </div>

      {/* Breakdown rows */}
      <div className="space-y-1.5 text-sm">
        {/* Base price row */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Base price:</span>
          <span className={hasDiscount ? 'line-through text-muted-foreground' : 'font-medium'}>
            Rs.{basePrice.toFixed(0)}/item
          </span>
        </div>

        {/* Discount row (only if discount applied) */}
        {hasDiscount && (
          <div className="flex justify-between items-center text-green-600">
            <span>Tier discount:</span>
            <span className="font-medium">-Rs.{discountPerItem.toFixed(0)}/item</span>
          </div>
        )}

        {/* Final per-item price */}
        <div className="flex justify-between items-center border-t pt-1.5">
          <span className="font-medium">Final price:</span>
          <span className="font-bold text-primary">Rs.{discountedPrice.toFixed(0)}/item</span>
        </div>

        {/* Quantity and total */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>× {quantity} items</span>
          <span className="font-bold text-lg text-foreground">Rs.{totalFinal.toFixed(0)}</span>
        </div>

        {/* Total savings highlight */}
        {savings > 0 && (
          <div className="bg-green-500/10 rounded px-2 py-1.5 text-center mt-2">
            <span className="text-green-600 text-xs font-medium">
              🎉 You save Rs.{savings.toFixed(0)} on this item!
            </span>
          </div>
        )}
      </div>

      {/* Tier info tooltip */}
      {tierInfo && (
        <div className="text-[10px] text-muted-foreground bg-background/50 rounded px-2 py-1 mt-2">
          {tierInfo}
        </div>
      )}
    </div>
  );
}
