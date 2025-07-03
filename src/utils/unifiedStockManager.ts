
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

// Unified function to get stock information using the breakdown table
export async function getVariantStockInfo(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null
): Promise<StockInfo> {
  try {
    console.log('=== GETTING VARIANT STOCK INFO FROM BREAKDOWN ===');
    console.log('Product ID:', productId);
    console.log('Color Variant ID:', colorVariantId);
    console.log('Size Variant ID:', sizeVariantId);

    // Query the breakdown table for exact match
    const { data, error } = await supabase
      .from('product_variants_breakdown')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .eq('color_variant_id', colorVariantId || null)
      .eq('size_variant_id', sizeVariantId || null)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return {
        stockSource: 'none',
        stockAmount: 0,
        isValid: false,
        errorMessage: 'Database error getting stock info'
      };
    }

    if (!data) {
      return {
        stockSource: 'none',
        stockAmount: 0,
        isValid: false,
        errorMessage: 'Variant combination not found'
      };
    }

    const stockSource = data.size_variant_id ? 'size_variant' : 
                       data.color_variant_id ? 'color_variant' : 'product';

    console.log('Stock info result:', {
      stockSource,
      stockAmount: data.stock_quantity,
      isValid: true
    });

    return {
      stockSource,
      stockAmount: data.stock_quantity,
      isValid: true
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

// Unified function to update stock in the breakdown table
export async function updateVariantStockAtomic(
  productId: string,
  colorVariantId: string | null,
  sizeVariantId: string | null,
  stockChange: number
): Promise<StockUpdateResult> {
  try {
    console.log('=== UPDATING VARIANT STOCK IN BREAKDOWN TABLE ===');
    console.log('Product ID:', productId);
    console.log('Color Variant ID:', colorVariantId);
    console.log('Size Variant ID:', sizeVariantId);
    console.log('Stock Change:', stockChange);

    // First get the current stock from breakdown table
    const { data: currentData, error: fetchError } = await supabase
      .from('product_variants_breakdown')
      .select('stock_quantity')
      .eq('product_id', productId)
      .eq('color_variant_id', colorVariantId || null)
      .eq('size_variant_id', sizeVariantId || null)
      .eq('is_active', true)
      .single();

    if (fetchError || !currentData) {
      return {
        success: false,
        newStock: 0,
        errorMessage: 'Variant not found in breakdown table'
      };
    }

    const newStock = Math.max(0, currentData.stock_quantity + stockChange);

    // Update the breakdown table
    const { error: updateError } = await supabase
      .from('product_variants_breakdown')
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .eq('color_variant_id', colorVariantId || null)
      .eq('size_variant_id', sizeVariantId || null);

    if (updateError) {
      console.error('Update error:', updateError);
      return {
        success: false,
        newStock: currentData.stock_quantity,
        errorMessage: 'Failed to update breakdown table'
      };
    }

    console.log('Stock update result:', { success: true, newStock });

    return {
      success: true,
      newStock,
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

// Unified function to validate cart stock using breakdown table
export async function validateCartStock(cartItems: any[]): Promise<CartValidationResult> {
  try {
    console.log('=== VALIDATING CART STOCK FROM BREAKDOWN ===');
    console.log('Cart items count:', cartItems.length);

    if (cartItems.length === 0) {
      return {
        isValid: true,
        invalidItems: [],
        errorMessages: []
      };
    }

    const invalidItems: any[] = [];
    const errorMessages: string[] = [];

    for (const item of cartItems) {
      const stockInfo = await getVariantStockInfo(
        item.productId,
        item.colorVariantId,
        item.sizeVariantId
      );

      if (!stockInfo.isValid || stockInfo.stockAmount < item.quantity) {
        invalidItems.push(item);
        errorMessages.push(
          `${item.productName}: ${stockInfo.isValid ? 
            `Only ${stockInfo.stockAmount} available, requested ${item.quantity}` : 
            'Variant not available'}`
        );
      }
    }

    return {
      isValid: invalidItems.length === 0,
      invalidItems,
      errorMessages
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

// Helper function to get detailed product variant information from breakdown table
export async function getProductVariantDetails(productId: string) {
  try {
    const { data, error } = await supabase
      .from('product_variants_breakdown')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

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

// Helper function to calculate total product stock from breakdown table
export async function calculateTotalProductStock(productId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_product_stock_from_breakdown', {
      p_product_id: productId
    });

    if (error) {
      console.error('Error calculating total product stock:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error calculating total product stock:', error);
    return 0;
  }
}

// Batch stock operations for order processing using breakdown table
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

// Helper function to get stock breakdown by variant from the breakdown table
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

    // Calculate total stock
    breakdown.totalStock = variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);

    // Group by color variants
    const colorMap = new Map();

    for (const variant of variants) {
      if (variant.color_variant_id) {
        if (!colorMap.has(variant.color_variant_id)) {
          colorMap.set(variant.color_variant_id, {
            colorName: variant.color_name,
            colorStock: 0,
            sizeVariants: []
          });
        }
        
        const colorVariant = colorMap.get(variant.color_variant_id);
        colorVariant.colorStock += variant.stock_quantity;
        
        if (variant.size_variant_id) {
          colorVariant.sizeVariants.push({
            sizeName: variant.size_name,
            sizeStock: variant.stock_quantity
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
