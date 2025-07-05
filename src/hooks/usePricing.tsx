import { useMemo } from 'react';

interface DiscountTier {
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface PricingCalculation {
  finalPrice: number;
  description: string;
  breakdown: string[];
  totalCost: number;
}

export function usePricing() {
  const calculateTieredPricing = useMemo(() => {
    return (basePrice: number, totalQuantity: number, tiers: DiscountTier[]): PricingCalculation => {
      if (!tiers || tiers.length === 0 || totalQuantity === 0) {
        return {
          finalPrice: basePrice,
          description: `Rs. ${basePrice.toFixed(2)} each`,
          breakdown: [`${totalQuantity} × Rs. ${basePrice.toFixed(2)}`],
          totalCost: basePrice * totalQuantity
        };
      }

      // Sort tiers by minimum quantity
      const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

      let totalCost = 0;
      let remainingQty = totalQuantity;
      let breakdown: string[] = [];
      let currentPosition = 0;

      for (let i = 0; i < sortedTiers.length && remainingQty > 0; i++) {
        const currentTier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];

        // Determine the range for this tier
        const tierStart = Math.max(currentTier.min_quantity, currentPosition + 1);
        const tierEnd = nextTier ? nextTier.min_quantity : Infinity;

        // Skip if we haven't reached this tier yet
        if (totalQuantity < tierStart) {
          break;
        }

        // Calculate quantity in this tier
        const qtyInTier = Math.min(
          remainingQty,
          Math.min(tierEnd - tierStart, totalQuantity - tierStart + 1)
        );

        if (qtyInTier > 0) {
          const discountedPrice = Math.max(0, basePrice - currentTier.discount_amount);
          const tierCost = qtyInTier * discountedPrice;

          totalCost += tierCost;
          breakdown.push(`${qtyInTier} × Rs. ${discountedPrice.toFixed(2)}`);
          remainingQty -= qtyInTier;
          currentPosition += qtyInTier;
        }
      }

      // Handle any remaining quantity at base price
      if (remainingQty > 0) {
        totalCost += remainingQty * basePrice;
        breakdown.push(`${remainingQty} × Rs. ${basePrice.toFixed(2)}`);
      }

      const avgPrice = totalCost / totalQuantity;
      const description = breakdown.length > 1
        ? `Tiered: ${breakdown.join(' + ')}`
        : breakdown[0] || `Rs. ${basePrice.toFixed(2)} each`;

      return {
        finalPrice: avgPrice,
        description,
        breakdown,
        totalCost
      };
    };
  }, []);

  return {
    calculateTieredPricing
  };
}
