
import { supabase } from '@/integrations/supabase/client';
import { validateVariantStock } from './stockCalculation';

interface StockUpdateItem {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  quantity: number;
}

interface StockValidationResult {
  isValid: boolean;
  errors: string[];
}

export async function validateStockAvailability(items: StockUpdateItem[]): Promise<StockValidationResult> {
  const errors: string[] = [];
  
  console.log('=== VALIDATING STOCK FOR MULTIPLE ITEMS ===');
  
  for (const item of items) {
    console.log(`Validating item: ${item.productId}, qty: ${item.quantity}`);
    
    const result = await validateVariantStock(
      item.productId,
      item.colorVariantId,
      item.sizeVariantId,
      item.quantity
    );

    if (!result.isValid) {
      const errorMsg = result.errorMessage || `Insufficient stock for product ${item.productId}`;
      console.log(`Stock validation failed: ${errorMsg}`);
      errors.push(errorMsg);
    } else {
      console.log(`Stock validation passed: ${result.availableStock} available`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function updateProductStock(items: StockUpdateItem[], operation: 'reduce' | 'restore'): Promise<void> {
  console.log(`=== STOCK UPDATE OPERATION: ${operation.toUpperCase()} ===`);
  
  // Validate stock availability before reducing
  if (operation === 'reduce') {
    const validation = await validateStockAvailability(items);
    if (!validation.isValid) {
      throw new Error(`Stock validation failed: ${validation.errors.join(', ')}`);
    }
  }

  const multiplier = operation === 'reduce' ? -1 : 1;

  for (const item of items) {
    const stockChange = item.quantity * multiplier;
    console.log(`Processing ${operation} for product ${item.productId}: ${stockChange} units`);

    // Get product info to determine where to update stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, has_color_variants, has_size_variants')
      .eq('id', item.productId)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    // Follow the same hierarchy as stock validation
    
    // CASE 1: No color variants → update product stock
    if (!product.has_color_variants) {
      console.log(`Updating product stock for ${product.name}: ${stockChange}`);
      
      const { error } = await supabase.rpc('update_product_stock', {
        product_id: item.productId,
        stock_change: stockChange
      });

      if (error) {
        throw new Error(`Failed to update product stock: ${error.message}`);
      }
    }
    // CASE 2: Has color variants → need to determine size vs color level
    else {
      if (!item.colorVariantId) {
        throw new Error(`Color variant ID required for product ${item.productId}`);
      }

      // Check if this color has size variants
      const { data: colorVariant, error: colorError } = await supabase
        .from('color_variants')
        .select(`
          color_name,
          size_variants(id)
        `)
        .eq('id', item.colorVariantId)
        .single();

      if (colorError || !colorVariant) {
        throw new Error(`Color variant not found: ${item.colorVariantId}`);
      }

      const hasSizeVariants = colorVariant.size_variants && colorVariant.size_variants.length > 0;

      // CASE 2A: Color has size variants → update size variant stock
      if (hasSizeVariants) {
        if (!item.sizeVariantId) {
          throw new Error(`Size variant ID required for product ${item.productId}`);
        }

        console.log(`Updating size variant stock: ${stockChange}`);
        
        const { error } = await supabase.rpc('update_size_variant_stock', {
          variant_id: item.sizeVariantId,
          stock_change: stockChange
        });

        if (error) {
          throw new Error(`Failed to update size variant stock: ${error.message}`);
        }
      }
      // CASE 2B: Color has no size variants → update color variant stock
      else {
        console.log(`Updating color variant stock for ${colorVariant.color_name}: ${stockChange}`);
        
        const { error } = await supabase.rpc('update_color_variant_stock', {
          variant_id: item.colorVariantId,
          stock_change: stockChange
        });

        if (error) {
          throw new Error(`Failed to update color variant stock: ${error.message}`);
        }
      }
    }

    console.log(`Successfully ${operation}d stock for product ${item.productId}`);
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
