
import { useMemo } from 'react';
import { usePricing } from './usePricing';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
  image_url?: string;
  sku?: string;
  inventoryId?: string;
  addedOrder: number; // Order in which item was added to cart (FIFO)
}

interface DiscountTier {
  min_quantity: number;
  max_quantity: number | null;
  discount_amount?: number;
  discount_percentage?: number; // For backward compatibility
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

interface ItemPricingDetail {
  itemId: string;
  basePrice: number;
  /** Units at base price for this item */
  unitsAtBase: number;
  basePriceTotal: number;
  /** Discounted units breakdown for this item */
  discountedUnits: Array<{
    tierName: string;
    units: number;
    unitPrice: number;
    discountAmount: number;
    total: number;
  }>;
  /** Total for this item after progressive discounts */
  totalPrice: number;
  /** Total savings for this item */
  savings: number;
  /** Average unit price for this item */
  averageUnitPrice: number;
}

interface SubcategoryPricingInfo {
  subcategoryId: string;
  totalQuantity: number;
  basePrice: number;
  /** Complete tier breakdown for the subcategory */
  tierBreakdown: TierBreakdown[];
  /** Per-item pricing details */
  itemBreakdown: ItemPricingDetail[];
  /** Total cost for this subcategory */
  totalCost: number;
  /** Total savings for this subcategory */
  totalSavings: number;
  /** Next tier info */
  nextTierInfo?: {
    unitsNeeded: number;
    discountAmount: number;
    priceAtNextTier: number;
  };
  /** Display description */
  description: string;
}

interface UseSubcategoryTieredPricingProps {
  cartItems: CartItem[];
  discountTiers: { [subcategoryId: string]: DiscountTier[] };
}

/**
 * Progressive Quantity-Based Discount System for Cart
 * 
 * Groups items by subcategory and applies ladder-style progressive discounts.
 * Uses FIFO ordering to determine which units get which tier prices.
 */
export function useSubcategoryTieredPricing({ 
  cartItems, 
  discountTiers 
}: UseSubcategoryTieredPricingProps) {
  const { calculateProgressivePricing, getUnitPriceAtPosition } = usePricing();

  const subcategoryPricing = useMemo(() => {
    // Group items by subcategory
    const subcategoryGroups: { [key: string]: CartItem[] } = {};
    
    cartItems.forEach(item => {
      if (!subcategoryGroups[item.subcategoryId]) {
        subcategoryGroups[item.subcategoryId] = [];
      }
      subcategoryGroups[item.subcategoryId].push(item);
    });

    const pricingInfo: { [key: string]: SubcategoryPricingInfo } = {};

    Object.entries(subcategoryGroups).forEach(([subcategoryId, items]) => {
      // Sort items by addedOrder (FIFO) - earliest added items get base price
      const sortedItems = [...items].sort((a, b) => a.addedOrder - b.addedOrder);
      
      // Normalize tiers
      const tiersRaw = discountTiers[subcategoryId] || [];
      const normalizedTiers = tiersRaw
        .map((tier) => ({
          min_quantity: Number(tier.min_quantity) || 1,
          max_quantity: tier.max_quantity === null || tier.max_quantity === undefined
            ? null
            : Number(tier.max_quantity),
          discount_amount: Number(tier.discount_amount ?? tier.discount_percentage ?? 0) || 0,
        }))
        .filter(t => t.min_quantity >= 1 && t.discount_amount > 0)
        .sort((a, b) => a.min_quantity - b.min_quantity);

      const totalQuantity = sortedItems.reduce((sum, item) => sum + item.quantity, 0);
      const basePrice = sortedItems[0]?.basePrice || 0;

      // Calculate overall tier breakdown for the subcategory
      const overallPricing = calculateProgressivePricing(basePrice, totalQuantity, normalizedTiers);

      // Now distribute the progressive pricing to individual items (FIFO)
      const itemBreakdown: ItemPricingDetail[] = [];
      let globalPosition = 0; // Track position across all items

      for (const item of sortedItems) {
        let unitsAtBase = 0;
        let basePriceTotal = 0;
        const discountedUnits: ItemPricingDetail['discountedUnits'] = [];
        let itemTotal = 0;
        let itemSavings = 0;

        // Process each unit of this item
        for (let u = 0; u < item.quantity; u++) {
          globalPosition++;
          const unitPrice = getUnitPriceAtPosition(item.basePrice, globalPosition, normalizedTiers);
          const unitSavings = item.basePrice - unitPrice;

          if (unitSavings === 0) {
            // Base price unit
            unitsAtBase++;
            basePriceTotal += unitPrice;
          } else {
            // Find which tier this belongs to
            const applicableTier = [...normalizedTiers]
              .sort((a, b) => b.min_quantity - a.min_quantity)
              .find(t => globalPosition >= t.min_quantity);
            
            if (applicableTier) {
              const tierKey = `${applicableTier.min_quantity}+`;
              const existingTier = discountedUnits.find(d => d.tierName === tierKey);
              
              if (existingTier) {
                existingTier.units++;
                existingTier.total += unitPrice;
              } else {
                discountedUnits.push({
                  tierName: tierKey,
                  units: 1,
                  unitPrice,
                  discountAmount: applicableTier.discount_amount,
                  total: unitPrice,
                });
              }
            }
          }

          itemTotal += unitPrice;
          itemSavings += unitSavings;
        }

        itemBreakdown.push({
          itemId: item.id,
          basePrice: item.basePrice,
          unitsAtBase,
          basePriceTotal,
          discountedUnits,
          totalPrice: itemTotal,
          savings: itemSavings,
          averageUnitPrice: item.quantity > 0 ? itemTotal / item.quantity : item.basePrice,
        });
      }

      // Build description
      let description = `Rs. ${overallPricing.averagePrice.toFixed(0)} avg/item`;
      if (overallPricing.nextTierInfo && overallPricing.nextTierInfo.unitsNeeded > 0) {
        description = `Add ${overallPricing.nextTierInfo.unitsNeeded} more for Rs. ${overallPricing.nextTierInfo.priceAtNextTier}/item discount`;
      } else if (overallPricing.totalSavings > 0) {
        description = `Progressive discount active - Save Rs. ${overallPricing.totalSavings}`;
      }

      pricingInfo[subcategoryId] = {
        subcategoryId,
        totalQuantity,
        basePrice,
        tierBreakdown: overallPricing.tierBreakdown,
        itemBreakdown,
        totalCost: overallPricing.totalCost,
        totalSavings: overallPricing.totalSavings,
        nextTierInfo: overallPricing.nextTierInfo,
        description,
      };
    });

    return pricingInfo;
  }, [cartItems, discountTiers, calculateProgressivePricing, getUnitPriceAtPosition]);

  const getItemPricing = useMemo(() => {
    return (itemId: string): (ItemPricingDetail & { subcategoryInfo: SubcategoryPricingInfo }) | null => {
      for (const subcategoryInfo of Object.values(subcategoryPricing)) {
        const itemDetail = subcategoryInfo.itemBreakdown.find(item => item.itemId === itemId);
        if (itemDetail) {
          return {
            ...itemDetail,
            subcategoryInfo
          };
        }
      }
      return null;
    };
  }, [subcategoryPricing]);

  const getTotalPrice = useMemo(() => {
    return (): number => {
      return Object.values(subcategoryPricing).reduce((total, subcategory) => {
        return total + subcategory.totalCost;
      }, 0);
    };
  }, [subcategoryPricing]);

  const getTotalSavings = useMemo(() => {
    return (): number => {
      return Object.values(subcategoryPricing).reduce((total, subcategory) => {
        return total + subcategory.totalSavings;
      }, 0);
    };
  }, [subcategoryPricing]);

  return {
    subcategoryPricing,
    getItemPricing,
    getTotalPrice,
    getTotalSavings
  };
}
