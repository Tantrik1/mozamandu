
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/types/admin';

export interface InventoryItem {
  id: string;
  product_id: string;
  color_variant_id?: string | null;
  size_variant_id?: string | null;
  product_name: string;
  sku: string;
  color_name?: string | null;
  size_name?: string | null;
  size_code?: string | null;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold?: number | null;
  cost_price?: number | null;
  selling_price?: number | null;
  is_active: boolean;
  category_id?: string | null;
  subcategory_id?: string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryOverview {
  id?: string;
  product_name?: string;
  category_name?: string;
  subcategory_name?: string;
  variant_name?: string;
  size_name?: string;
  product_sku?: string;
  stock_quantity?: number;
  reserved_stock?: number;
  available_stock?: number;
  low_stock_threshold?: number;
  stock_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LowStockAlert {
  id?: string;
  product_id?: string;
  product_name?: string;
  category_name?: string;
  subcategory_name?: string;
  variant_name?: string;
  size_name?: string;
  product_sku?: string;
  sku?: string;
  color_name?: string | null;
  stock_quantity?: number;
  reserved_stock?: number;
  available_stock?: number;
  low_stock_threshold: number;
  stock_needed?: number;
  updated_at?: string;
}

export interface InventoryAnalytics {
  total_items: number;
  active_items: number;
  total_stock: number;
  total_available_stock: number;
  total_reserved_stock: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_value: number;
  average_item_cost: number;
  stock_utilization_rate: number;
  stock_turnover_rate: number;
}

export interface InventoryChange {
  id: string;
  inventory_id: string;
  change_type: string;
  quantity_change: number;
  reason: string;
  created_at: string;
  user_id: string;
}

export interface InventorySummary {
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  variant_count: number;
}

export const generateProductSKU = async (productName: string, colorName?: string, sizeName?: string): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_product_sku', {
      p_product_name: productName,
      p_color_name: colorName || null,
      p_size_name: sizeName || null
    });

    if (error) throw error;
    return data || `${productName.substring(0, 8).toUpperCase()}-${Date.now()}`;
  } catch (error) {
    console.error('Error generating SKU:', error);
    return `${productName.substring(0, 8).toUpperCase()}-${Date.now()}`;
  }
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*');

    if (error) {
      console.error('Error fetching inventory items:', error);
      throw new Error('Failed to fetch inventory items');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInventoryItems:', error);
    return [];
  }
};

export const getInventoryOverview = async (): Promise<InventoryOverview[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_overview')
      .select('*');

    if (error) {
      console.error('Error fetching inventory overview:', error);
      throw new Error('Failed to fetch inventory overview');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInventoryOverview:', error);
    return [];
  }
};

export const getLowStockAlerts = async (): Promise<LowStockAlert[]> => {
  try {
    const { data, error } = await supabase
      .from('low_stock_alerts')
      .select('*');

    if (error) {
      console.error('Error fetching low stock alerts:', error);
      throw new Error('Failed to fetch low stock alerts');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLowStockAlerts:', error);
    return [];
  }
};

export const getInventoryAnalytics = async (): Promise<InventoryAnalytics | null> => {
  try {
    // Since inventory_analytics table doesn't exist, calculate from product_inventory
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*');

    if (error) {
      console.error('Error fetching inventory for analytics:', error);
      return null;
    }

    if (!data) return null;

    const totalItems = data.length;
    const activeItems = data.filter(item => item.is_active).length;
    const totalStock = data.reduce((sum, item) => sum + item.stock_quantity, 0);
    const totalAvailableStock = data.reduce((sum, item) => sum + item.available_stock, 0);
    const totalReservedStock = data.reduce((sum, item) => sum + item.reserved_stock, 0);
    const lowStockItems = data.filter(item => item.available_stock <= (item.low_stock_threshold || 10)).length;
    const outOfStockItems = data.filter(item => item.available_stock === 0).length;
    const totalStockValue = data.reduce((sum, item) => sum + ((item.cost_price || 0) * item.stock_quantity), 0);

    return {
      total_items: totalItems,
      active_items: activeItems,
      total_stock: totalStock,
      total_available_stock: totalAvailableStock,
      total_reserved_stock: totalReservedStock,
      low_stock_items: lowStockItems,
      out_of_stock_items: outOfStockItems,
      total_stock_value: totalStockValue,
      average_item_cost: totalItems > 0 ? totalStockValue / totalItems : 0,
      stock_utilization_rate: totalStock > 0 ? (totalReservedStock / totalStock) * 100 : 0,
      stock_turnover_rate: totalStock > 0 ? (totalAvailableStock / totalStock) * 100 : 0,
    };
  } catch (error) {
    console.error('Error in getInventoryAnalytics:', error);
    return null;
  }
};

export const getInventoryHistory = async (inventoryId: string): Promise<InventoryChange[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_audit_log')
      .select('*')
      .eq('product_inventory_id', inventoryId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory history:', error);
      throw new Error('Failed to fetch inventory history');
    }

    return (data || []).map(item => ({
      id: item.id,
      inventory_id: item.product_inventory_id || '',
      change_type: item.action_type,
      quantity_change: item.change_amount || 0,
      reason: item.reason || '',
      created_at: item.created_at || '',
      user_id: item.user_id || '',
    }));
  } catch (error) {
    console.error('Error in getInventoryHistory:', error);
    return [];
  }
};

