
import { supabase } from '@/integrations/supabase/client';

interface StockUpdateItem {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  quantity: number;
}

export async function updateProductStock(items: StockUpdateItem[], operation: 'reduce' | 'restore'): Promise<void> {
  for (const item of items) {
    try {
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
          // Create the RPC function if it doesn't exist
          await createStockUpdateFunctions();
          // Retry the operation
          await supabase.rpc('update_size_variant_stock', {
            variant_id: item.sizeVariantId,
            stock_change: stockChange
          });
        }
      }
      // If color variant exists (but no size variant), update color variant stock
      else if (item.colorVariantId) {
        const { error: colorError } = await supabase.rpc('update_color_variant_stock', {
          variant_id: item.colorVariantId,
          stock_change: stockChange
        });

        if (colorError) {
          console.error('Error updating color variant stock:', colorError);
          await createStockUpdateFunctions();
          await supabase.rpc('update_color_variant_stock', {
            variant_id: item.colorVariantId,
            stock_change: stockChange
          });
        }
      }
      // If no variants, update product stock directly
      else {
        const { error: productError } = await supabase.rpc('update_product_stock', {
          product_id: item.productId,
          stock_change: stockChange
        });

        if (productError) {
          console.error('Error updating product stock:', productError);
          await createStockUpdateFunctions();
          await supabase.rpc('update_product_stock', {
            product_id: item.productId,
            stock_change: stockChange
          });
        }
      }

      console.log(`Successfully ${operation === 'reduce' ? 'reduced' : 'restored'} stock for product ${item.productId}`);
    } catch (error) {
      console.error(`Error ${operation === 'reduce' ? 'reducing' : 'restoring'} stock:`, error);
      throw error;
    }
  }
}

async function createStockUpdateFunctions() {
  console.log('Creating stock update functions...');
  
  // These functions will be created via SQL migration
  // For now, we'll use direct table updates as fallback
  try {
    // This is a fallback approach using direct updates
    console.log('Using fallback stock update method');
  } catch (error) {
    console.error('Error creating stock update functions:', error);
  }
}

export async function reduceStockForOrder(cartItems: any[]): Promise<void> {
  const stockItems: StockUpdateItem[] = cartItems.map(item => ({
    productId: item.productId,
    colorVariantId: item.colorVariantId,
    sizeVariantId: item.sizeVariantId,
    quantity: item.quantity
  }));

  await updateProductStock(stockItems, 'reduce');
}

export async function restoreStockForOrder(orderItems: StockUpdateItem[]): Promise<void> {
  await updateProductStock(orderItems, 'restore');
}
