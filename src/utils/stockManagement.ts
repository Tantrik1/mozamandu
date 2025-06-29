
import { supabase } from '@/integrations/supabase/client';

interface StockUpdateItem {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  quantity: number;
}

interface StockValidationResult {
  isValid: boolean;
  errors: string[];
  availableStock?: number;
}

export async function validateStockAvailability(items: StockUpdateItem[]): Promise<StockValidationResult> {
  const errors: string[] = [];
  
  for (const item of items) {
    try {
      let availableStock = 0;
      let stockSource = '';

      // Check size variant stock first
      if (item.sizeVariantId) {
        const { data: sizeVariant, error } = await supabase
          .from('size_variants')
          .select('stock_quantity, color_variants(color_name)')
          .eq('id', item.sizeVariantId)
          .single();

        if (error || !sizeVariant) {
          errors.push(`Size variant not found for product ${item.productId}`);
          continue;
        }

        availableStock = sizeVariant.stock_quantity;
        stockSource = `size variant`;
      }
      // Check color variant stock
      else if (item.colorVariantId) {
        const { data: colorVariant, error } = await supabase
          .from('color_variants')
          .select('stock_quantity, color_name')
          .eq('id', item.colorVariantId)
          .single();

        if (error || !colorVariant) {
          errors.push(`Color variant not found for product ${item.productId}`);
          continue;
        }

        availableStock = colorVariant.stock_quantity;
        stockSource = `color variant`;
      }
      // Check product stock
      else {
        const { data: product, error } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.productId)
          .single();

        if (error || !product) {
          errors.push(`Product not found: ${item.productId}`);
          continue;
        }

        availableStock = product.stock_quantity || 0;
        stockSource = `product`;
      }

      if (availableStock < item.quantity) {
        errors.push(`Insufficient stock for ${stockSource}. Available: ${availableStock}, Requested: ${item.quantity}`);
      }

      console.log(`Stock validation for ${item.productId}: Available ${availableStock}, Requested ${item.quantity}`);
    } catch (error) {
      console.error('Error validating stock:', error);
      errors.push(`Failed to validate stock for product ${item.productId}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function updateProductStock(items: StockUpdateItem[], operation: 'reduce' | 'restore'): Promise<void> {
  // Validate stock availability before reducing
  if (operation === 'reduce') {
    const validation = await validateStockAvailability(items);
    if (!validation.isValid) {
      throw new Error(`Stock validation failed: ${validation.errors.join(', ')}`);
    }
  }

  const completedUpdates: Array<{
    type: 'product' | 'color' | 'size';
    id: string;
    change: number;
  }> = [];

  try {
    for (const item of items) {
      console.log(`${operation === 'reduce' ? 'Reducing' : 'Restoring'} stock for product:`, item.productId);
      
      // Determine the multiplier based on operation
      const multiplier = operation === 'reduce' ? -1 : 1;
      const stockChange = item.quantity * multiplier;

      // If size variant exists, update size variant stock
      if (item.sizeVariantId) {
        const { error: sizeError } = await supabase.rpc('update_size_variant_stock', {
          variant_id: item.sizeVariantId,
          stock_change: stockChange
        });

        if (sizeError) {
          console.error('Error updating size variant stock:', sizeError);
          throw new Error(`Failed to update size variant stock: ${sizeError.message}`);
        }

        completedUpdates.push({
          type: 'size',
          id: item.sizeVariantId,
          change: stockChange
        });
      }
      // If color variant exists (but no size variant), update color variant stock
      else if (item.colorVariantId) {
        const { error: colorError } = await supabase.rpc('update_color_variant_stock', {
          variant_id: item.colorVariantId,
          stock_change: stockChange
        });

        if (colorError) {
          console.error('Error updating color variant stock:', colorError);
          throw new Error(`Failed to update color variant stock: ${colorError.message}`);
        }

        completedUpdates.push({
          type: 'color',
          id: item.colorVariantId,
          change: stockChange
        });
      }
      // If no variants, update product stock directly
      else {
        const { error: productError } = await supabase.rpc('update_product_stock', {
          product_id: item.productId,
          stock_change: stockChange
        });

        if (productError) {
          console.error('Error updating product stock:', productError);
          throw new Error(`Failed to update product stock: ${productError.message}`);
        }

        completedUpdates.push({
          type: 'product',
          id: item.productId,
          change: stockChange
        });
      }

      console.log(`Successfully ${operation === 'reduce' ? 'reduced' : 'restored'} stock for product ${item.productId}`);
    }
  } catch (error) {
    console.error(`Error ${operation === 'reduce' ? 'reducing' : 'restoring'} stock:`, error);
    
    // Rollback completed updates if there was an error
    if (completedUpdates.length > 0) {
      console.log('Rolling back completed stock updates...');
      try {
        for (const update of completedUpdates) {
          const rollbackChange = -update.change; // Reverse the change
          
          if (update.type === 'size') {
            await supabase.rpc('update_size_variant_stock', {
              variant_id: update.id,
              stock_change: rollbackChange
            });
          } else if (update.type === 'color') {
            await supabase.rpc('update_color_variant_stock', {
              variant_id: update.id,
              stock_change: rollbackChange
            });
          } else if (update.type === 'product') {
            await supabase.rpc('update_product_stock', {
              product_id: update.id,
              stock_change: rollbackChange
            });
          }
        }
        console.log('Rollback completed successfully');
      } catch (rollbackError) {
        console.error('Failed to rollback stock updates:', rollbackError);
      }
    }
    
    throw error;
  }
}

export async function getProductStockInfo(productId: string, colorVariantId?: string | null, sizeVariantId?: string | null): Promise<{
  currentStock: number;
  stockLocation: string;
}> {
  try {
    if (sizeVariantId) {
      const { data, error } = await supabase
        .from('size_variants')
        .select('stock_quantity, size_name, color_variants(color_name)')
        .eq('id', sizeVariantId)
        .single();

      if (error || !data) {
        throw new Error('Size variant not found');
      }

      return {
        currentStock: data.stock_quantity,
        stockLocation: `Size: ${data.size_name}`
      };
    } else if (colorVariantId) {
      const { data, error } = await supabase
        .from('color_variants')
        .select('stock_quantity, color_name')
        .eq('id', colorVariantId)
        .single();

      if (error || !data) {
        throw new Error('Color variant not found');
      }

      return {
        currentStock: data.stock_quantity,
        stockLocation: `Color: ${data.color_name}`
      };
    } else {
      const { data, error } = await supabase
        .from('products')
        .select('stock_quantity, name')
        .eq('id', productId)
        .single();

      if (error || !data) {
        throw new Error('Product not found');
      }

      return {
        currentStock: data.stock_quantity || 0,
        stockLocation: 'Product'
      };
    }
  } catch (error) {
    console.error('Error getting stock info:', error);
    return {
      currentStock: 0,
      stockLocation: 'Unknown'
    };
  }
}

export async function reduceStockForOrder(cartItems: any[]): Promise<void> {
  const stockItems: StockUpdateItem[] = cartItems.map(item => ({
    productId: item.productId,
    colorVariantId: item.colorVariantId,
    sizeVariantId: item.sizeVariantId,
    quantity: item.quantity
  }));

  console.log('Reducing stock for order items:', stockItems.length);
  await updateProductStock(stockItems, 'reduce');
  console.log('Stock reduction completed successfully');
}

export async function restoreStockForOrder(orderItems: StockUpdateItem[]): Promise<void> {
  console.log('Restoring stock for order items:', orderItems.length);
  await updateProductStock(orderItems, 'restore');
  console.log('Stock restoration completed successfully');
}

// Helper function to batch stock operations for better performance
export async function batchStockOperation(
  operations: Array<{
    items: StockUpdateItem[];
    operation: 'reduce' | 'restore';
  }>
): Promise<void> {
  for (const op of operations) {
    await updateProductStock(op.items, op.operation);
  }
}
