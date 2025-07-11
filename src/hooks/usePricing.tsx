
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
  currentItemPrice: number;
  savings: number;
  detailedBreakdown: {
    normalQuantity: number;
    normalPrice: number;
    discountQuantity: number;
    discountPrice: number;
    totalSavings: number;
  };
}

export function usePricing() {
  const calculateTieredPricing = useMemo(() => {
    return (basePrice: number, totalQuantity: number, tiers: DiscountTier[]): PricingCalculation => {
      if (!tiers || tiers.length === 0 || totalQuantity === 0) {
        return {
          finalPrice: basePrice,
          description: `Rs. ${basePrice.toFixed(2)} each`,
          breakdown: [`${totalQuantity} × Rs. ${basePrice.toFixed(2)}`],
          totalCost: basePrice * totalQuantity,
          currentItemPrice: basePrice,
          savings: 0,
          detailedBreakdown: {
            normalQuantity: totalQuantity,
            normalPrice: basePrice,
            discountQuantity: 0,
            discountPrice: basePrice,
            totalSavings: 0
          }
        };
      }

      // Sort tiers by minimum quantity to find the first applicable tier (MOQ)
      const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
      const firstTier = sortedTiers[0];
      
      if (!firstTier || totalQuantity < firstTier.min_quantity) {
        // All items at normal price (below MOQ)
        return {
          finalPrice: basePrice,
          description: `Rs. ${basePrice.toFixed(2)} each (Below MOQ of ${firstTier?.min_quantity || 1})`,
          breakdown: [`${totalQuantity} × Rs. ${basePrice.toFixed(2)} (Normal price)`],
          totalCost: basePrice * totalQuantity,
          currentItemPrice: basePrice,
          savings: 0,
          detailedBreakdown: {
            normalQuantity: totalQuantity,
            normalPrice: basePrice,
            discountQuantity: 0,
            discountPrice: basePrice,
            totalSavings: 0
          }
        };
      }

      // MOQ reached - apply tiered pricing
      const discountedPrice = Math.max(0, basePrice - firstTier.discount_amount);
      const normalQuantity = firstTier.min_quantity - 1; // Items 1 to (MOQ-1) at normal price
      const discountQuantity = totalQuantity - normalQuantity; // Items MOQ+ at discounted price
      
      const normalCost = normalQuantity * basePrice;
      const discountCost = discountQuantity * discountedPrice;
      const totalCost = normalCost + discountCost;
      const totalSavings = discountQuantity * firstTier.discount_amount;
      
      // Current item price depends on quantity selected
      const currentItemPrice = totalQuantity >= firstTier.min_quantity ? discountedPrice : basePrice;
      
      const breakdown = [];
      if (normalQuantity > 0) {
        breakdown.push(`${normalQuantity} × Rs. ${basePrice.toFixed(2)} (Normal price)`);
      }
      if (discountQuantity > 0) {
        breakdown.push(`${discountQuantity} × Rs. ${discountedPrice.toFixed(2)} (MOQ discount: -Rs. ${firstTier.discount_amount})`);
      }

      const description = totalQuantity >= firstTier.min_quantity 
        ? `Rs. ${discountedPrice.toFixed(2)} each (MOQ ${firstTier.min_quantity}+ discount active)`
        : `Rs. ${basePrice.toFixed(2)} each (Add ${firstTier.min_quantity - totalQuantity} more for Rs. ${discountedPrice.toFixed(2)} each)`;

      return {
        finalPrice: totalCost / totalQuantity, // Average price (for cart total calculations)
        description,
        breakdown,
        totalCost,
        currentItemPrice, // Exact price for current quantity level
        savings: totalSavings,
        detailedBreakdown: {
          normalQuantity,
          normalPrice: basePrice,
          discountQuantity,
          discountPrice: discountedPrice,
          totalSavings
        }
      };
    };
  }, []);

  return {
    calculateTieredPricing
  };
}
