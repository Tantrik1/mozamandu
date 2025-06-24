
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
            description: `Combo: Rs.${comboSubcategory.price.toFixed(2)} each`,
            mode: 'combo',
            isCombo: true
          };
        }
      }

      // Priority 2: Check for discount tiers based on subcategory total (MOQ)
      const tiers = discountTiers[item.subcategoryId];
      if (tiers && tiers.length > 0 && subcategoryTotalQty >= tiers[0].min_quantity) {
        const pricing = calculateTieredPricing(item.basePrice, subcategoryTotalQty, tiers);
        return {
          finalPrice: pricing.finalPrice,
          description: `MOQ Discount: ${pricing.description}`,
          mode: 'discount',
          breakdown: pricing.breakdown
        };
      }

      // Priority 3: Normal pricing
      return {
        finalPrice: item.basePrice,
        description: `Rs. ${item.basePrice.toFixed(2)} each`,
        mode: 'normal'
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