export const updateStock = async (
  productId: string,
  stockChange: number,
  colorVariantId: string | null | undefined,
  sizeVariantId: string | null | undefined,
  reservationChange: number,
  reason: string = 'Stock updated'
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('safe_update_stock', {
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

    return true;
  } catch (error) {
    console.error('Error in updateStock:', error);
    return false;
  }
};

export const reserveStock = async (
  inventoryId: string,
  quantity: number,
  reason: string = 'Stock reserved'
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('safe_update_stock', {
      p_product_id: inventoryId,
      p_stock_change: 0,
      p_reservation_change: quantity,
      p_reason: reason
    });

    if (error) {
      console.error('Error reserving stock:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in reserveStock:', error);
    return false;
  }
};

export const releaseStock = async (
  inventoryId: string,
  quantity: number,
  reason: string = 'Stock released'
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('safe_update_stock', {
      p_product_id: inventoryId,
      p_stock_change: 0,
      p_reservation_change: -quantity,
      p_reason: reason
    });

    if (error) {
      console.error('Error releasing stock:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in releaseStock:', error);
    return false;
  }
};

export const deductStock = async (
  inventoryId: string,
  quantity: number,
  reason: string = 'Stock deducted'
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('safe_update_stock', {
      p_product_id: inventoryId,
      p_stock_change: -quantity,
      p_reservation_change: 0,
      p_reason: reason
    });

    if (error) {
      console.error('Error deducting stock:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deductStock:', error);
    return false;
  }
};

export const restoreStock = async (
  inventoryId: string,
  quantity: number,
  reason: string = 'Stock restored'
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('safe_update_stock', {
      p_product_id: inventoryId,
      p_stock_change: quantity,
      p_reservation_change: 0,
      p_reason: reason
    });

    if (error) {
      console.error('Error restoring stock:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in restoreStock:', error);
    return false;
  }
};

export const bulkUpdateStock = async (
  updates: { inventoryId: string; stockChange: number; reason?: string }[]
): Promise<boolean> => {
  try {
    for (const update of updates) {
      const { inventoryId, stockChange, reason = 'Bulk stock update' } = update;
      const { error } = await supabase.rpc('safe_update_stock', {
        p_product_id: inventoryId,
        p_stock_change: stockChange,
        p_reservation_change: 0,
        p_reason: reason
      });

      if (error) {
        console.error(`Error updating stock for ${inventoryId}:`, error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in bulkUpdateStock:', error);
    return false;
  }
};

export const setLowStockThreshold = async (
  inventoryId: string,
  threshold: number
): Promise<boolean> => {
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
};

export const searchInventory = async (query: string): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .ilike('product_name', `%${query}%`);

    if (error) {
      console.error('Error searching inventory:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchInventory:', error);
    return [];
  }
};

export const useInventoryRealtime = (channelName: string) => {
  const subscribe = (callback: (payload: any) => void) => {
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_inventory' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  return { subscribe };
};

export const getProductInventory = async (productId: string): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching product inventory:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProductInventory:', error);
    return [];
  }
};

export const getInventorySummary = async (productId: string): Promise<InventorySummary> => {
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
        variant_count: 0,
      };
    }

    let totalStock = 0;
    let availableStock = 0;
    let reservedStock = 0;

    data?.forEach((item) => {
      totalStock += item.stock_quantity;
      availableStock += item.available_stock;
      reservedStock += item.reserved_stock;
    });

    return {
      total_stock: totalStock,
      available_stock: availableStock,
      reserved_stock: reservedStock,
      variant_count: data?.length || 0,
    };
  } catch (error) {
    console.error('Error in getInventorySummary:', error);
    return {
      total_stock: 0,
      available_stock: 0,
      reserved_stock: 0,
      variant_count: 0,
    };
  }
};

