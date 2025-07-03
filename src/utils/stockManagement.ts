
import { supabase } from '@/integrations/supabase/client';
import { validateCartStock, processOrderStockChanges } from './unifiedStockManager';

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
  console.log('=== VALIDATING STOCK FOR MULTIPLE ITEMS ===');
  console.log('Items to validate:', items.length);
  
  try {
    const cartItems = items.map(item => ({
      productId: item.productId,
      colorVariantId: item.colorVariantId,
      sizeVariantId: item.sizeVariantId,
      quantity: item.quantity,
      productName: `Product ${item.productId}` // We'll get actual name if needed
    }));

    const result = await validateCartStock(cartItems);
    
    return {
      isValid: result.isValid,
      errors: result.errorMessages
    };
  } catch (error) {
    console.error('Error validating stock availability:', error);
    return {
      isValid: false,
      errors: ['Error validating stock availability']
    };
  }
}

export async function updateProductStock(items: StockUpdateItem[], operation: 'reduce' | 'restore'): Promise<void> {
  console.log(`=== STOCK UPDATE OPERATION: ${operation.toUpperCase()} ===`);
  console.log('Items to process:', items.length);
  
  const result = await processOrderStockChanges(items, operation);
  
  if (!result.success) {
    throw new Error(`Stock ${operation} failed: ${result.errors.join(', ')}`);
  }
  
  console.log(`Stock ${operation} completed successfully`);
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
