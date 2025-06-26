
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
  
  const getItemPricing = (item: CartItem): PricingInfo => {
    const subcategoryQuantity = cartItems
      .filter(cartItem => cartItem.subcategoryId === item.subcategoryId)
      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);

    // Check for combo pricing first
    if (activeCombo) {
      const comboSubcategory = activeCombo.combo_subcategories.find(
        cs => cs.subcategory_id === item.subcategoryId
      );
      
      if (comboSubcategory && subcategoryQuantity >= comboSubcategory.min_units) {
        return {
          finalPrice: comboSubcategory.price,
          description: `Combo: ${activeCombo.name}`,
          mode: 'combo',
          isCombo: true,
          breakdown: [`Combo Price: Rs. ${comboSubcategory.price}`]
        };
      }
    }

    // Check for discount tiers
    const tierDiscounts = discountTiers[item.subcategoryId] || [];
    const applicableTier = tierDiscounts.find(tier => 
      subcategoryQuantity >= tier.min_quantity && 
      (tier.max_quantity === null || subcategoryQuantity <= tier.max_quantity)
    );

    if (applicableTier) {
      const discountedPrice = Math.max(0, item.basePrice - applicableTier.discount_amount);
      return {
        finalPrice: discountedPrice,
        description: `Bulk Discount (${subcategoryQuantity} units)`,
        mode: 'discount',
        breakdown: [
          `Base Price: Rs. ${item.basePrice}`,
          `Discount: -Rs. ${applicableTier.discount_amount}`,
          `Final Price: Rs. ${discountedPrice}`
        ]
      };
    }

    // Normal pricing
    return {
      finalPrice: item.basePrice,
      description: 'Regular Price',
      mode: 'normal',
      breakdown: [`Regular Price: Rs. ${item.basePrice}`]
    };
  };

  const getTotalPrice = (): number => {
    return cartItems.reduce((total, item) => {
      const pricing = getItemPricing(item);
      return total + (pricing.finalPrice * item.quantity);
    }, 0);
  };

  return {
    getItemPricing,
    getTotalPrice
  };
}
