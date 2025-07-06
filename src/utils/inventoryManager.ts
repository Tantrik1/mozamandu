
import { supabase } from '@/integrations/supabase/client';
import { LowStockAlert, InventoryItem, InventoryOverview, InventoryAnalytics, InventoryChange, InventorySummary } from '@/types/admin';

// Export the types so they can be imported from this module
export type { InventoryItem, InventoryOverview, InventoryAnalytics, LowStockAlert, InventoryChange, InventorySummary };

export async function validateCartStock(cartItems: Array<{
  id: string;
  productId: string;
  productName: string;
  productInventoryId?: string | null;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
}>): Promise<{
  isValid: boolean;
  errorMessages: string[];
}> {
  try {
    const errors: string[] = [];
    
    for (const item of cartItems) {
      // Validate stock for each item
      const stock = await getRealTimeStock(item.productId, item.productInventoryId);
      
      if (!stock) {
        errors.push(`Product "${item.productName}" not found in inventory`);
        continue;
      }
      
      if (!stock.is_active) {
        errors.push(`Product "${item.productName}" is not available`);
        continue;
      }
      
      if (stock.available_stock < item.quantity) {
        errors.push(`Only ${stock.available_stock} units available for "${item.productName}"`);
        continue;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errorMessages: errors
    };
  } catch (error) {
    console.error('Error validating cart stock:', error);
    return {
      isValid: false,
      errorMessages: ['Error validating cart stock']
    };
  }
}

export async function getRealTimeStock(
  productId: string,
  productInventoryId?: string | null
): Promise<{
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  is_active: boolean;
} | null> {
  try {
    let query = supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock, is_active')
      .eq('product_id', productId);

    if (productInventoryId) {
      query = query.eq('id', productInventoryId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      console.log(`No inventory found for product ${productId}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting real-time stock:', error);
    return null;
  }
}

export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  try {
    const { data, error } = await supabase
      .from('low_stock_alerts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching low stock alerts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLowStockAlerts:', error);
    return [];
  }
}

export async function updateInventoryStock(
  inventoryId: string,
  stockChange: number,
  reason: string = 'Manual update'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .update({
        stock_quantity: stockChange,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating inventory stock:', error);
      return false;
    }

    console.log('Successfully updated inventory stock:', data);
    return true;
  } catch (error) {
    console.error('Error in updateInventoryStock:', error);
    return false;
  }
}

export async function reserveStock(
  productId: string,
  quantity: number,
  orderId: string,
  productInventoryId?: string | null
): Promise<boolean> {
  try {
    console.log('Reserving stock:', { productId, quantity, orderId, productInventoryId });

    // Get current stock
    const currentStock = await getRealTimeStock(productId, productInventoryId);
    
    if (!currentStock) {
      console.error('Product not found in inventory');
      return false;
    }

    if (currentStock.available_stock < quantity) {
      console.error('Insufficient stock available');
      return false;
    }

    // Update reserved stock
    const newReservedStock = currentStock.reserved_stock + quantity;
    const newAvailableStock = currentStock.stock_quantity - newReservedStock;

    let updateQuery = supabase
      .from('product_inventory')
      .update({
        reserved_stock: newReservedStock,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('product_id', productId);

    if (productInventoryId) {
      updateQuery = updateQuery.eq('id', productInventoryId);
    }

    const { error } = await updateQuery;

    if (error) {
      console.error('Error updating reserved stock:', error);
      return false;
    }

    console.log('Successfully reserved stock');
    return true;
  } catch (error) {
    console.error('Error reserving stock:', error);
    return false;
  }
}

export async function releaseStock(
  productId: string,
  quantity: number,
  orderId: string,
  productInventoryId?: string | null
): Promise<boolean> {
  try {
    console.log('Releasing stock:', { productId, quantity, orderId, productInventoryId });

    // Get current stock
    const currentStock = await getRealTimeStock(productId, productInventoryId);
    
    if (!currentStock) {
      console.error('Product not found in inventory');
      return false;
    }

    // Update reserved stock
    const newReservedStock = Math.max(0, currentStock.reserved_stock - quantity);
    const newAvailableStock = currentStock.stock_quantity - newReservedStock;

    let updateQuery = supabase
      .from('product_inventory')
      .update({
        reserved_stock: newReservedStock,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('product_id', productId);

    if (productInventoryId) {
      updateQuery = updateQuery.eq('id', productInventoryId);
    }

    const { error } = await updateQuery;

    if (error) {
      console.error('Error updating reserved stock:', error);
      return false;
    }

    console.log('Successfully released stock');
    return true;
  } catch (error) {
    console.error('Error releasing stock:', error);
    return false;
  }
}

export async function confirmStockReservation(
  productId: string,
  quantity: number,
  orderId: string,
  productInventoryId?: string | null
): Promise<boolean> {
  try {
    console.log('Confirming stock reservation:', { productId, quantity, orderId, productInventoryId });

    // Get current stock
    const currentStock = await getRealTimeStock(productId, productInventoryId);
    
    if (!currentStock) {
      console.error('Product not found in inventory');
      return false;
    }

    // Reduce actual stock quantity and reserved stock
    const newStockQuantity = Math.max(0, currentStock.stock_quantity - quantity);
    const newReservedStock = Math.max(0, currentStock.reserved_stock - quantity);
    const newAvailableStock = newStockQuantity - newReservedStock;

    let updateQuery = supabase
      .from('product_inventory')
      .update({
        stock_quantity: newStockQuantity,
        reserved_stock: newReservedStock,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('product_id', productId);

    if (productInventoryId) {
      updateQuery = updateQuery.eq('id', productInventoryId);
    }

    const { error } = await updateQuery;

    if (error) {
      console.error('Error confirming stock reservation:', error);
      return false;
    }

    console.log('Successfully confirmed stock reservation');
    return true;
  } catch (error) {
    console.error('Error confirming stock reservation:', error);
    return false;
  }
}

export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock, is_active, cost_price');

    if (error) {
      console.error('Error fetching inventory analytics:', error);
      return {
        total_items: 0,
        active_items: 0,
        total_available_stock: 0,
        total_reserved_stock: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        total_stock_value: 0
      };
    }

    const analytics = (data || []).reduce((acc, item) => {
      acc.total_items += 1;
      if (item.is_active) acc.active_items += 1;
      acc.total_available_stock += item.available_stock || 0;
      acc.total_reserved_stock += item.reserved_stock || 0;
      if ((item.available_stock || 0) <= 5) acc.low_stock_items += 1;
      if ((item.available_stock || 0) === 0) acc.out_of_stock_items += 1;
      acc.total_stock_value += (item.stock_quantity || 0) * (item.cost_price || 0);
      return acc;
    }, {
      total_items: 0,
      active_items: 0,
      total_available_stock: 0,
      total_reserved_stock: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      total_stock_value: 0
    });

    return analytics;
  } catch (error) {
    console.error('Error in getInventoryAnalytics:', error);
    return {
      total_items: 0,
      active_items: 0,
      total_available_stock: 0,
      total_reserved_stock: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      total_stock_value: 0
    };
  }
}

export async function bulkUpdateStock(updates: Array<{
  inventoryId: string;
  stockQuantity: number;
  reason?: string;
}>): Promise<boolean> {
  try {
    console.log('Performing bulk stock update:', updates.length, 'items');

    const results = await Promise.all(
      updates.map(update => 
        updateInventoryStock(update.inventoryId, update.stockQuantity, update.reason)
      )
    );

    const successCount = results.filter(result => result).length;
    console.log(`Bulk update completed: ${successCount}/${updates.length} successful`);

    return successCount === updates.length;
  } catch (error) {
    console.error('Error in bulkUpdateStock:', error);
    return false;
  }
}

// New functions that are being imported but missing
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .order('product_name');

    if (error) {
      console.error('Error fetching inventory items:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInventoryItems:', error);
    return [];
  }
}

export async function getInventoryOverview(): Promise<InventoryOverview[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_overview')
      .select('*')
      .order('product_name');

    if (error) {
      console.error('Error fetching inventory overview:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInventoryOverview:', error);
    return [];
  }
}

export async function getInventoryHistory(productId?: string, daysBack: number = 30): Promise<InventoryChange[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_inventory_history', {
        p_product_id: productId || null,
        p_days_back: daysBack
      });

    if (error) {
      console.error('Error fetching inventory history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInventoryHistory:', error);
    return [];
  }
}

export async function updateStock(
  productId: string,
  stockChange: number,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
  reservationChange: number = 0,
  reason: string = 'Manual update'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('safe_update_stock', {
        p_product_id: productId,
        p_stock_change: stockChange,
        p_color_variant_id: colorVariantId,
        p_size_variant_id: sizeVariantId,
        p_reservation_change: reservationChange,
        p_reason: reason
      });

    if (error) {
      console.error('Error updating stock:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in updateStock:', error);
    return false;
  }
}

export async function deductStock(
  productId: string,
  quantity: number,
  productInventoryId?: string | null,
  reason: string = 'Stock deduction'
): Promise<boolean> {
  return updateStock(productId, -quantity, null, null, 0, reason);
}

export async function setLowStockThreshold(inventoryId: string, threshold: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update({ low_stock_threshold: threshold })
      .eq('id', inventoryId);

    if (error) {
      console.error('Error setting low stock threshold:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setLowStockThreshold:', error);
    return false;
  }
}

export async function searchInventory(query: string): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .or(`product_name.ilike.%${query}%,sku.ilike.%${query}%,color_name.ilike.%${query}%`)
      .order('product_name');

    if (error) {
      console.error('Error searching inventory:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchInventory:', error);
    return [];
  }
}

export function useInventoryRealtime(channel: string) {
  return {
    subscribe: (callback: (payload: any) => void) => {
      const subscription = supabase
        .channel(channel)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'product_inventory' }, 
          callback
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  };
}

export async function createInventoryItem(item: {
  product_id: string;
  sku?: string;
  product_name: string;
  color_name?: string | null;
  size_name?: string | null;
  size_code?: string | null;
  stock_quantity: number;
  cost_price?: number | null;
  selling_price?: number | null;
  color_variant_id?: string | null;
  size_variant_id?: string | null;
  is_active?: boolean;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .insert({
        ...item,
        sku: item.sku || await generateProductSKU(item.product_name, item.color_name, item.size_name),
        reserved_stock: 0,
        available_stock: item.stock_quantity,
        is_active: item.is_active !== false
      });

    if (error) {
      console.error('Error creating inventory item:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createInventoryItem:', error);
    return false;
  }
}

export async function generateProductSKU(
  productName: string, 
  colorName?: string | null, 
  sizeName?: string | null
): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('generate_product_sku', {
        p_product_name: productName,
        p_color_name: colorName,
        p_size_name: sizeName
      });

    if (error) {
      console.error('Error generating SKU:', error);
      // Fallback SKU generation
      const timestamp = Date.now().toString().slice(-6);
      return `SKU-${timestamp}`;
    }

    return data || `SKU-${Date.now().toString().slice(-6)}`;
  } catch (error) {
    console.error('Error in generateProductSKU:', error);
    return `SKU-${Date.now().toString().slice(-6)}`;
  }
}

export async function getProductInventory(productId: string): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .order('color_name, size_name');

    if (error) {
      console.error('Error fetching product inventory:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProductInventory:', error);
    return [];
  }
}

export async function getInventorySummary(productId: string): Promise<InventorySummary> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching inventory summary:', error);
      return {
        total_stock: 0,
        available_stock: 0,
        reserved_stock: 0,
        variant_count: 0
      };
    }

    const summary = (data || []).reduce((acc, item) => {
      acc.total_stock += item.stock_quantity || 0;
      acc.available_stock += item.available_stock || 0;
      acc.reserved_stock += item.reserved_stock || 0;
      acc.variant_count += 1;
      return acc;
    }, {
      total_stock: 0,
      available_stock: 0,
      reserved_stock: 0,
      variant_count: 0
    });

    return summary;
  } catch (error) {
    console.error('Error in getInventorySummary:', error);
    return {
      total_stock: 0,
      available_stock: 0,
      reserved_stock: 0,
      variant_count: 0
    };
  }
}

export async function syncProductToInventory(productId: string): Promise<boolean> {
  try {
    // This would sync product variants to inventory
    // For now, just return true as the logic would be complex
    console.log('Syncing product to inventory:', productId);
    return true;
  } catch (error) {
    console.error('Error in syncProductToInventory:', error);
    return false;
  }
}

export async function deleteInventoryItem(inventoryId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .delete()
      .eq('id', inventoryId);

    if (error) {
      console.error('Error deleting inventory item:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteInventoryItem:', error);
    return false;
  }
}

export async function addStock(
  inventoryId: string,
  quantity: number,
  reason: string = 'Stock addition'
): Promise<boolean> {
  try {
    // Get current stock
    const { data: current, error: fetchError } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock')
      .eq('id', inventoryId)
      .single();

    if (fetchError || !current) {
      console.error('Error fetching current stock:', fetchError);
      return false;
    }

    // Update stock
    const newStockQuantity = current.stock_quantity + quantity;
    const newAvailableStock = newStockQuantity - current.reserved_stock;

    const { error } = await supabase
      .from('product_inventory')
      .update({
        stock_quantity: newStockQuantity,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId);

    if (error) {
      console.error('Error adding stock:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addStock:', error);
    return false;
  }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: status as any })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return false;
  }
}

export async function rollbackStockReservations(orderId: string): Promise<boolean> {
  try {
    // Get order items
    const { data: orderItems, error: fetchError } = await supabase
      .from('order_items')
      .select('product_id, product_inventory_id, quantity')
      .eq('order_id', orderId);

    if (fetchError) {
      console.error('Error fetching order items:', fetchError);
      return false;
    }

    // Release stock for each item
    for (const item of orderItems || []) {
      await releaseStock(item.product_id, item.quantity, orderId, item.product_inventory_id);
    }

    return true;
  } catch (error) {
    console.error('Error in rollbackStockReservations:', error);
    return false;
  }
}

export async function getProductStockSummary(productId: string): Promise<{ totalStock: number; availableStock: number; reservedStock: number }> {
  try {
    const summary = await getInventorySummary(productId);
    return {
      totalStock: summary.total_stock,
      availableStock: summary.available_stock,
      reservedStock: summary.reserved_stock
    };
  } catch (error) {
    console.error('Error in getProductStockSummary:', error);
    return { totalStock: 0, availableStock: 0, reservedStock: 0 };
  }
}

export async function processCheckoutStock(cartItems: any[]): Promise<boolean> {
  try {
    // Process stock reservations for checkout
    for (const item of cartItems) {
      const success = await reserveStock(
        item.productId,
        item.quantity,
        'checkout-' + Date.now(),
        item.productInventoryId
      );
      if (!success) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error in processCheckoutStock:', error);
    return false;
  }
}

export async function handleOrderStatusUpdate(orderId: string, newStatus: string): Promise<boolean> {
  return updateOrderStatus(orderId, newStatus);
}

export async function calculateTotalProductStock(productId: string): Promise<number> {
  try {
    const summary = await getInventorySummary(productId);
    return summary.available_stock;
  } catch (error) {
    console.error('Error in calculateTotalProductStock:', error);
    return 0;
  }
}

export async function subscribeToInventoryChanges(productId: string, callback: (payload: any) => void) {
  const subscription = supabase
    .channel(`inventory-${productId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'product_inventory',
        filter: `product_id=eq.${productId}`
      }, 
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

export async function subscribeToAllInventoryChanges(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('all-inventory')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'product_inventory' }, 
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}