export const syncProductToInventory = async (productId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('sync_product_to_inventory', {
      p_product_id: productId,
    });

    if (error) {
      console.error('Error syncing product to inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync product to inventory',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in syncProductToInventory:', error);
    toast({
      title: 'Error',
      description: 'An unexpected error occurred while syncing product to inventory',
      variant: 'destructive',
    });
    return false;
  }
};

export const createInventoryItem = async (item: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .insert([item]);

    if (error) {
      console.error('Error creating inventory item:', error);
      toast({
        title: 'Error',
        description: 'Failed to create inventory item',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createInventoryItem:', error);
    toast({
      title: 'Error',
      description: 'An unexpected error occurred while creating inventory item',
      variant: 'destructive',
    });
    return false;
  }
};

export const deleteInventoryItem = async (inventoryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .delete()
      .eq('id', inventoryId);

    if (error) {
      console.error('Error deleting inventory item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete inventory item',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteInventoryItem:', error);
    toast({
      title: 'Error',
      description: 'An unexpected error occurred while deleting inventory item',
      variant: 'destructive',
    });
    return false;
  }
};

export const addStock = async (inventoryId: string, quantity: number, reason: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('safe_update_stock', {
      p_product_id: inventoryId,
      p_stock_change: quantity,
      p_reservation_change: 0,
      p_reason: reason,
    });

    if (error) {
      console.error('Error adding stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to add stock',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addStock:', error);
    toast({
      title: 'Error',
      description: 'An unexpected error occurred while adding stock',
      variant: 'destructive',
    });
    return false;
  }
};

export const getRealTimeStock = async (productId: string, productInventoryId?: string | null) => {
  try {
    let query = supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock, is_active')
      .eq('product_id', productId);

    if (productInventoryId) {
      query = query.eq('id', productInventoryId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching real-time stock:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getRealTimeStock:', error);
    return null;
  }
};

export const subscribeToInventoryChanges = async (productId: string, callback: (payload: any) => void) => {
  const channel = supabase.channel(`product-inventory-${productId}`);

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_inventory',
        filter: `product_id=eq.${productId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
};

export const subscribeToAllInventoryChanges = async (callback: (payload: any) => void) => {
  const channel = supabase.channel('all-inventory-changes');

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_inventory',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
};

export const getProductStockSummary = async (productId: string) => {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching product stock summary:', error);
      return {
        totalStock: 0,
        availableStock: 0,
        reservedStock: 0,
      };
    }

    let totalStock = 0;
    let availableStock = 0;
    let reservedStock = 0;

    data.forEach((item) => {
      totalStock += item.stock_quantity;
      availableStock += item.available_stock;
      reservedStock += item.reserved_stock;
    });

    return {
      totalStock,
      availableStock,
      reservedStock,
    };
  } catch (error) {
    console.error('Error in getProductStockSummary:', error);
    return {
      totalStock: 0,
      availableStock: 0,
      reservedStock: 0,
    };
  }
};

export const calculateTotalProductStock = async (productId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('available_stock')
      .eq('product_id', productId);

    if (error) {
      console.error('Error calculating total product stock:', error);
      return 0;
    }

    return data?.reduce((total, item) => total + item.available_stock, 0) || 0;
  } catch (error) {
    console.error('Error in calculateTotalProductStock:', error);
    return 0;
  }
};

export async function validateCartStock(cartItems: Array<{
  productId: string;
  productInventoryId?: string | null;
  quantity: number;
  productName: string;
}>) {
  const validationResults: {
    isValid: boolean;
    productId: string;
    productInventoryId?: string | null;
    availableStock?: number;
    requestedQuantity: number;
    errorMessage?: string;
  }[] = [];

  let isValid = true;
  const errorMessages: string[] = [];

  for (const item of cartItems) {
    const stock = await getRealTimeStock(item.productId, item.productInventoryId);

    if (!stock) {
      isValid = false;
      errorMessages.push(`Product ${item.productName} not found in inventory`);
      validationResults.push({
        isValid: false,
        productId: item.productId,
        productInventoryId: item.productInventoryId,
        requestedQuantity: item.quantity,
        errorMessage: `Product ${item.productName} not found in inventory`,
      });
    } else if (!stock.is_active) {
      isValid = false;
      errorMessages.push(`Product ${item.productName} is not active`);
      validationResults.push({
        isValid: false,
        productId: item.productId,
        productInventoryId: item.productInventoryId,
        requestedQuantity: item.quantity,
        errorMessage: `Product ${item.productName} is not active`,
      });
    } else if (stock.available_stock < item.quantity) {
      isValid = false;
      errorMessages.push(`Only ${stock.available_stock} items available for ${item.productName}`);
      validationResults.push({
        isValid: false,
        productId: item.productId,
        productInventoryId: item.productInventoryId,
        availableStock: stock.available_stock,
        requestedQuantity: item.quantity,
        errorMessage: `Only ${stock.available_stock} items available for ${item.productName}`,
      });
    } else {
      validationResults.push({
        isValid: true,
        productId: item.productId,
        productInventoryId: item.productInventoryId,
        availableStock: stock.available_stock,
        requestedQuantity: item.quantity,
      });
    }
  }

  return {
    isValid,
    errorMessages,
    validationResults,
  };
}

export async function processCheckoutStock(cartItems: Array<{
  productId: string;
  productInventoryId?: string | null;
  quantity: number;
  productName: string;
}>) {
  try {
    for (const item of cartItems) {
      if (item.productInventoryId) {
        // Reserve stock for the specific product variant
        const reserveSuccess = await reserveStock(
          item.productInventoryId,
          item.quantity,
          `Order placed for ${item.productName}`
        );

        if (!reserveSuccess) {
          console.error(`Failed to reserve stock for product ${item.productName} with inventory ID ${item.productInventoryId}`);
          return false;
        }
      } else {
        console.warn(`No inventory ID for product ${item.productName}. Skipping stock reservation.`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error processing checkout stock:', error);
    return false;
  }
}

export async function handleOrderStatusUpdate(orderId: string, newStatus: string) {
  if (newStatus === 'cancelled') {
    // Rollback stock reservations
    const rollbackSuccess = await rollbackStockReservations(orderId);
    if (!rollbackSuccess) {
      console.warn('Failed to rollback stock reservations for cancelled order:', orderId);
      // Consider more robust error handling here
    }
  } else if (newStatus === 'shipped') {
    // Deduct stock
    const { data: orderItems, error: fetchError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (fetchError) {
      console.error('Error fetching order items:', fetchError);
      return false;
    }

    if (!orderItems || orderItems.length === 0) {
      return true; // No items to deduct
    }

    for (const item of orderItems) {
      if (item.product_inventory_id) {
        const deductSuccess = await deductStock(
          item.product_inventory_id,
          item.quantity,
          `Order ${orderId} shipped`
        );
        if (!deductSuccess) {
          console.warn(`Failed to deduct stock for item ${item.product_id} in order ${orderId}`);
          // Consider more robust error handling here
        }
      }
    }
  }

  return true;
}

export const updateOrderStatus = async (
  orderId: string,
  newStatus: 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const rollbackStockReservations = async (
  orderId: string
): Promise<boolean> => {
  try {
    // Get order items and release their reservations
    const { data: orderItems, error: fetchError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (fetchError) {
      console.error('Error fetching order items:', fetchError);
      return false;
    }

    if (!orderItems || orderItems.length === 0) {
      return true; // No items to rollback
    }

    // Release reservations for each item
    for (const item of orderItems) {
      if (item.product_inventory_id) {
        await releaseStock(item.product_inventory_id, item.quantity, `Order ${orderId} cancelled`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error rolling back stock reservations:', error);
    return false;
  }
};
