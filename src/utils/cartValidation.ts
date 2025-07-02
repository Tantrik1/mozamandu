
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getVariantStockInfo } from './unifiedStockManager';

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

interface ValidationResult {
  validItems: CartItem[];
  removedItems: CartItem[];
  errors: string[];
}

export async function validateCartItems(cartItems: CartItem[]): Promise<ValidationResult> {
  const validItems: CartItem[] = [];
  const removedItems: CartItem[] = [];
  const errors: string[] = [];

  console.log('Validating cart items:', cartItems.length);

  for (const item of cartItems) {
    try {
      // Check if product exists and is active
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, status, has_color_variants, has_size_variants')
        .eq('id', item.productId)
        .single();

      if (productError || !product) {
        console.log(`Product ${item.productId} not found, removing from cart`);
        removedItems.push(item);
        errors.push(`Product "${item.productName}" no longer exists and was removed from cart`);
        continue;
      }

      if (product.status !== 'active') {
        console.log(`Product ${item.productId} is inactive, removing from cart`);
        removedItems.push(item);
        errors.push(`Product "${item.productName}" is no longer available and was removed from cart`);
        continue;
      }

      // Validate variants using unified stock system
      const stockInfo = await getVariantStockInfo(
        item.productId,
        item.colorVariantId,
        item.sizeVariantId
      );

      if (!stockInfo.isValid) {
        console.log(`Stock validation failed for ${item.productId}: ${stockInfo.errorMessage}`);
        removedItems.push(item);
        errors.push(`"${item.productName}" has variant issues and was removed from cart`);
        continue;
      }

      // Check if we have enough stock
      if (stockInfo.stockAmount < item.quantity) {
        console.log(`Insufficient stock for ${item.productId}: available ${stockInfo.stockAmount}, needed ${item.quantity}`);
        
        if (stockInfo.stockAmount > 0) {
          // Adjust quantity to available stock
          item.quantity = stockInfo.stockAmount;
          validItems.push(item);
          errors.push(`"${item.productName}" quantity reduced to ${stockInfo.stockAmount} (available stock)`);
        } else {
          // No stock available, remove item
          removedItems.push(item);
          errors.push(`"${item.productName}" is out of stock and was removed from cart`);
        }
        continue;
      }

      // If we reach here, the item is valid
      validItems.push(item);
      console.log(`Cart item validated: ${item.productName}`);

    } catch (error) {
      console.error('Error validating cart item:', error);
      removedItems.push(item);
      errors.push(`Error validating "${item.productName}" - item was removed from cart`);
    }
  }

  console.log(`Cart validation complete: ${validItems.length} valid, ${removedItems.length} removed`);
  return { validItems, removedItems, errors };
}

export function showCartCleanupNotification(removedItems: CartItem[], errors: string[]) {
  if (removedItems.length > 0) {
    toast({
      title: "Cart Updated",
      description: `${removedItems.length} invalid item(s) removed from cart. ${errors[0]}`,
      variant: "destructive",
    });
  }
}
