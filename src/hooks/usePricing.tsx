
import { useMemo } from 'react';

interface DiscountTier {
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface TierBreakdown {
  tierName: string;
  minQty: number;
  maxQty: number | null;
  discountAmount: number;
  unitPrice: number;
  unitsInTier: number;
  tierTotal: number;
}

interface PricingCalculation {
  /** Average price per unit for display */
  averagePrice: number;
  /** Total cost for all units */
  totalCost: number;
  /** Total savings compared to base price */
  totalSavings: number;
  /** Detailed breakdown by tier */
  tierBreakdown: TierBreakdown[];
  /** Description for display */
  description: string;
  /** Next tier info if available */
  nextTierInfo?: {
    unitsNeeded: number;
    discountAmount: number;
    priceAtNextTier: number;
  };
}

/**
 * Progressive Quantity-Based Discount System (Mozamandu-Style)
 * 
 * Applies discounts ONLY to units beyond defined quantity thresholds.
 * Earlier units keep the base price - ladder-style pricing.
 * 
 * Example: Base Rs.140, Tier1(5+): Rs.20 off, Tier2(8+): Rs.40 off
 * - Units 1-4: Rs.140 each
 * - Units 5-7: Rs.120 each (Rs.20 off)
 * - Units 8+:  Rs.100 each (Rs.40 off)
 */
export function usePricing() {
  const calculateProgressivePricing = useMemo(() => {
    return (basePrice: number, totalQuantity: number, tiers: DiscountTier[]): PricingCalculation => {
      // No items case
      if (totalQuantity === 0) {
        return {
          averagePrice: basePrice,
          totalCost: 0,
          totalSavings: 0,
          tierBreakdown: [],
          description: `Rs. ${basePrice.toFixed(0)} each`,
        };
      }

      // No tiers - all items at base price
      if (!tiers || tiers.length === 0) {
        return {
          averagePrice: basePrice,
          totalCost: basePrice * totalQuantity,
          totalSavings: 0,
          tierBreakdown: [{
            tierName: 'Base Price',
            minQty: 1,
            maxQty: null,
            discountAmount: 0,
            unitPrice: basePrice,
            unitsInTier: totalQuantity,
            tierTotal: basePrice * totalQuantity,
          }],
          description: `Rs. ${basePrice.toFixed(0)} each`,
        };
      }

      // Sort tiers by min_quantity ascending
      const sortedTiers = [...tiers]
        .filter(t => t.min_quantity >= 1 && t.discount_amount > 0)
        .sort((a, b) => a.min_quantity - b.min_quantity);

      // Build price brackets: each unit position gets a specific price
      // Base tier: units 1 to (first_tier.min_quantity - 1)
      // Tier N: units from tier.min_quantity to (next_tier.min_quantity - 1) or end

      const tierBreakdown: TierBreakdown[] = [];
      let totalCost = 0;
      let totalSavings = 0;
      let processedUnits = 0;

      // Calculate base tier (before any discount tier)
      const firstTierStart = sortedTiers.length > 0 ? sortedTiers[0].min_quantity : totalQuantity + 1;
      const baseUnits = Math.min(totalQuantity, firstTierStart - 1);

      if (baseUnits > 0) {
        const tierTotal = baseUnits * basePrice;
        totalCost += tierTotal;
        processedUnits += baseUnits;
        
        tierBreakdown.push({
          tierName: 'Base Price',
          minQty: 1,
          maxQty: firstTierStart - 1,
          discountAmount: 0,
          unitPrice: basePrice,
          unitsInTier: baseUnits,
          tierTotal,
        });
      }

      // Process each discount tier
      for (let i = 0; i < sortedTiers.length; i++) {
        if (processedUnits >= totalQuantity) break;

        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        
        const tierStart = tier.min_quantity;
        const tierEnd = nextTier ? nextTier.min_quantity - 1 : Infinity;
        
        // How many units fall into this tier?
        const unitsInThisTier = Math.min(
          totalQuantity - processedUnits,
          Math.max(0, Math.min(tierEnd, totalQuantity) - tierStart + 1)
        );

        if (unitsInThisTier > 0 && totalQuantity >= tierStart) {
          const discountedPrice = Math.max(0, basePrice - tier.discount_amount);
          const tierTotal = unitsInThisTier * discountedPrice;
          const tierSavings = unitsInThisTier * tier.discount_amount;
          
          totalCost += tierTotal;
          totalSavings += tierSavings;
          processedUnits += unitsInThisTier;

          tierBreakdown.push({
            tierName: `${tier.min_quantity}+ Discount`,
            minQty: tierStart,
            maxQty: nextTier ? nextTier.min_quantity - 1 : null,
            discountAmount: tier.discount_amount,
            unitPrice: discountedPrice,
            unitsInTier: unitsInThisTier,
            tierTotal,
          });
        }
      }

      const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : basePrice;

      // Calculate next tier info
      let nextTierInfo: PricingCalculation['nextTierInfo'];
      const lastAppliedTierIndex = sortedTiers.findIndex(t => totalQuantity < t.min_quantity);
      
      if (lastAppliedTierIndex !== -1) {
        const nextTier = sortedTiers[lastAppliedTierIndex];
        nextTierInfo = {
          unitsNeeded: nextTier.min_quantity - totalQuantity,
          discountAmount: nextTier.discount_amount,
          priceAtNextTier: Math.max(0, basePrice - nextTier.discount_amount),
        };
      } else if (sortedTiers.length > 0 && totalQuantity < sortedTiers[0].min_quantity) {
        const firstTier = sortedTiers[0];
        nextTierInfo = {
          unitsNeeded: firstTier.min_quantity - totalQuantity,
          discountAmount: firstTier.discount_amount,
          priceAtNextTier: Math.max(0, basePrice - firstTier.discount_amount),
        };
      }

      // Build description
      let description = `Rs. ${averagePrice.toFixed(0)} avg/item`;
      if (nextTierInfo && nextTierInfo.unitsNeeded > 0) {
        description += ` • Add ${nextTierInfo.unitsNeeded} more for Rs. ${nextTierInfo.priceAtNextTier}/item`;
      }

      return {
        averagePrice,
        totalCost,
        totalSavings,
        tierBreakdown,
        description,
        nextTierInfo,
      };
    };
  }, []);

  /**
   * Calculate price for a single unit at a specific position in the queue
   */
  const getUnitPriceAtPosition = useMemo(() => {
    return (basePrice: number, position: number, tiers: DiscountTier[]): number => {
      if (!tiers || tiers.length === 0 || position < 1) {
        return basePrice;
      }

      const sortedTiers = [...tiers]
        .filter(t => t.min_quantity >= 1 && t.discount_amount > 0)
        .sort((a, b) => b.min_quantity - a.min_quantity); // Sort descending to find highest applicable

      // Find the highest tier that applies to this position
      const applicableTier = sortedTiers.find(t => position >= t.min_quantity);
      
      if (applicableTier) {
        return Math.max(0, basePrice - applicableTier.discount_amount);
      }

      return basePrice;
    };
  }, []);

  return {
    calculateProgressivePricing,
    getUnitPriceAtPosition,
  };
}
