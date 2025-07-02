
import { supabase } from '@/integrations/supabase/client';

export interface StockInfo {
  stockSource: string;
  stockAmount: number;
  isValid: boolean;
  errorMessage?: string;
}

export interface StockUpdateResult {
  success: boolean;
  newStock: number;
  errorMessage?: string;
}

export interface CartValidationResult {
  isValid: boolean;
  invalidItems: any[];
  errorMessages: string[];
}

// Unified function to get stock information using database RPC
export async function getVariantStockInfo(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null
): Promise<StockInfo> {
  try {
    console.log('=== GETTING VARIANT STOCK INFO ===');
    console.log('Product ID:', productId);
    console.log('Color Variant ID:', colorVariantId);
    console.log('Size Variant ID:', sizeVariantId);

    const { data, error } = await supabase.rpc('get_variant_stock_info', {
      p_product_id: productId,
      p_color_variant_id: colorVariantId || null,
      p_size_variant_id: sizeVariantId || null
    });

    if (error) {
      console.error('RPC error:', error);
      return {
        stockSource: 'none',
        stockAmount: 0,
        isValid: false,
        errorMessage: 'Database error getting stock info'
      };
    }

    if (!data || data.length === 0) {
      return {
        stockSource: 'none',
        stockAmount: 0,
        isValid: false,
        errorMessage: 'No stock information found'
      };
    }

    const result = data[0];
    console.log('Stock info result:', result);

    return {
      stockSource: result.stock_source,
      stockAmount: result.stock_amount,
      isValid: result.is_valid,
      errorMessage: result.error_message
    };
  } catch (error) {
    console.error('Error getting variant stock info:', error);
    return {
      stockSource: 'none',
      stockAmount: 0,
      isValid: false,
      errorMessage: 'Error fetching stock information'
    };
  }
}

// Unified function to update stock atomically using database RPC
export async function updateVariantStockAtomic(
  productId: string,
  colorVariantId: string | null,
  sizeVariantId: string | null,
  stockChange: number
): Promise<StockUpdateResult> {
  try {
    console.log('=== UPDATING VARIANT STOCK ATOMICALLY ===');
    console.log('Product ID:', productId);
    console.log('Color Variant ID:', colorVariantId);
    console.log('Size Variant ID:', sizeVariantId);
    console.log('Stock Change:', stockChange);

    const { data, error } = await supabase.rpc('update_variant_stock_atomic', {
      p_product_id: productId,
      p_color_variant_id: colorVariantId,
      p_size_variant_id: sizeVariantId,
      p_stock_change: stockChange
    });

    if (error) {
      console.error('RPC error:', error);
      return {
        success: false,
        newStock: 0,
        errorMessage: 'Database error updating stock'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        newStock: 0,
        errorMessage: 'No result from stock update'
      };
    }

    const result = data[0];
    console.log('Stock update result:', result);

    return {
      success: result.success,
      newStock: result.new_stock,
      errorMessage: result.error_message
    };
  } catch (error) {
    console.error('Error updating variant stock:', error);
    return {
      success: false,
      newStock: 0,
      errorMessage: 'Error updating stock'
    };
  }
}

// Unified function to validate cart stock using database RPC
export async function validateCartStock(cartItems: any[]): Promise<CartValidationResult> {
  try {
    console.log('=== VALIDATING CART STOCK ===');
    console.log('Cart items count:', cartItems.length);

    if (cartItems.length === 0) {
      return {
        isValid: true,
        invalidItems: [],
        errorMessages: []
      };
    }

    // Convert cart items to JSONB format expected by the function
    const itemsJson = cartItems.map(item => ({
      productId: item.productId,
      colorVariantId: item.colorVariantId,
      sizeVariantId: item.sizeVariantId,
      quantity: item.quantity,
      productName: item.productName
    }));

    const { data, error } = await supabase.rpc('validate_cart_stock', {
      p_items: itemsJson
    });

    if (error) {
      console.error('RPC error:', error);
      return {
        isValid: false,
        invalidItems: [],
        errorMessages: ['Database error validating cart stock']
      };
    }

    if (!data || data.length === 0) {
      return {
        isValid: false,
        invalidItems: [],
        errorMessages: ['No result from cart validation']
      };
    }

    const result = data[0];
    console.log('Cart validation result:', result);

    return {
      isValid: result.is_valid,
      invalidItems: result.invalid_items || [],
      errorMessages: result.error_messages || []
    };
  } catch (error) {
    console.error('Error validating cart stock:', error);
    return {
      isValid: false,
      invalidItems: [],
      errorMessages: ['Error validating cart stock']
    };
  }
}

// Helper function to calculate total product stock
export async function calculateTotalProductStock(productId: string): Promise<number> {
  const stockInfo = await getVariantStockInfo(productId);
  if (!stockInfo.isValid) {
    return 0;
  }

  // For products with variants, we need to sum all variant stocks
  try {
    const { data: product } = await supabase
      .from('products')
      .select('has_color_variants, has_size_variants, stock_quantity')
      .eq('id', productId)
      .single();

    if (!product) return 0;

    if (!product.has_color_variants) {
      return product.stock_quantity || 0;
    }

    // Get all color variants for this product
    const { data: colorVariants } = await supabase
      .from('color_variants')
      .select(`
        stock_quantity,
        has_sizes,
        size_variants(stock_quantity)
      `)
      .eq('product_id', productId);

    if (!colorVariants) return 0;

    let totalStock = 0;
    
    for (const colorVariant of colorVariants) {
      if (colorVariant.has_sizes && colorVariant.size_variants) {
        // Sum size variant stocks
        totalStock += colorVariant.size_variants.reduce((sum: number, size: any) => 
          sum + (size.stock_quantity || 0), 0);
      } else {
        // Use color variant stock
        totalStock += colorVariant.stock_quantity || 0;
      }
    }

    return totalStock;
  } catch (error) {
    console.error('Error calculating total product stock:', error);
    return 0;
  }
}

// Batch stock operations for order processing
export async function processOrderStockChanges(
  orderItems: Array<{
    productId: string;
    colorVariantId?: string | null;
    sizeVariantId?: string | null;
    quantity: number;
  }>,
  operation: 'reduce' | 'restore'
): Promise<{ success: boolean; errors: string[] }> {
  console.log(`=== PROCESSING ORDER STOCK CHANGES: ${operation.toUpperCase()} ===`);
  console.log('Order items:', orderItems.length);

  const errors: string[] = [];
  const multiplier = operation === 'reduce' ? -1 : 1;

  for (const item of orderItems) {
    const stockChange = item.quantity * multiplier;
    
    const result = await updateVariantStockAtomic(
      item.productId,
      item.colorVariantId || null,
      item.sizeVariantId || null,
      stockChange
    );

    if (!result.success) {
      const errorMsg = result.errorMessage || `Failed to ${operation} stock for product ${item.productId}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    } else {
      console.log(`Successfully ${operation}d stock for product ${item.productId}: ${stockChange} units`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}
