
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { validateCartStock } from '@/utils/inventoryManager';

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
  // Legacy support for old cart items
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
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

  // Use the unified cart validation function
  const cartValidationResult = await validateCartStock(cartItems);

  if (cartValidationResult.isValid) {
    // All items are valid
    return {
      validItems: cartItems,
      removedItems: [],
      errors: []
    };
  }

  // Some items are invalid, need to check each item individually
  for (const item of cartItems) {
    try {
      // Check if product exists and is active
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, status, has_color_variants, color_has_size_variants')
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

      // Validate stock using unified stock system
      const stockValidation = await validateCartStock([item]);

      if (!stockValidation.isValid) {
        console.log(`Stock validation failed for ${item.productId}: ${stockValidation.errorMessages?.[0]}`);
        
        // For now, remove items that fail validation
        removedItems.push(item);
        errors.push(`"${item.productName}" was removed due to stock issues`);
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

// Helper function to validate a single cart item
export async function validateSingleCartItem(item: CartItem): Promise<{
  isValid: boolean;
  adjustedQuantity?: number;
  errorMessage?: string;
}> {
  try {
    const validation = await validateCartStock([item]);

    if (!validation.isValid) {
      return {
        isValid: false,
        errorMessage: validation.errorMessages?.[0] || 'Stock validation failed'
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating single cart item:', error);
    return {
      isValid: false,
      errorMessage: 'Error validating item'
    };
  }
}
