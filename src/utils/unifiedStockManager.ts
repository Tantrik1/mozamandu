
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

// Unified function to get stock information using improved database RPC
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

    const { data, error } = await supabase.rpc('get_variant_stock_info' as any, {
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

    if (!data || !Array.isArray(data) || data.length === 0) {
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

// Unified function to update stock atomically using improved database RPC
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

    const { data, error } = await supabase.rpc('update_variant_stock_atomic' as any, {
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

    if (!data || !Array.isArray(data) || data.length === 0) {
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

    const { data, error } = await supabase.rpc('validate_cart_stock' as any, {
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

    if (!data || !Array.isArray(data) || data.length === 0) {
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

// Helper function to get detailed product variant information
export async function getProductVariantDetails(productId: string) {
  try {
    const { data, error } = await supabase
      .from('product_variants_summary')
      .select('*')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching product variant details:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProductVariantDetails:', error);
    return [];
  }
}

// Helper function to calculate total product stock (now uses automatic triggers)
export async function calculateTotalProductStock(productId: string): Promise<number> {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (!product) return 0;

    // The database triggers automatically maintain the stock_quantity
    // so we can directly return the product's stock_quantity
    return product.stock_quantity || 0;
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

// Helper function to get stock breakdown by variant
export async function getStockBreakdown(productId: string) {
  try {
    const variants = await getProductVariantDetails(productId);
    
    const breakdown = {
      totalStock: 0,
      colorVariants: [] as Array<{
        colorName: string;
        colorStock: number;
        sizeVariants: Array<{
          sizeName: string;
          sizeStock: number;
        }>;
      }>
    };

    const colorMap = new Map();

    for (const variant of variants) {
      breakdown.totalStock = variant.product_total_stock || 0;
      
      if (variant.color_variant_id) {
        if (!colorMap.has(variant.color_variant_id)) {
          colorMap.set(variant.color_variant_id, {
            colorName: variant.color_name,
            colorStock: variant.color_total_stock || 0,
            sizeVariants: []
          });
        }
        
        const colorVariant = colorMap.get(variant.color_variant_id);
        
        if (variant.size_variant_id) {
          colorVariant.sizeVariants.push({
            sizeName: variant.size_name,
            sizeStock: variant.variant_stock_quantity || 0
          });
        }
      }
    }

    breakdown.colorVariants = Array.from(colorMap.values());
    
    return breakdown;
  } catch (error) {
    console.error('Error getting stock breakdown:', error);
    return {
      totalStock: 0,
      colorVariants: []
    };
  }
}
