
import { useMemo } from 'react';

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
  addedOrder: number; // Order in which item was added to cart
}

interface DiscountTier {
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface ItemPricingDetail {
  itemId: string;
  unitPrice: number;
  totalPrice: number;
  appliedTier: 'normal' | 'discount';
  tierInfo?: string;
  savings: number;
}

interface SubcategoryPricingInfo {
  subcategoryId: string;
  totalQuantity: number;
  moqReached: boolean;
  moqRequired: number;
  itemBreakdown: ItemPricingDetail[];
  totalSavings: number;
  description: string;
}

interface UseSubcategoryTieredPricingProps {
  cartItems: CartItem[];
  discountTiers: { [key: string]: DiscountTier[] };
}

export function useSubcategoryTieredPricing({ 
  cartItems, 
  discountTiers 
}: UseSubcategoryTieredPricingProps) {

  // Group items by subcategory and calculate FIFO pricing
  const subcategoryPricing = useMemo(() => {
    const subcategoryGroups: { [key: string]: CartItem[] } = {};
    
    // Group items by subcategory
    cartItems.forEach(item => {
      if (!subcategoryGroups[item.subcategoryId]) {
        subcategoryGroups[item.subcategoryId] = [];
      }
      subcategoryGroups[item.subcategoryId].push(item);
    });

    const pricingInfo: { [key: string]: SubcategoryPricingInfo } = {};

    Object.entries(subcategoryGroups).forEach(([subcategoryId, items]) => {
      const tiers = discountTiers[subcategoryId];
      const moqTier = tiers?.find(tier => tier.min_quantity > 1) || tiers?.[0];
      
      // NORMAL/MOQ MODE: Regular tiered pricing
      if (!moqTier) {
        // No discount tiers, all normal pricing
        const itemBreakdown: ItemPricingDetail[] = items.map(item => ({
          itemId: item.id,
          unitPrice: item.basePrice,
          totalPrice: item.basePrice * item.quantity,
          appliedTier: 'normal',
          savings: 0
        }));

        pricingInfo[subcategoryId] = {
          subcategoryId,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
          moqReached: false,
          moqRequired: 0,
          itemBreakdown,
          totalSavings: 0,
          description: 'Normal pricing'
        };
        return;
      }

      // Sort items by addedOrder to implement FIFO pricing
      const sortedItems = [...items].sort((a, b) => a.addedOrder - b.addedOrder);
      const totalQuantity = sortedItems.reduce((sum, item) => sum + item.quantity, 0);
      const moqReached = totalQuantity >= moqTier.min_quantity;
      const discountedPrice = Math.max(0, sortedItems[0].basePrice - moqTier.discount_amount);

      const itemBreakdown: ItemPricingDetail[] = [];
      let processedQuantity = 0;

      // Process each item in FIFO order
      sortedItems.forEach(item => {
        const itemStartPosition = processedQuantity + 1;
        const itemEndPosition = processedQuantity + item.quantity;
        
        if (!moqReached) {
          // MOQ not reached, all normal price
          itemBreakdown.push({
            itemId: item.id,
            unitPrice: item.basePrice,
            totalPrice: item.basePrice * item.quantity,
            appliedTier: 'normal',
            tierInfo: `Items ${itemStartPosition}-${itemEndPosition}: Normal price (MOQ ${moqTier.min_quantity} not reached)`,
            savings: 0
          });
        } else {
          // MOQ reached, calculate mixed pricing for this item
          const normalPriceQuantity = Math.max(0, Math.min(item.quantity, moqTier.min_quantity - processedQuantity));
          const discountPriceQuantity = item.quantity - normalPriceQuantity;
          
          const normalCost = normalPriceQuantity * item.basePrice;
          const discountCost = discountPriceQuantity * discountedPrice;
          const totalCost = normalCost + discountCost;
          const savings = discountPriceQuantity * moqTier.discount_amount;

          let tierInfo = '';
          if (normalPriceQuantity > 0 && discountPriceQuantity > 0) {
            tierInfo = `Items ${itemStartPosition}-${itemStartPosition + normalPriceQuantity - 1}: Rs.${item.basePrice} each, Items ${itemStartPosition + normalPriceQuantity}-${itemEndPosition}: Rs.${discountedPrice} each (MOQ discount)`;
          } else if (normalPriceQuantity > 0) {
            tierInfo = `Items ${itemStartPosition}-${itemEndPosition}: Rs.${item.basePrice} each (before MOQ)`;
          } else {
            tierInfo = `Items ${itemStartPosition}-${itemEndPosition}: Rs.${discountedPrice} each (MOQ discount applied)`;
          }

          itemBreakdown.push({
            itemId: item.id,
            unitPrice: totalCost / item.quantity, // Average price for this item
            totalPrice: totalCost,
            appliedTier: discountPriceQuantity > 0 ? 'discount' : 'normal',
            tierInfo,
            savings
          });
        }

        processedQuantity += item.quantity;
      });

      pricingInfo[subcategoryId] = {
        subcategoryId,
        totalQuantity,
        moqReached,
        moqRequired: moqTier.min_quantity,
        itemBreakdown,
        totalSavings: itemBreakdown.reduce((sum, item) => sum + item.savings, 0),
        description: moqReached 
          ? `MOQ ${moqTier.min_quantity} reached - volume discount active` 
          : `Need ${moqTier.min_quantity - totalQuantity} more items for volume discount`
      };
    });

    return pricingInfo;
  }, [cartItems, discountTiers]);

  const getItemPricing = useMemo(() => {
    return (itemId: string) => {
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
        return total + subcategory.itemBreakdown.reduce((subtotal, item) => {
          return subtotal + item.totalPrice;
        }, 0);
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
