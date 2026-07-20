import { Badge } from '@/components/ui/badge';
import { Tag, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface TierBreakdownItem {
  tierName: string;
  units: number;
  unitPrice: number;
  discountAmount: number;
  total: number;
}

interface PricingBreakdownProps {
  basePrice: number;
  quantity: number;
  /** Units at base price (no discount) */
  unitsAtBase: number;
  basePriceTotal: number;
  /** Discounted tier breakdowns */
  discountedUnits: TierBreakdownItem[];
  totalPrice: number;
  savings: number;
  /** Compact mode for cart items */
  compact?: boolean;
  /** Show next tier hint */
  nextTierHint?: string;
}

export function PricingBreakdown({
  basePrice,
  quantity,
  unitsAtBase,
  basePriceTotal,
  discountedUnits,
  totalPrice,
  savings,
  compact = false,
  nextTierHint,
}: PricingBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDiscount = savings > 0;
  const hasMultipleTiers = discountedUnits.length > 0 || unitsAtBase > 0;

  if (compact) {
    return (
      <div className="space-y-1">
        {/* Main price display */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-foreground">
            Rs.{totalPrice.toFixed(0)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                Rs.{(basePrice * quantity).toFixed(0)}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-600 border-green-200">
                <Tag className="w-2.5 h-2.5 mr-1" />
                Save Rs.{savings.toFixed(0)}
              </Badge>
            </>
          )}
        </div>
        
        {/* Progressive breakdown hint */}
        {hasMultipleTiers && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'View'} breakdown
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {/* Expanded breakdown */}
        {expanded && (
          <div className="mt-2 space-y-1 text-xs bg-muted/50 rounded-md p-2">
            {unitsAtBase > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{unitsAtBase} × Rs.{basePrice.toFixed(0)}</span>
                <span>Rs.{basePriceTotal.toFixed(0)}</span>
              </div>
            )}
            {discountedUnits.map((tier, idx) => (
              <div key={idx} className="flex justify-between text-green-600">
                <span>
                  {tier.units} × Rs.{tier.unitPrice.toFixed(0)}
                  <span className="text-green-500 ml-1">(-Rs.{tier.discountAmount})</span>
                </span>
                <span>Rs.{tier.total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next tier hint */}
        {nextTierHint && !hasDiscount && (
          <p className="text-[10px] text-primary/80">{nextTierHint}</p>
        )}
      </div>
    );
  }

  // Full breakdown (checkout view)
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Progressive Pricing</span>
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

      {/* Tier breakdown */}
      <div className="space-y-1.5 text-sm">
        {/* Base price units */}
        {unitsAtBase > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              {unitsAtBase} × Rs.{basePrice.toFixed(0)} (base)
            </span>
            <span className="font-medium">Rs.{basePriceTotal.toFixed(0)}</span>
          </div>
        )}

        {/* Discounted tiers */}
        {discountedUnits.map((tier, idx) => (
          <div key={idx} className="flex justify-between items-center text-green-600">
            <span>
              {tier.units} × Rs.{tier.unitPrice.toFixed(0)}
              <span className="text-xs ml-1 opacity-75">({tier.tierName} tier)</span>
            </span>
            <span className="font-medium">Rs.{tier.total.toFixed(0)}</span>
          </div>
        ))}

        {/* Separator */}
        <div className="border-t pt-1.5 mt-1.5" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-medium">{quantity} items total</span>
          <span className="font-bold text-lg text-foreground">Rs.{totalPrice.toFixed(0)}</span>
        </div>

        {/* Savings highlight */}
        {savings > 0 && (
          <div className="bg-green-500/10 rounded px-2 py-1.5 text-center">
            <span className="text-green-600 text-xs font-medium">
              🎉 You save Rs.{savings.toFixed(0)} with volume discount!
            </span>
          </div>
        )}

        {/* Next tier hint */}
        {nextTierHint && (
          <p className="text-xs text-primary text-center">{nextTierHint}</p>
        )}
      </div>
    </div>
  );
}
