import { supabase } from '@/integrations/supabase/client';
import { Product, ColorVariant, SizeVariant } from '@/types/admin';

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  category_id: string;
  subcategory_id: string;
  color_name?: string;
  size_name?: string;
  size_code?: string;
  cost_price: number;
  selling_price?: number;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const updateOrderStatus = async (
  orderId: string,
  newStatus: string,
  isCustomerOrder: boolean = false
): Promise<boolean> => {
  try {
    const tableName = isCustomerOrder ? 'customer_orders' : 'orders';
    
    const { error } = await supabase
      .from(tableName)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('is_active', true)
      .order('product_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return [];
  }
};

export const getInventoryOverview = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_overview')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory overview:', error);
    return [];
  }
};

export const getLowStockAlerts = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('low_stock_alerts')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return [];
  }
};

export const getInventoryAnalytics = async (): Promise<any> => {
  try {
    const { data, error } = await supabase
      .rpc('get_detailed_inventory_analytics');

    if (error) throw error;
    
    // Convert the result to the expected format
    const analytics: any = {
      total_items: 0,
      active_items: 0,
      total_available_stock: 0,
      total_reserved_stock: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      total_stock_value: 0,
    };

    if (data) {
      data.forEach((item: any) => {
        switch (item.metric_name) {
          case 'total_products':
            analytics.total_items = Number(item.metric_value);
            break;
          case 'active_products':
            analytics.active_items = Number(item.metric_value);
            break;
          case 'low_stock_items':
            analytics.low_stock_items = Number(item.metric_value);
            break;
          case 'out_of_stock_items':
            analytics.out_of_stock_items = Number(item.metric_value);
            break;
          case 'total_stock_value':
            analytics.total_stock_value = Number(item.metric_value);
            break;
        }
      });
    }

    return analytics;
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    return {
      total_items: 0,
      active_items: 0,
      total_available_stock: 0,
      total_reserved_stock: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      total_stock_value: 0,
    };
  }
};

export const getInventoryHistory = async (
  productId?: string,
  daysBack: number = 30
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_inventory_history', {
        p_product_id: productId || null,
        p_days_back: daysBack
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    return [];
  }
};

export const updateStock = async (
  productId: string,
  stockChange: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  reservationChange: number = 0,
  reason: string = 'Manual update'
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('safe_update_stock', {
        p_product_id: productId,
        p_stock_change: stockChange,
        p_color_variant_id: colorVariantId || null,
        p_size_variant_id: sizeVariantId || null,
        p_reservation_change: reservationChange,
        p_reason: reason
      });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error updating stock:', error);
    return false;
  }
};

