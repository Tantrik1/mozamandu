
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
          const savings = item.basePrice - comboSubcategory.price;
          const totalSavings = savings * item.quantity;
          
          return {
            finalPrice: comboSubcategory.price,
            description: `Combo Price: Rs. ${comboSubcategory.price.toFixed(2)} each (${activeCombo.name})`,
            mode: 'combo',
            isCombo: true,
            breakdown: [
              `✓ ${activeCombo.name} combo pricing applied`,
              `Base price: Rs. ${item.basePrice.toFixed(2)} per item`,
              `Combo price: Rs. ${comboSubcategory.price.toFixed(2)} per item`,
              `You save: Rs. ${savings.toFixed(2)} per item`,
              `Total savings: Rs. ${totalSavings.toFixed(2)} for ${item.quantity} items`,
              `Minimum quantity requirement: ${comboSubcategory.min_units} items`,
              `Current subcategory total: ${subcategoryTotalQty} items ✓`,
              '🎉 Minimum quantity requirements waived for combo pricing'
            ]
          };
        } else if (comboSubcategory) {
          // Combo exists but minimum not met
          const needed = comboSubcategory.min_units - subcategoryTotalQty;
          return {
            finalPrice: item.basePrice,
            description: `Regular Price: Rs. ${item.basePrice.toFixed(2)} each`,
            mode: 'normal',
            breakdown: [
              `Base price: Rs. ${item.basePrice.toFixed(2)} per item`,
              `⚠️ ${activeCombo.name} combo available but not activated`,
              `Need ${needed} more items in this subcategory for combo pricing`,
              `Combo price would be: Rs. ${comboSubcategory.price.toFixed(2)} per item`,
              `Potential savings: Rs. ${(item.basePrice - comboSubcategory.price).toFixed(2)} per item`,
              '💡 Add more items to activate combo pricing!'
            ]
          };
        }
      }

      // Priority 2: Check for discount tiers based on subcategory total (MOQ) - only if combo is not active
      const tiers = discountTiers[item.subcategoryId];
      if (tiers && tiers.length > 0 && subcategoryTotalQty >= tiers[0].min_quantity && !activeCombo) {
        const pricing = calculateTieredPricing(item.basePrice, subcategoryTotalQty, tiers);
        const savings = item.basePrice - pricing.finalPrice;
        const totalSavings = savings * item.quantity;
        
        // Find applicable tier
        const applicableTier = tiers.find(tier => 
          subcategoryTotalQty >= tier.min_quantity && 
          (tier.max_quantity === null || subcategoryTotalQty <= tier.max_quantity)
        );
        
        return {
          finalPrice: pricing.finalPrice,
          description: `MOQ Discount: Rs. ${pricing.finalPrice.toFixed(2)} each (${subcategoryTotalQty} units)`,
          mode: 'discount',
          breakdown: [
            `✓ Minimum Order Quantity (MOQ) discount applied`,
            `Base price: Rs. ${item.basePrice.toFixed(2)} per item`,
            `Discounted price: Rs. ${pricing.finalPrice.toFixed(2)} per item`,
            `Discount tier: ${applicableTier?.min_quantity}-${applicableTier?.max_quantity || '∞'} units`,
            `Discount amount: Rs. ${applicableTier?.discount_amount.toFixed(2)} per item`,
            `You save: Rs. ${savings.toFixed(2)} per item`,
            `Total savings: Rs. ${totalSavings.toFixed(2)} for ${item.quantity} items`,
            `Current subcategory total: ${subcategoryTotalQty} items ✓`,
            ...pricing.breakdown
          ]
        };
      } else if (tiers && tiers.length > 0 && !activeCombo) {
        // MOQ tiers exist but minimum not met
        const firstTier = tiers[0];
        const needed = firstTier.min_quantity - subcategoryTotalQty;
        const potentialSavings = firstTier.discount_amount;
        
        return {
          finalPrice: item.basePrice,
          description: `Regular Price: Rs. ${item.basePrice.toFixed(2)} each`,
          mode: 'normal',
          breakdown: [
            `Base price: Rs. ${item.basePrice.toFixed(2)} per item`,
            `⚠️ MOQ discount available but not activated`,
            `Need ${needed} more items in this subcategory for MOQ discount`,
            `First discount tier: ${firstTier.min_quantity} items minimum`,
            `Potential discount: Rs. ${potentialSavings.toFixed(2)} per item`,
            `Potential price: Rs. ${(item.basePrice - potentialSavings).toFixed(2)} per item`,
            `Current subcategory total: ${subcategoryTotalQty} items`,
            '💡 Add more items to unlock MOQ discount!'
          ]
        };
      }

      // Priority 3: Normal pricing
      return {
        finalPrice: item.basePrice,
        description: `Regular Price: Rs. ${item.basePrice.toFixed(2)} each`,
        mode: 'normal',
        breakdown: [
          `Base price: Rs. ${item.basePrice.toFixed(2)} per item`,
          `Current subcategory total: ${subcategoryTotalQty} items`,
          '📝 No discounts or combo pricing applied',
          activeCombo ? '💡 This item is not part of the active combo' : '💡 No active combo or MOQ discounts available'
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
