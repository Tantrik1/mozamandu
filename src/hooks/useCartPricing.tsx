
import { useMemo } from 'react';
import { usePricing } from './usePricing';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productInventoryId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
  image_url?: string;
}

interface ComboData {
  id: string;
  name: string;
  description: string;
  combo_subcategories: {
    subcategory_id: string;
    min_units: number;
    price: number;
  }[];
}

interface DiscountTier {
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface PricingInfo {
  finalPrice: number;
  description: string;
  mode: 'normal' | 'discount' | 'combo';
  isCombo?: boolean;
  breakdown?: string[];
}

interface UseCartPricingProps {
  cartItems: CartItem[];
  activeCombo: ComboData | null;
  discountTiers: { [key: string]: DiscountTier[] };
}

export function useCartPricing({ cartItems, activeCombo, discountTiers }: UseCartPricingProps) {
  const { calculateTieredPricing } = usePricing();

  const subcategoryQuantities = useMemo(() => {
    const quantities: { [key: string]: number } = {};
    cartItems.forEach(item => {
      quantities[item.subcategoryId] = (quantities[item.subcategoryId] || 0) + item.quantity;
    });
    return quantities;
  }, [cartItems]);

  const getItemPricing = useMemo(() => {
    return (item: CartItem): PricingInfo => {
      const subcategoryTotalQty = subcategoryQuantities[item.subcategoryId] || 0;

      // Priority 1: Check if combo is active and applies to this subcategory
      if (activeCombo) {
        const comboSubcategory = activeCombo.combo_subcategories.find(
          cs => cs.subcategory_id === item.subcategoryId
        );

        if (comboSubcategory && subcategoryTotalQty >= comboSubcategory.min_units) {
          return {
            finalPrice: comboSubcategory.price,
            description: `Combo Price: Rs. ${comboSubcategory.price.toFixed(2)} each (${activeCombo.name})`,
            mode: 'combo',
            isCombo: true,
            breakdown: [
              `Base price: Rs. ${item.basePrice.toFixed(2)}`,
              `${activeCombo.name} combo price: Rs. ${comboSubcategory.price.toFixed(2)}`,
              `You save: Rs. ${(item.basePrice - comboSubcategory.price).toFixed(2)} per item`,
              'Minimum quantity requirements waived for combo pricing'
            ]
          };
        }
      }

      // Priority 2: Check for discount tiers based on subcategory total (MOQ) - only if combo is not active
      const tiers = discountTiers[item.subcategoryId];
      if (tiers && tiers.length > 0 && subcategoryTotalQty >= tiers[0].min_quantity && !activeCombo) {
        const pricing = calculateTieredPricing(item.basePrice, subcategoryTotalQty, tiers);
        return {
          finalPrice: pricing.finalPrice,
          description: `MOQ Discount: Rs. ${pricing.finalPrice.toFixed(2)} each (${subcategoryTotalQty} units)`,
          mode: 'discount',
          breakdown: [
            `Base price: Rs. ${item.basePrice.toFixed(2)}`,
            `Quantity discount applied for ${subcategoryTotalQty} units`,
            `Final price: Rs. ${pricing.finalPrice.toFixed(2)} each`,
            `You save: Rs. ${(item.basePrice - pricing.finalPrice).toFixed(2)} per item`,
            ...pricing.breakdown
          ]
        };
      }

      // Priority 3: Normal pricing
      return {
        finalPrice: item.basePrice,
        description: `Regular Price: Rs. ${item.basePrice.toFixed(2)} each`,
        mode: 'normal',
        breakdown: [
          `Base price: Rs. ${item.basePrice.toFixed(2)}`,
          'No discounts applied'
        ]
      };
    };
  }, [subcategoryQuantities, activeCombo, discountTiers, calculateTieredPricing]);

  const getTotalPrice = useMemo(() => {
    return (): number => {
      return cartItems.reduce((total, item) => {
        const pricing = getItemPricing(item);
        return total + (pricing.finalPrice * item.quantity);
      }, 0);
    };
  }, [cartItems, getItemPricing]);

  return {
    getItemPricing,
    getTotalPrice,
    subcategoryQuantities
  };
}
