import { supabase } from '@/integrations/supabase/client';

export interface StockReservationItem {
  productId: string;
  productInventoryId: string | null;
  quantity: number;
}

export interface StockReservationResult {
  success: boolean;
  message: string;
  reservedItems?: StockReservationItem[];
  failedItems?: Array<{ item: StockReservationItem; reason: string }>;
}

/**
 * Reserve stock when an order is placed
 */
export async function reserveStockForOrder(
  orderItems: StockReservationItem[],
  orderId: string
): Promise<StockReservationResult> {
  console.log('=== RESERVING STOCK FOR ORDER ===');
  console.log('Order ID:', orderId);
  console.log('Items to reserve:', orderItems);

  const reservedItems: StockReservationItem[] = [];
  const failedItems: Array<{ item: StockReservationItem; reason: string }> = [];

  for (const item of orderItems) {
    try {
      // Find the inventory record
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', item.productId)
        .eq('id', item.productInventoryId || '')
        .single();

      if (inventoryError || !inventoryData) {
        console.error(`Inventory not found for product ${item.productId}:`, inventoryError);
        failedItems.push({
          item,
          reason: 'Inventory record not found'
        });
        continue;
      }

      // Check if we have enough available stock
      const availableStock = inventoryData.stock_quantity - inventoryData.reserved_stock;
      if (availableStock < item.quantity) {
        console.error(`Insufficient stock: available ${availableStock}, requested ${item.quantity}`);
        failedItems.push({
          item,
          reason: `Insufficient stock: only ${availableStock} available`
        });
        continue;
      }

      // Reserve the stock
      const newReservedStock = inventoryData.reserved_stock + item.quantity;
      const newAvailableStock = inventoryData.stock_quantity - newReservedStock;

      const { error: updateError } = await supabase
        .from('product_inventory')
        .update({
          reserved_stock: newReservedStock,
          available_stock: newAvailableStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryData.id);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        failedItems.push({
          item,
          reason: 'Failed to update inventory'
        });
        continue;
      }

      // Log the reservation
      await supabase
        .from('inventory_audit_log')
        .insert({
          product_inventory_id: inventoryData.id,
          product_id: item.productId,
          action_type: 'reservation',
          old_reserved_stock: inventoryData.reserved_stock,
          new_reserved_stock: newReservedStock,
          old_available_stock: inventoryData.stock_quantity - inventoryData.reserved_stock,
          new_available_stock: newAvailableStock,
          change_amount: item.quantity,
          reason: `Stock reserved for order ${orderId}`,
          order_id: orderId
        });

      reservedItems.push(item);
      console.log(`Successfully reserved ${item.quantity} units for product ${item.productId}`);

    } catch (error) {
      console.error('Error reserving stock:', error);
      failedItems.push({
        item,
        reason: 'Unexpected error during reservation'
      });
    }
  }

  const success = failedItems.length === 0;
  const message = success 
    ? `Successfully reserved stock for ${reservedItems.length} items`
    : `Reserved ${reservedItems.length} items, ${failedItems.length} failed`;

  console.log('Stock reservation result:', { success, message, reservedItems, failedItems });
  
  return {
    success,
    message,
    reservedItems,
    failedItems
  };
}

/**
 * Fulfill stock when order is delivered (reduce both stock_quantity and reserved_stock)
 */
export async function fulfillStockForOrder(
  orderItems: StockReservationItem[],
  orderId: string
): Promise<StockReservationResult> {
  console.log('=== FULFILLING STOCK FOR ORDER ===');
  console.log('Order ID:', orderId);
  console.log('Items to fulfill:', orderItems);

  const fulfilledItems: StockReservationItem[] = [];
  const failedItems: Array<{ item: StockReservationItem; reason: string }> = [];

  for (const item of orderItems) {
    try {
      // Find the inventory record
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', item.productId)
        .eq('id', item.productInventoryId || '')
        .single();

      if (inventoryError || !inventoryData) {
        console.error(`Inventory not found for product ${item.productId}:`, inventoryError);
        failedItems.push({
          item,
          reason: 'Inventory record not found'
        });
        continue;
      }

      // Check if we have enough reserved stock
      if (inventoryData.reserved_stock < item.quantity) {
        console.error(`Insufficient reserved stock: reserved ${inventoryData.reserved_stock}, requested ${item.quantity}`);
        failedItems.push({
          item,
          reason: `Insufficient reserved stock: only ${inventoryData.reserved_stock} reserved`
        });
        continue;
      }

      // Fulfill the stock (reduce both stock_quantity and reserved_stock)
      const newStockQuantity = Math.max(0, inventoryData.stock_quantity - item.quantity);
      const newReservedStock = Math.max(0, inventoryData.reserved_stock - item.quantity);
      const newAvailableStock = newStockQuantity - newReservedStock;

      const { error: updateError } = await supabase
        .from('product_inventory')
        .update({
          stock_quantity: newStockQuantity,
          reserved_stock: newReservedStock,
          available_stock: newAvailableStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryData.id);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        failedItems.push({
          item,
          reason: 'Failed to update inventory'
        });
        continue;
      }

      // Log the fulfillment
      await supabase
        .from('inventory_audit_log')
        .insert({
          product_inventory_id: inventoryData.id,
          product_id: item.productId,
          action_type: 'fulfillment',
          old_stock_quantity: inventoryData.stock_quantity,
          new_stock_quantity: newStockQuantity,
          old_reserved_stock: inventoryData.reserved_stock,
          new_reserved_stock: newReservedStock,
          old_available_stock: inventoryData.stock_quantity - inventoryData.reserved_stock,
          new_available_stock: newAvailableStock,
          change_amount: item.quantity,
          reason: `Stock fulfilled for delivered order ${orderId}`,
          order_id: orderId
        });

      fulfilledItems.push(item);
      console.log(`Successfully fulfilled ${item.quantity} units for product ${item.productId}`);

    } catch (error) {
      console.error('Error fulfilling stock:', error);
      failedItems.push({
        item,
        reason: 'Unexpected error during fulfillment'
      });
    }
  }

  const success = failedItems.length === 0;
  const message = success 
    ? `Successfully fulfilled stock for ${fulfilledItems.length} items`
    : `Fulfilled ${fulfilledItems.length} items, ${failedItems.length} failed`;

  console.log('Stock fulfillment result:', { success, message, fulfilledItems, failedItems });
  
  return {
    success,
    message,
    reservedItems: fulfilledItems,
    failedItems
  };
}

