
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
      let productName = '';

      // Get product info first
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, has_color_variants, has_size_variants, stock_quantity, status')
        .eq('id', item.productId)
        .single();

      if (productError || !product) {
        errors.push(`Product not found: ${item.productId}`);
        continue;
      }

      if (product.status !== 'active') {
        errors.push(`Product ${product.name} is no longer active`);
        continue;
      }

      productName = product.name;

      // Follow the correct stock hierarchy
      
      // Hierarchy 1: No color variants - use product stock
      if (!product.has_color_variants) {
        availableStock = product.stock_quantity || 0;
        stockSource = 'product';
      }
      // Hierarchy 2: Has color variants
      else if (item.colorVariantId) {
        const { data: colorVariant, error: colorError } = await supabase
          .from('color_variants')
          .select(`
            color_name, 
            stock_quantity,
            size_variants(id, size_name, stock_quantity)
          `)
          .eq('id', item.colorVariantId)
          .single();

        if (colorError || !colorVariant) {
          errors.push(`Color variant not found for product ${productName}`);
          continue;
        }

        const sizeVariants = colorVariant.size_variants || [];

        // Hierarchy 2a: Color has size variants and size is specified
        if (sizeVariants.length > 0 && item.sizeVariantId) {
          const selectedSize = sizeVariants.find(size => size.id === item.sizeVariantId);
          
          if (!selectedSize) {
            errors.push(`Size variant not found for product ${productName}`);
            continue;
          }

          availableStock = selectedSize.stock_quantity || 0;
          stockSource = `size variant (${selectedSize.size_name})`;
        }
        // Hierarchy 2b: Color has no size variants - use color stock
        else if (sizeVariants.length === 0) {
          availableStock = colorVariant.stock_quantity || 0;
          stockSource = `color variant (${colorVariant.color_name})`;
        }
        // Invalid: Color has sizes but no size specified
        else {
          errors.push(`Size selection required for product ${productName}`);
          continue;
        }
      }
      // Invalid: Product has colors but no color specified
      else {
        errors.push(`Color selection required for product ${productName}`);
        continue;
      }

      if (availableStock < item.quantity) {
        errors.push(`Insufficient stock for ${productName} (${stockSource}). Available: ${availableStock}, Requested: ${item.quantity}`);
      }

      console.log(`Stock validation for ${productName}: Available ${availableStock} from ${stockSource}, Requested ${item.quantity}`);
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

      // Get product info to determine correct stock location
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('has_color_variants, has_size_variants')
        .eq('id', item.productId)
        .single();

      if (productError || !product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      let stockUpdated = false;

      // Follow the correct hierarchy for stock updates
      
      // Hierarchy 1: No color variants - update product stock
      if (!product.has_color_variants) {
        const { error: productError } = await supabase.rpc('update_product_stock', {
          product_id: item.productId,
          stock_change: stockChange
        });

        if (productError) {
          throw new Error(`Failed to update product stock: ${productError.message}`);
        }

        completedUpdates.push({
          type: 'product',
          id: item.productId,
          change: stockChange
        });
        stockUpdated = true;
      }
      // Hierarchy 2: Has color variants
      else if (item.colorVariantId) {
        // Check if this color has size variants
        const { data: colorVariant, error: colorError } = await supabase
          .from('color_variants')
          .select(`
            id,
            size_variants(id)
          `)
          .eq('id', item.colorVariantId)
          .single();

        if (colorError || !colorVariant) {
          throw new Error(`Color variant not found: ${item.colorVariantId}`);
        }

        const sizeVariants = colorVariant.size_variants || [];

        // Hierarchy 2a: Color has size variants and size is specified
        if (sizeVariants.length > 0 && item.sizeVariantId) {
          const { error: sizeError } = await supabase.rpc('update_size_variant_stock', {
            variant_id: item.sizeVariantId,
            stock_change: stockChange
          });

          if (sizeError) {
            throw new Error(`Failed to update size variant stock: ${sizeError.message}`);
          }

          completedUpdates.push({
            type: 'size',
            id: item.sizeVariantId,
            change: stockChange
          });
          stockUpdated = true;
        }
        // Hierarchy 2b: Color has no size variants - update color stock
        else if (sizeVariants.length === 0) {
          const { error: colorError } = await supabase.rpc('update_color_variant_stock', {
            variant_id: item.colorVariantId,
            stock_change: stockChange
          });

          if (colorError) {
            throw new Error(`Failed to update color variant stock: ${colorError.message}`);
          }

          completedUpdates.push({
            type: 'color',
            id: item.colorVariantId,
            change: stockChange
          });
          stockUpdated = true;
        }
        // Invalid case
        else {
          throw new Error(`Invalid stock update configuration for product ${item.productId}`);
        }
      }
      // Invalid case
      else {
        throw new Error(`Invalid stock update configuration for product ${item.productId} - color variant required`);
      }

      if (!stockUpdated) {
        throw new Error(`Failed to update stock for product ${item.productId}`);
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
        // Fall back to color variant if size variant not found
        if (colorVariantId) {
          const { data: colorData, error: colorError } = await supabase
            .from('color_variants')
            .select('stock_quantity, color_name')
            .eq('id', colorVariantId)
            .single();

          if (colorError || !colorData) {
            throw new Error('Neither size nor color variant found');
          }

          return {
            currentStock: colorData.stock_quantity || 0,
            stockLocation: `Color: ${colorData.color_name} (size variant missing)`
          };
        }
        throw new Error('Size variant not found');
      }

      return {
        currentStock: data.stock_quantity || 0,
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
        currentStock: data.stock_quantity || 0,
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
