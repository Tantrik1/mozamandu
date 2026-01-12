
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
  discount_amount?: number;
  discount_percentage?: number; // For backward compatibility with Lovable Cloud DB
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
      const tiersRaw = discountTiers[subcategoryId] || [];

      // Normalize tiers: price-based discount only
      const tiers = (tiersRaw as any[])
        .map((tier) => ({
          min_quantity: Number(tier.min_quantity) || 1,
          max_quantity: tier.max_quantity === null || tier.max_quantity === undefined
            ? null
            : Number(tier.max_quantity),
          discount_amount: Number(tier.discount_amount ?? tier.discount_percentage ?? 0) || 0,
        }))
        .filter(t => t.min_quantity >= 1)
        .sort((a, b) => a.min_quantity - b.min_quantity);

      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // Highest applicable tier wins (volume-wise discount)
      const applicableTier = [...tiers]
        .sort((a, b) => b.min_quantity - a.min_quantity)
        .find(t =>
          t.discount_amount > 0 &&
          totalQuantity >= t.min_quantity &&
          (t.max_quantity === null || totalQuantity <= t.max_quantity)
        ) || null;

      const discountAmt = applicableTier?.discount_amount ?? 0;
      const firstDiscountTier = tiers.find(t => t.discount_amount > 0) || null;

      const itemBreakdown: ItemPricingDetail[] = items.map(item => {
        const unitPrice = discountAmt > 0
          ? Math.max(0, item.basePrice - discountAmt)
          : item.basePrice;

        const totalPrice = unitPrice * item.quantity;
        const savings = discountAmt > 0 ? discountAmt * item.quantity : 0;

        return {
          itemId: item.id,
          unitPrice,
          totalPrice,
          appliedTier: discountAmt > 0 ? 'discount' : 'normal',
          tierInfo: discountAmt > 0 && applicableTier
            ? `Qty ${applicableTier.min_quantity}+ : Rs.${discountAmt} off / item`
            : undefined,
          savings,
        };
      });

      const totalSavings = itemBreakdown.reduce((sum, item) => sum + item.savings, 0);

      let description = 'Normal pricing';
      if (discountAmt > 0 && applicableTier) {
        description = `Volume discount active (Rs.${discountAmt} off / item)`;
      } else if (firstDiscountTier && totalQuantity < firstDiscountTier.min_quantity) {
        description = `Add ${firstDiscountTier.min_quantity - totalQuantity} more items for volume discount`;
      }

      pricingInfo[subcategoryId] = {
        subcategoryId,
        totalQuantity,
        moqReached: discountAmt > 0,
        moqRequired: firstDiscountTier?.min_quantity || 0,
        itemBreakdown,
        totalSavings,
        description,
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
