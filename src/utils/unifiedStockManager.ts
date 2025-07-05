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

// Unified function to get stock information using the product_inventory table
export async function getVariantStockInfo(
  productId: string,
  productInventoryId?: string | null
): Promise<StockInfo> {
  try {
    console.log('=== GETTING VARIANT STOCK INFO ===');
    console.log('Product ID:', productId);
    console.log('Product Inventory ID:', productInventoryId);

    // Get product details first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, name, status')
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

    // If no inventory ID provided, get the base product inventory (no variants)
    if (!productInventoryId) {
      const { data: baseInventory, error: baseInventoryError } = await supabase
        .from('product_inventory')
        .select('stock_quantity, available_stock, is_active')
        .eq('product_id', productId)
        .is('color_variant_id', null)
        .is('size_variant_id', null)
        .eq('is_active', true)
        .single();

      if (baseInventoryError || !baseInventory) {
        return {
          stockSource: 'none',
          stockAmount: 0,
          isValid: false,
          errorMessage: 'Product inventory not found'
        };
      }

      return {
        stockSource: 'product_inventory',
        stockAmount: baseInventory.available_stock || baseInventory.stock_quantity || 0,
        isValid: true
      };
    }

    // Get specific inventory item
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('product_inventory')
      .select('stock_quantity, available_stock, is_active, color_name, size_name')
      .eq('id', productInventoryId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (inventoryError || !inventoryItem) {
      return {
        stockSource: 'none',
        stockAmount: 0,
        isValid: false,
        errorMessage: 'Inventory item not found'
      };
    }

    return {
      stockSource: 'product_inventory',
      stockAmount: inventoryItem.available_stock || inventoryItem.stock_quantity || 0,
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

// Unified function to update stock using the product_inventory table
export async function updateVariantStockAtomic(
  productId: string,
  productInventoryId: string | null,
  stockChange: number
): Promise<StockUpdateResult> {
  try {
    console.log('=== UPDATING VARIANT STOCK ===');
    console.log('Product ID:', productId);
    console.log('Product Inventory ID:', productInventoryId);
    console.log('Stock Change:', stockChange);

    // If no inventory ID provided, update the base product inventory
    if (!productInventoryId) {
      const { data: current, error: fetchError } = await supabase
        .from('product_inventory')
        .select('stock_quantity, available_stock')
        .eq('product_id', productId)
        .is('color_variant_id', null)
        .is('size_variant_id', null)
        .eq('is_active', true)
        .single();

      if (fetchError || !current) {
        return {
          success: false,
          newStock: 0,
          errorMessage: 'Base product inventory not found'
        };
      }

      const newStock = Math.max(0, current.stock_quantity + stockChange);
      const newAvailableStock = Math.max(0, current.available_stock + stockChange);

      const { error: updateError } = await supabase
        .from('product_inventory')
        .update({
          stock_quantity: newStock,
          available_stock: newAvailableStock
        })
        .eq('product_id', productId)
        .is('color_variant_id', null)
        .is('size_variant_id', null);

      if (updateError) {
        return {
          success: false,
          newStock: current.stock_quantity,
          errorMessage: 'Failed to update base product inventory stock'
        };
      }

      return {
        success: true,
        newStock: newAvailableStock
      };
    }

    // Update specific inventory item
    const { data: current, error: fetchError } = await supabase
      .from('product_inventory')
      .select('stock_quantity, available_stock')
      .eq('id', productInventoryId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (fetchError || !current) {
      return {
        success: false,
        newStock: 0,
        errorMessage: 'Inventory item not found'
      };
    }

    const newStock = Math.max(0, current.stock_quantity + stockChange);
    const newAvailableStock = Math.max(0, current.available_stock + stockChange);

    const { error: updateError } = await supabase
      .from('product_inventory')
      .update({
        stock_quantity: newStock,
        available_stock: newAvailableStock
      })
      .eq('id', productInventoryId);

    if (updateError) {
      return {
        success: false,
        newStock: current.stock_quantity,
        errorMessage: 'Failed to update inventory stock'
      };
    }

    return {
      success: true,
      newStock: newAvailableStock
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

// Function to validate cart stock using the new inventory system
export async function validateCartStock(cartItems: any[]): Promise<CartValidationResult> {
  const invalidItems: any[] = [];
  const errorMessages: string[] = [];

  for (const item of cartItems) {
    try {
      const stockInfo = await getVariantStockInfo(item.productId, item.productInventoryId);

      if (!stockInfo.isValid) {
        invalidItems.push(item);
        errorMessages.push(`Item "${item.productName}": ${stockInfo.errorMessage}`);
        continue;
      }

      if (stockInfo.stockAmount < item.quantity) {
        invalidItems.push(item);
        errorMessages.push(`Item "${item.productName}": Only ${stockInfo.stockAmount} available, requested ${item.quantity}`);
      }
    } catch (error) {
      console.error('Error validating cart item stock:', error);
      invalidItems.push(item);
      errorMessages.push(`Item "${item.productName}": Error checking stock availability`);
    }
  }

  return {
    isValid: invalidItems.length === 0,
    invalidItems,
    errorMessages
  };
}

// Function to calculate total product stock using the new inventory system
export async function calculateTotalProductStock(productId: string): Promise<number> {
  try {
    const { data: inventoryItems, error } = await supabase
      .from('product_inventory')
      .select('available_stock')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) {
      console.error('Error calculating total product stock:', error);
      return 0;
    }

    const totalStock = inventoryItems?.reduce((sum, item) => sum + (item.available_stock || 0), 0) || 0;
    return totalStock;
  } catch (error) {
    console.error('Error calculating total product stock:', error);
    return 0;
  }
}

// Function to process order stock changes using the new inventory system
export async function processOrderStockChanges(
  orderItems: Array<{
    productId: string;
    productInventoryId?: string | null;
    quantity: number;
  }>,
  operation: 'reduce' | 'restore'
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const stockChange = operation === 'reduce' ? -1 : 1;

  for (const item of orderItems) {
    try {
      const result = await updateVariantStockAtomic(
        item.productId,
        item.productInventoryId,
        stockChange * item.quantity
      );

      if (!result.success) {
        errors.push(`Failed to ${operation} stock for product ${item.productId}: ${result.errorMessage}`);
      }
    } catch (error) {
      console.error(`Error ${operation}ing stock for item:`, error);
      errors.push(`Error ${operation}ing stock for product ${item.productId}`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

// Function to get stock breakdown using the new inventory system
export async function getStockBreakdown(productId: string) {
  try {
    const { data: inventoryItems, error } = await supabase
      .from('product_inventory')
      .select(`
        id,
        color_name,
        size_name,
        stock_quantity,
        available_stock,
        reserved_stock,
        is_active,
        color_variant_id,
        size_variant_id
      `)
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('color_name')
      .order('size_name');

    if (error) {
      console.error('Error getting stock breakdown:', error);
      return [];
    }

    return inventoryItems || [];
  } catch (error) {
    console.error('Error getting stock breakdown:', error);
    return [];
  }
}

// Function to get product variant details using the new inventory system
export async function getProductVariantDetails(productId: string) {
  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return { hasVariants: false, variants: [] };
    }

    if (!product.has_color_variants) {
      return { hasVariants: false, variants: [] };
    }

    // Get color variants with their inventory
    const { data: colorVariants, error: colorError } = await supabase
      .from('color_variants')
      .select(`
        id,
        color_name,
        has_sizes,
        image_url,
        size_variants (
          id,
          size_name,
          size_code
        )
      `)
      .eq('product_id', productId)
      .order('color_name');

    if (colorError) {
      console.error('Error getting color variants:', colorError);
      return { hasVariants: false, variants: [] };
    }

    // Get inventory for each variant
    const variantsWithInventory = await Promise.all(
      (colorVariants || []).map(async (colorVariant) => {
        if (colorVariant.has_sizes && colorVariant.size_variants) {
          // Get inventory for each size variant
          const sizeVariantsWithInventory = await Promise.all(
            colorVariant.size_variants.map(async (sizeVariant) => {
              const { data: inventory } = await supabase
                .from('product_inventory')
                .select('id, stock_quantity, available_stock')
                .eq('product_id', productId)
                .eq('color_variant_id', colorVariant.id)
                .eq('size_variant_id', sizeVariant.id)
                .eq('is_active', true)
                .single();

              return {
                ...sizeVariant,
                inventory: inventory || null
              };
            })
          );

          return {
            ...colorVariant,
            size_variants: sizeVariantsWithInventory
          };
        } else {
          // Get inventory for color variant without sizes
          const { data: inventory } = await supabase
            .from('product_inventory')
            .select('id, stock_quantity, available_stock')
            .eq('product_id', productId)
            .eq('color_variant_id', colorVariant.id)
            .is('size_variant_id', null)
            .eq('is_active', true)
            .single();

          return {
            ...colorVariant,
            inventory: inventory || null
          };
        }
      })
    );

    return {
      hasVariants: true,
      variants: variantsWithInventory
    };
  } catch (error) {
    console.error('Error getting product variant details:', error);
    return { hasVariants: false, variants: [] };
  }
}
