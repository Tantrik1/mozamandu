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

interface EnhancedPricingInfo {
  finalPrice: number;
  currentItemPrice: number; // Exact price for this item at current quantity
  description: string;
  mode: 'normal' | 'discount' | 'combo';
  isCombo?: boolean;
  breakdown?: string[];
  savings?: number;
  detailedBreakdown?: {
    normalQuantity: number;
    normalPrice: number;
    discountQuantity: number;
    discountPrice: number;
    totalSavings: number;
  };
}

interface UseEnhancedCartPricingProps {
  cartItems: CartItem[];
  activeCombo: ComboData | null;
  discountTiers: { [key: string]: DiscountTier[] };
}

export function useEnhancedCartPricing({ cartItems, activeCombo, discountTiers }: UseEnhancedCartPricingProps) {
  const { calculateTieredPricing } = usePricing();

  const getItemPricing = useMemo(() => {
    return (item: CartItem): EnhancedPricingInfo => {
      // Priority 1: Check if combo is active and applies to this subcategory
      if (activeCombo) {
        const comboSubcategory = activeCombo.combo_subcategories.find(
          cs => cs.subcategory_id === item.subcategoryId
        );
        
        if (comboSubcategory) {
          // In combo mode, MOQ is ignored completely
          return {
            finalPrice: comboSubcategory.price,
            currentItemPrice: comboSubcategory.price,
            description: `Rs. ${comboSubcategory.price.toFixed(2)} each (Combo price - No MOQ required)`,
            mode: 'combo',
            isCombo: true,
            breakdown: [
              `Base price: Rs. ${item.basePrice.toFixed(2)}`,
              `Combo price: Rs. ${comboSubcategory.price.toFixed(2)}`,
              'Minimum quantity requirements waived for combo'
            ],
            savings: Math.max(0, item.basePrice - comboSubcategory.price)
          };
        }
      }

      // Priority 2: Check for discount tiers based on INDIVIDUAL item quantity (not subcategory total)
      const tiers = discountTiers[item.subcategoryId];
      if (tiers && tiers.length > 0 && !activeCombo) {
        const pricing = calculateTieredPricing(item.basePrice, item.quantity, tiers);
        return {
          finalPrice: pricing.finalPrice,
          currentItemPrice: pricing.currentItemPrice,
          description: pricing.description,
          mode: 'discount',
          breakdown: pricing.breakdown,
          savings: pricing.savings,
          detailedBreakdown: pricing.detailedBreakdown
        };
      }

      // Priority 3: Normal pricing
      return {
        finalPrice: item.basePrice,
        currentItemPrice: item.basePrice,
        description: `Rs. ${item.basePrice.toFixed(2)} each`,
        mode: 'normal',
        savings: 0
      };
    };
  }, [activeCombo, discountTiers, calculateTieredPricing]);

  const getTotalPrice = useMemo(() => {
    return (): number => {
      return cartItems.reduce((total, item) => {
        const pricing = getItemPricing(item);
        return total + (pricing.finalPrice * item.quantity);
      }, 0);
    };
  }, [cartItems, getItemPricing]);

  const getTotalSavings = useMemo(() => {
    return (): number => {
      return cartItems.reduce((total, item) => {
        const pricing = getItemPricing(item);
        return total + ((pricing.savings || 0) * item.quantity);
      }, 0);
    };
  }, [cartItems, getItemPricing]);

  return {
    getItemPricing,
    getTotalPrice,
    getTotalSavings
  };
}