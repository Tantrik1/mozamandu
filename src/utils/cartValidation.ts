
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
      // Check if product exists
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

      // Validate color variant if specified
      if (item.colorVariantId) {
        const { data: colorVariant, error: colorError } = await supabase
          .from('color_variants')
          .select('id, color_name')
          .eq('id', item.colorVariantId)
          .eq('product_id', item.productId)
          .single();

        if (colorError || !colorVariant) {
          console.log(`Color variant ${item.colorVariantId} not found, removing from cart`);
          removedItems.push(item);
          errors.push(`Color variant for "${item.productName}" no longer exists and was removed from cart`);
          continue;
        }
      }

      // Validate size variant if specified
      if (item.sizeVariantId) {
        const { data: sizeVariant, error: sizeError } = await supabase
          .from('size_variants')
          .select('id, size_name, color_variant_id')
          .eq('id', item.sizeVariantId)
          .single();

        if (sizeError || !sizeVariant) {
          console.log(`Size variant ${item.sizeVariantId} not found, removing from cart`);
          removedItems.push(item);
          errors.push(`Size variant for "${item.productName}" no longer exists and was removed from cart`);
          continue;
        }

        // Ensure size variant belongs to the correct color variant
        if (item.colorVariantId && sizeVariant.color_variant_id !== item.colorVariantId) {
          console.log(`Size variant ${item.sizeVariantId} doesn't belong to color variant ${item.colorVariantId}`);
          removedItems.push(item);
          errors.push(`Invalid variant combination for "${item.productName}" was removed from cart`);
          continue;
        }
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
