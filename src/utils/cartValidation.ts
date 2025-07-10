
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

  // During cart validation, we only check if products exist and are active
  // Stock validation happens only during checkout
  for (const item of cartItems) {
    try {
      // Check if product exists and is active
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, status')
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

// Helper function to validate a single cart item (simplified for cart operations)
export async function validateSingleCartItem(item: CartItem): Promise<{
  isValid: boolean;
  adjustedQuantity?: number;
  errorMessage?: string;
}> {
  try {
    // Only check if product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, status')
      .eq('id', item.productId)
      .single();

    if (productError || !product || product.status !== 'active') {
      return {
        isValid: false,
        errorMessage: 'Product is no longer available'
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