/**
 * Release reserved stock when order is cancelled (only reduce reserved_stock)
 */
export async function releaseStockForOrder(
  orderItems: StockReservationItem[],
  orderId: string
): Promise<StockReservationResult> {
  console.log('=== RELEASING STOCK FOR ORDER ===');
  console.log('Order ID:', orderId);
  console.log('Items to release:', orderItems);

  const releasedItems: StockReservationItem[] = [];
  const failedItems: Array<{ item: StockReservationItem; reason: string }> = [];

  for (const item of orderItems) {
    try {
      // Find the inventory record
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', item.productId)
        .eq('id', item.productInventoryId || '')
        .single();

      if (inventoryError || !inventoryData) {
        console.error(`Inventory not found for product ${item.productId}:`, inventoryError);
        failedItems.push({
          item,
          reason: 'Inventory record not found'
        });
        continue;
      }

      // Release the reserved stock (only reduce reserved_stock, keep stock_quantity same)
      const newReservedStock = Math.max(0, inventoryData.reserved_stock - item.quantity);
      const newAvailableStock = inventoryData.stock_quantity - newReservedStock;

      const { error: updateError } = await supabase
        .from('product_inventory')
        .update({
          reserved_stock: newReservedStock,
          available_stock: newAvailableStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryData.id);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        failedItems.push({
          item,
          reason: 'Failed to update inventory'
        });
        continue;
      }

      // Log the release
      await supabase
        .from('inventory_audit_log')
        .insert({
          product_inventory_id: inventoryData.id,
          product_id: item.productId,
          action_type: 'release',
          old_reserved_stock: inventoryData.reserved_stock,
          new_reserved_stock: newReservedStock,
          old_available_stock: inventoryData.stock_quantity - inventoryData.reserved_stock,
          new_available_stock: newAvailableStock,
          change_amount: item.quantity,
          reason: `Stock released for cancelled order ${orderId}`,
          order_id: orderId
        });

      releasedItems.push(item);
      console.log(`Successfully released ${item.quantity} units for product ${item.productId}`);

    } catch (error) {
      console.error('Error releasing stock:', error);
      failedItems.push({
        item,
        reason: 'Unexpected error during release'
      });
    }
  }

  const success = failedItems.length === 0;
  const message = success 
    ? `Successfully released stock for ${releasedItems.length} items`
    : `Released ${releasedItems.length} items, ${failedItems.length} failed`;

  console.log('Stock release result:', { success, message, releasedItems, failedItems });
  
  return {
    success,
    message,
    reservedItems: releasedItems,
    failedItems
  };
}

/**
 * Get order items from order for stock operations
 */
export async function getOrderItemsForStockOperation(orderId: string, isCustomerOrder: boolean = false): Promise<StockReservationItem[]> {
  const table = isCustomerOrder ? 'customer_order_items' : 'order_items';
  
  console.log(`Fetching order items from ${table} for order ${orderId}`);
  
  const { data: orderItems, error } = await supabase
    .from(table)
    .select('product_id, product_inventory_id, quantity')
    .eq('order_id', orderId);

  if (error) {
    console.error('Error fetching order items:', error);
    return [];
  }

  if (!orderItems || orderItems.length === 0) {
    console.log('No order items found for order:', orderId);
    return [];
  }

  const stockItems = orderItems.map(item => ({
    productId: item.product_id,
    productInventoryId: item.product_inventory_id,
    quantity: item.quantity
  }));

  console.log('Retrieved order items for stock operation:', stockItems);
  
  return stockItems;
}