export const reserveStock = async (
  productInventoryId: string,
  quantity: number,
  reason: string = 'Stock reservation'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update({
        reserved_stock: supabase.raw(`reserved_stock + ${quantity}`),
        available_stock: supabase.raw(`available_stock - ${quantity}`),
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error reserving stock:', error);
    return false;
  }
};

export const releaseStock = async (
  productInventoryId: string,
  quantity: number,
  reason: string = 'Stock release'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update({
        reserved_stock: supabase.raw(`reserved_stock - ${quantity}`),
        available_stock: supabase.raw(`available_stock + ${quantity}`),
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error releasing stock:', error);
    return false;
  }
};

export const deductStock = async (
  productInventoryId: string,
  quantity: number,
  reason: string = 'Stock deduction'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update({
        stock_quantity: supabase.raw(`stock_quantity - ${quantity}`),
        available_stock: supabase.raw(`available_stock - ${quantity}`),
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deducting stock:', error);
    return false;
  }
};

export const restoreStock = async (
  productInventoryId: string,
  quantity: number,
  reason: string = 'Stock restoration'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update({
        stock_quantity: supabase.raw(`stock_quantity + ${quantity}`),
        available_stock: supabase.raw(`available_stock + ${quantity}`),
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error restoring stock:', error);
    return false;
  }
};

export const rollbackStockReservations = async (orderId: string): Promise<boolean> => {
  try {
    // Fetch all order items for the given order ID
    const { data: orderItems, error: fetchError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (fetchError) {
      console.error('Error fetching order items:', fetchError);
      return false;
    }

    // If there are no order items, return true (nothing to rollback)
    if (!orderItems || orderItems.length === 0) {
      return true;
    }

    // Loop through each order item and release the reserved stock
    for (const item of orderItems) {
      const { product_inventory_id, quantity } = item;

      // Release the reserved stock
      const { error: releaseError } = await supabase
        .from('product_inventory')
        .update({
          reserved_stock: supabase.raw(`reserved_stock - ${quantity}`),
          available_stock: supabase.raw(`available_stock + ${quantity}`)
        })
        .eq('id', product_inventory_id);

      if (releaseError) {
        console.error('Error releasing stock for item:', item, releaseError);
        return false; // Or continue and log all failures
      }
    }

    return true;
  } catch (error) {
    console.error('Error rolling back stock reservations:', error);
    return false;
  }
};

export const bulkUpdateStock = async (updates: any[]): Promise<{ success: number; errors: number }> => {
  try {
    const { data, error } = await supabase
      .rpc('bulk_update_inventory', { p_updates: updates });

    if (error) throw error;
    return {
      success: data?.[0]?.success_count || 0,
      errors: data?.[0]?.error_count || 0
    };
  } catch (error) {
    console.error('Error bulk updating stock:', error);
    return { success: 0, errors: updates.length };
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

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting low stock threshold:', error);
    return false;
  }
};

export const searchInventory = async (query: string): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .or(`product_name.ilike.%${query}%,sku.ilike.%${query}%,color_name.ilike.%${query}%,size_name.ilike.%${query}%`)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching inventory:', error);
    return [];
  }
};

export const subscribeToInventoryChanges = (
  productId: string,
  callback: (payload: any) => void
) => {
  const subscription = supabase
    .channel(`product_inventory:${productId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'product_inventory',
      filter: `product_id=eq.${productId}`
    }, callback)
    .subscribe();

  return subscription;
};

export const subscribeToAllInventoryChanges = (
  callback: (payload: any) => void
) => {
  const subscription = supabase
    .channel('product_inventory_all')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'product_inventory'
    }, callback)
    .subscribe();

  return subscription;
};

export const getRealTimeStock = async (productId: string, productInventoryId?: string) => {
  try {
    let query = supabase
      .from('product_inventory')
      .select('*')
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
    console.error('Error fetching real-time stock:', error);
    return null;
  }
};

export const useInventoryRealtime = (channel: string) => {
  return {
    subscribe: (callback: (payload: any) => void) => {
      const subscription = supabase
        .channel(channel)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'product_inventory'
        }, callback)
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  };
};

export const generateProductSKU = async (
  productName: string,
  colorName?: string,
  sizeName?: string
): Promise<string> => {
  try {
    const { data, error } = await supabase
      .rpc('generate_product_sku', {
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

export const createInventoryForProduct = async (
  productId: string,
  productName: string,
  categoryId: string,
  subcategoryId: string,
  costPrice: number,
  sellingPrice?: number
): Promise<boolean> => {
  try {
    const sku = await generateProductSKU(productName);
    
    const { error } = await supabase
      .from('product_inventory')
      .insert({
        product_id: productId,
        sku,
        product_name: productName,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        cost_price: costPrice,
        selling_price: sellingPrice,
        stock_quantity: 0,
        reserved_stock: 0,
        available_stock: 0,
        is_active: true
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating inventory for product:', error);
    return false;
  }
};

export const createInventoryItem = async (item: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .insert(item);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return false;
  }
};

export const updateInventoryItem = async (
  inventoryId: string,
  updates: Partial<InventoryItem>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return false;
  }
};
