
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

// Unified function to get stock information using the breakdown table (fallback to manual calculation)
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

    // Get product details first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, stock_quantity, name, status')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productId, productError);
      return {
        stockSource: 'none',
        stockAmount: 0,
        isValid: false,
        errorMessage: 'Product not found'
      };
    }

    if (product.status !== 'active') {
      return {
        stockSource: 'none',
        stockAmount: 0,
        isValid: false,
        errorMessage: 'Product is inactive'
      };
    }

    // If no variants requested and product has no variants
    if (!colorVariantId && !sizeVariantId && !product.has_color_variants) {
      return {
        stockSource: 'product',
        stockAmount: product.stock_quantity || 0,
        isValid: true
      };
    }

    // If color variant requested
    if (colorVariantId && !sizeVariantId) {
      const { data: colorVariant, error: colorError } = await supabase
        .from('color_variants')
        .select('stock_quantity, has_sizes')
        .eq('id', colorVariantId)
        .eq('product_id', productId)
        .single();

      if (colorError || !colorVariant) {
        return {
          stockSource: 'none',
          stockAmount: 0,
          isValid: false,
          errorMessage: 'Color variant not found'
        };
      }

      if (!colorVariant.has_sizes) {
        return {
          stockSource: 'color_variant',
          stockAmount: colorVariant.stock_quantity || 0,
          isValid: true
        };
      }
    }

    // If size variant requested
    if (sizeVariantId) {
      const { data: sizeVariant, error: sizeError } = await supabase
        .from('size_variants')
        .select('stock_quantity')
        .eq('id', sizeVariantId)
        .single();

      if (sizeError || !sizeVariant) {
        return {
          stockSource: 'none',
          stockAmount: 0,
          isValid: false,
          errorMessage: 'Size variant not found'
        };
      }

      return {
        stockSource: 'size_variant',
        stockAmount: sizeVariant.stock_quantity || 0,
        isValid: true
      };
    }

    return {
      stockSource: 'none',
      stockAmount: 0,
      isValid: false,
      errorMessage: 'Invalid variant combination'
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

// Unified function to update stock (fallback to manual updates)
export async function updateVariantStockAtomic(
  productId: string,
  colorVariantId: string | null,
  sizeVariantId: string | null,
  stockChange: number
): Promise<StockUpdateResult> {
  try {
    console.log('=== UPDATING VARIANT STOCK ===');
    console.log('Product ID:', productId);
    console.log('Color Variant ID:', colorVariantId);
    console.log('Size Variant ID:', sizeVariantId);
    console.log('Stock Change:', stockChange);

    // Determine which table to update based on variant IDs
    if (sizeVariantId) {
      // Update size variant
      const { data: current, error: fetchError } = await supabase
        .from('size_variants')
        .select('stock_quantity')
        .eq('id', sizeVariantId)
        .single();

      if (fetchError || !current) {
        return {
          success: false,
          newStock: 0,
          errorMessage: 'Size variant not found'
        };
      }

      const newStock = Math.max(0, current.stock_quantity + stockChange);

      const { error: updateError } = await supabase
        .from('size_variants')
        .update({ stock_quantity: newStock })
        .eq('id', sizeVariantId);

      if (updateError) {
        return {
          success: false,
          newStock: current.stock_quantity,
          errorMessage: 'Failed to update size variant stock'
        };
      }

      return {
        success: true,
        newStock
      };
    } else if (colorVariantId) {
      // Update color variant
      const { data: current, error: fetchError } = await supabase
        .from('color_variants')
        .select('stock_quantity')
        .eq('id', colorVariantId)
        .single();

      if (fetchError || !current) {
        return {
          success: false,
          newStock: 0,
          errorMessage: 'Color variant not found'
        };
      }

      const newStock = Math.max(0, current.stock_quantity + stockChange);

      const { error: updateError } = await supabase
        .from('color_variants')
        .update({ stock_quantity: newStock })
        .eq('id', colorVariantId);

      if (updateError) {
        return {
          success: false,
          newStock: current.stock_quantity,
          errorMessage: 'Failed to update color variant stock'
        };
      }

      return {
        success: true,
        newStock
      };
    } else {
      // Update product stock
      const { data: current, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (fetchError || !current) {
        return {
          success: false,
          newStock: 0,
          errorMessage: 'Product not found'
        };
      }

      const newStock = Math.max(0, (current.stock_quantity || 0) + stockChange);

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (updateError) {
        return {
          success: false,
          newStock: current.stock_quantity || 0,
          errorMessage: 'Failed to update product stock'
        };
      }

      return {
        success: true,
        newStock
      };
    }
  } catch (error) {
    console.error('Error updating variant stock:', error);
    return {
      success: false,
      newStock: 0,
      errorMessage: 'Error updating stock'
    };
  }
}

// Unified function to validate cart stock
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

// Helper function to calculate total product stock
export async function calculateTotalProductStock(productId: string): Promise<number> {
  try {
    // Use manual calculation since RPC function doesn't exist
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, stock_quantity')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return 0;
    }

    if (!product.has_color_variants) {
      return product.stock_quantity || 0;
    }

    // Calculate from variants
    const { data: colorVariants, error: colorError } = await supabase
      .from('color_variants')
      .select('id, stock_quantity, has_sizes')
      .eq('product_id', productId);

    if (colorError || !colorVariants) {
      return 0;
    }

    let totalStock = 0;

    for (const colorVariant of colorVariants) {
      if (!colorVariant.has_sizes) {
        totalStock += colorVariant.stock_quantity || 0;
      } else {
        const { data: sizeVariants, error: sizeError } = await supabase
          .from('size_variants')
          .select('stock_quantity')
          .eq('color_variant_id', colorVariant.id);

        if (!sizeError && sizeVariants) {
          totalStock += sizeVariants.reduce((sum, size) => sum + (size.stock_quantity || 0), 0);
        }
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

// Helper function to get stock breakdown by variant
export async function getStockBreakdown(productId: string) {
  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, stock_quantity')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return {
        totalStock: 0,
        colorVariants: []
      };
    }

    if (!product.has_color_variants) {
      return {
        totalStock: product.stock_quantity || 0,
        colorVariants: []
      };
    }

    const { data: colorVariants, error: colorError } = await supabase
      .from('color_variants')
      .select('id, color_name, stock_quantity, has_sizes')
      .eq('product_id', productId);

    if (colorError || !colorVariants) {
      return {
        totalStock: 0,
        colorVariants: []
      };
    }

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

    for (const colorVariant of colorVariants) {
      const colorData = {
        colorName: colorVariant.color_name,
        colorStock: 0,
        sizeVariants: [] as Array<{
          sizeName: string;
          sizeStock: number;
        }>
      };

      if (!colorVariant.has_sizes) {
        colorData.colorStock = colorVariant.stock_quantity || 0;
        breakdown.totalStock += colorData.colorStock;
      } else {
        const { data: sizeVariants, error: sizeError } = await supabase
          .from('size_variants')
          .select('size_name, stock_quantity')
          .eq('color_variant_id', colorVariant.id);

        if (!sizeError && sizeVariants) {
          for (const sizeVariant of sizeVariants) {
            const sizeStock = sizeVariant.stock_quantity || 0;
            colorData.sizeVariants.push({
              sizeName: sizeVariant.size_name,
              sizeStock
            });
            colorData.colorStock += sizeStock;
            breakdown.totalStock += sizeStock;
          }
        }
      }

      breakdown.colorVariants.push(colorData);
    }

    return breakdown;
  } catch (error) {
    console.error('Error getting stock breakdown:', error);
    return {
      totalStock: 0,
      colorVariants: []
    };
  }
}

// Helper function to get detailed product variant information
export async function getProductVariantDetails(productId: string) {
  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, stock_quantity, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return [];
    }

    const variants = [];

    if (!product.has_color_variants) {
      variants.push({
        product_id: productId,
        product_name: product.name,
        color_variant_id: null,
        color_name: null,
        size_variant_id: null,
        size_name: null,
        size_code: null,
        stock_quantity: product.stock_quantity || 0,
        variant_sku: `${product.name.toUpperCase().replace(/\s+/g, '_')}_DEFAULT`,
        is_active: true
      });
    } else {
      const { data: colorVariants, error: colorError } = await supabase
        .from('color_variants')
        .select('id, color_name, stock_quantity, has_sizes')
        .eq('product_id', productId);

      if (!colorError && colorVariants) {
        for (const colorVariant of colorVariants) {
          if (!colorVariant.has_sizes) {
            variants.push({
              product_id: productId,
              product_name: product.name,
              color_variant_id: colorVariant.id,
              color_name: colorVariant.color_name,
              size_variant_id: null,
              size_name: null,
              size_code: null,
              stock_quantity: colorVariant.stock_quantity || 0,
              variant_sku: `${product.name.toUpperCase().replace(/\s+/g, '_')}_${colorVariant.color_name.toUpperCase().replace(/\s+/g, '_')}`,
              is_active: true
            });
          } else {
            const { data: sizeVariants, error: sizeError } = await supabase
              .from('size_variants')
              .select('id, size_name, size_code, stock_quantity')
              .eq('color_variant_id', colorVariant.id);

            if (!sizeError && sizeVariants) {
              for (const sizeVariant of sizeVariants) {
                variants.push({
                  product_id: productId,
                  product_name: product.name,
                  color_variant_id: colorVariant.id,
                  color_name: colorVariant.color_name,
                  size_variant_id: sizeVariant.id,
                  size_name: sizeVariant.size_name,
                  size_code: sizeVariant.size_code,
                  stock_quantity: sizeVariant.stock_quantity || 0,
                  variant_sku: `${product.name.toUpperCase().replace(/\s+/g, '_')}_${colorVariant.color_name.toUpperCase().replace(/\s+/g, '_')}_${sizeVariant.size_name.toUpperCase().replace(/\s+/g, '_')}`,
                  is_active: true
                });
              }
            }
          }
        }
      }
    }

    return variants;
  } catch (error) {
    console.error('Error in getProductVariantDetails:', error);
    return [];
  }
}
