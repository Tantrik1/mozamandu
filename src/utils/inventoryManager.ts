import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  color_variant_id?: string;
  size_variant_id?: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  size_code?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  cost_price?: number;
  selling_price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemData {
  product_id: string;
  sku: string;
  color_variant_id?: string;
  size_variant_id?: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  size_code?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  cost_price?: number;
  selling_price?: number;
  is_active: boolean;
}

export interface InventorySummary {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

export interface InventoryOverview {
  id: string;
  product_name: string;
  sku: string;
  product_sku?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  category_name: string;
  subcategory_name: string;
  variant_name?: string;
  size_name?: string;
  stock_status?: string;
}

export interface LowStockAlert {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  variant_name?: string;
  size_name?: string;
  available_stock: number;
  low_stock_threshold: number;
  stock_needed: number;
  updated_at: string;
}

export interface InventoryAnalytics {
  total_items: number;
  active_items: number;
  total_available_stock: number;
  total_reserved_stock: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_value: number;
}

export interface InventoryChange {
  id: string;
  action_type: string;
  product_id: string;
  change_amount: number;
  reason: string;
  created_at: string;
}

export interface ProductStockSummary {
  totalStock: number;
  reservedStock: number;
  availableStock: number;
}

// Cart-related functions (simplified - no stock checking during cart operations)
export const showCartCleanupNotification = (removedItems: any[], errors: string[]) => {
  console.log('Cart cleanup notification:', { removedItems, errors });
  if (removedItems.length > 0) {
    toast({
      title: "Cart Updated",
      description: `${removedItems.length} invalid item(s) removed from cart`,
      variant: "destructive",
    });
  }
};

export const validateCartItems = async (cartItems: any[]) => {
  const validItems = [];
  const removedItems = [];
  const errors = [];

  for (const item of cartItems) {
    try {
      // Only check if product still exists and is active (no stock checking)
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, status')
        .eq('id', item.productId)
        .single();

      if (productError || !product || product.status !== 'active') {
        removedItems.push(item);
        errors.push(`Product ${item.productName} is no longer available`);
        continue;
      }

      validItems.push(item);
    } catch (error) {
      console.error('Error validating cart item:', error);
      removedItems.push(item);
      errors.push(`Error validating ${item.productName}`);
    }
  }

  return { validItems, removedItems, errors };
};

export const getVariantStockInfo = async (productId: string, productInventoryId?: string | null) => {
  try {
    if (productInventoryId) {
      const { data, error } = await supabase
        .from('product_inventory')
        .select('available_stock, is_active')
        .eq('id', productInventoryId)
        .single();

      if (error || !data) {
        return { 
          isValid: false, 
          availableStock: 0,
          stockAmount: 0,
          errorMessage: 'Inventory item not found'
        };
      }

      return {
        isValid: data.is_active,
        availableStock: data.available_stock,
        stockAmount: data.available_stock,
        errorMessage: data.is_active ? undefined : 'Item is inactive'
      };
    }

    // If no specific inventory ID, get total available stock for product
    const { data: inventoryItems, error } = await supabase
      .from('product_inventory')
      .select('available_stock')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) {
      return { 
        isValid: false, 
        availableStock: 0,
        stockAmount: 0,
        errorMessage: 'Error fetching inventory'
      };
    }

    const totalAvailable = inventoryItems?.reduce((sum, item) => sum + item.available_stock, 0) || 0;
    
    return {
      isValid: true,
      availableStock: totalAvailable,
      stockAmount: totalAvailable
    };
  } catch (error) {
    console.error('Error getting variant stock info:', error);
    return { 
      isValid: false, 
      availableStock: 0,
      stockAmount: 0,
      errorMessage: 'Error checking stock availability'
    };
  }
};

export const validateCartStock = async (cartItems: any[]): Promise<{ isValid: boolean; errors?: string[] }> => {
  // During cart operations, we don't validate stock - only during checkout
  return { isValid: true };
};

export const validateStock = async (productId: string, productInventoryId: string | null, requestedQuantity: number) => {
  return getVariantStockInfo(productId, productInventoryId);
};

// Product stock calculation functions
export const calculateTotalProductStock = async (productId: string): Promise<number> => {
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

    return inventoryItems?.reduce((sum, item) => sum + item.available_stock, 0) || 0;
  } catch (error) {
    console.error('Error calculating total product stock:', error);
    return 0;
  }
};

export const getRealTimeStock = async (productId: string, colorVariantId?: string, sizeVariantId?: string): Promise<number> => {
  try {
    let query = supabase
      .from('product_inventory')
      .select('available_stock')
      .eq('product_id', productId)
      .eq('is_active', true);

    // Add color variant filter if provided
    if (colorVariantId) {
      query = query.eq('color_variant_id', colorVariantId);
    } else {
      query = query.is('color_variant_id', null);
    }

    // Add size variant filter if provided
    if (sizeVariantId) {
      query = query.eq('size_variant_id', sizeVariantId);
    } else {
      query = query.is('size_variant_id', null);
    }

    const { data: inventoryItems, error } = await query;

    if (error) {
      console.error('Error calculating real-time stock:', error);
      return 0;
    }

    return inventoryItems?.reduce((sum, item) => sum + (item.available_stock || 0), 0) || 0;
  } catch (error) {
    console.error('Error calculating real-time stock:', error);
    return 0;
  }
};

// Core inventory management functions using Supabase functions
export const generateProductSKU = async (productName: string, colorName?: string, sizeName?: string): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_product_sku', {
      p_product_name: productName,
      p_color_name: colorName || null,
      p_size_name: sizeName || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error generating SKU:', error);
    // Fallback SKU generation
    let baseSku = productName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    if (colorName) baseSku += '-' + colorName.toUpperCase().substring(0, 3);
    if (sizeName) baseSku += '-' + sizeName.toUpperCase().substring(0, 2);
    return baseSku + '-' + Date.now().toString().slice(-4);
  }
};

export const createInventoryItem = async (data: CreateInventoryItemData): Promise<InventoryItem> => {
  const { data: result, error } = await supabase
    .from('product_inventory')
    .insert({
      product_id: data.product_id,
      sku: data.sku,
      color_variant_id: data.color_variant_id || null,
      size_variant_id: data.size_variant_id || null,
      product_name: data.product_name,
      color_name: data.color_name || null,
      size_name: data.size_name || null,
      size_code: data.size_code || null,
      stock_quantity: data.stock_quantity,
      reserved_stock: data.reserved_stock,
      available_stock: data.available_stock,
      low_stock_threshold: data.low_stock_threshold,
      cost_price: data.cost_price,
      selling_price: data.selling_price,
      is_active: data.is_active
    })
    .select()
    .single();

  if (error) throw error;
  return result as InventoryItem;
};

export const updateInventoryItem = async (id: string, data: Partial<CreateInventoryItemData>): Promise<void> => {
  const { error } = await supabase
    .from('product_inventory')
    .update(data)
    .eq('id', id);

  if (error) throw error;
};

export const getProductInventory = async (productId: string): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as InventoryItem[];
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as InventoryItem[];
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('product_inventory')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getInventorySummary = async (): Promise<InventorySummary> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('stock_quantity, available_stock, cost_price, low_stock_threshold');

  if (error) throw error;

  const summary = data.reduce((acc, item) => {
    acc.totalProducts += 1;
    if (item.available_stock <= (item.low_stock_threshold || 10)) {
      acc.lowStockItems += 1;
    }
    if (item.available_stock === 0) {
      acc.outOfStockItems += 1;
    }
    acc.totalValue += (item.cost_price || 0) * item.stock_quantity;
    return acc;
  }, {
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0
  });

  return summary;
};

export const getProductStockSummary = async (productId: string): Promise<ProductStockSummary> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('stock_quantity, reserved_stock, available_stock')
    .eq('product_id', productId);

  if (error) throw error;

  return data.reduce((acc, item) => ({
    totalStock: acc.totalStock + item.stock_quantity,
    reservedStock: acc.reservedStock + item.reserved_stock,
    availableStock: acc.availableStock + item.available_stock
  }), {
    totalStock: 0,
    reservedStock: 0,
    availableStock: 0
  });
};

export const getInventoryOverview = async (): Promise<InventoryOverview[]> => {
  const { data, error } = await supabase
    .from('inventory_overview')
    .select('*')
    .order('product_name', { ascending: true });

  if (error) throw error;
  return data.map(item => ({
    id: item.id || '',
    product_name: item.product_name || '',
    sku: item.product_sku || '',
    product_sku: item.product_sku || '',
    stock_quantity: item.stock_quantity || 0,
    reserved_stock: item.reserved_stock || 0,
    available_stock: item.available_stock || 0,
    category_name: item.category_name || '',
    subcategory_name: item.subcategory_name || '',
    variant_name: item.variant_name,
    size_name: item.size_name,
    stock_status: item.stock_status || 'Unknown'
  }));
};

export const getLowStockAlerts = async (): Promise<LowStockAlert[]> => {
  const { data, error } = await supabase
    .from('low_stock_alerts')
    .select('*')
    .order('available_stock', { ascending: true });

  if (error) throw error;
  
  return data.map(item => ({
    id: item.id || '',
    product_id: item.id || '',
    product_name: item.product_name || '',
    product_sku: item.product_sku || '',
    variant_name: item.variant_name,
    size_name: item.size_name,
    available_stock: item.available_stock || 0,
    low_stock_threshold: item.low_stock_threshold || 10,
    stock_needed: Math.max(0, (item.low_stock_threshold || 10) - (item.available_stock || 0)),
    updated_at: new Date().toISOString()
  }));
};

export const getInventoryAnalytics = async (): Promise<InventoryAnalytics> => {
  try {
    const { data, error } = await supabase.rpc('get_detailed_inventory_analytics');

    if (error) throw error;

    // Convert the result to the expected format
    const analytics = data.reduce((acc: any, metric: any) => {
      switch (metric.metric_name) {
        case 'total_products':
          acc.total_items = metric.metric_value;
          break;
        case 'active_products':
          acc.active_items = metric.metric_value;
          break;
        case 'low_stock_items':
          acc.low_stock_items = metric.metric_value;
          break;
        case 'out_of_stock_items':
          acc.out_of_stock_items = metric.metric_value;
          break;
        case 'total_stock_value':
          acc.total_stock_value = metric.metric_value;
          break;
        case 'total_available_value':
          acc.total_available_stock = metric.metric_value;
          break;
        case 'total_reserved_value':
          acc.total_reserved_stock = metric.metric_value;
          break;
      }
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
    console.error('Error getting inventory analytics:', error);
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
};

export const getInventoryHistory = async (productId?: string, daysBack: number = 30): Promise<InventoryChange[]> => {
  try {
    const { data, error } = await supabase.rpc('get_inventory_history', {
      p_product_id: productId || null,
      p_days_back: daysBack
    });

    if (error) throw error;
    
    return data.map((item: any) => ({
      id: item.product_id || '',
      action_type: item.action_type || '',
      product_id: item.product_id || '',
      change_amount: item.change_amount || 0,
      reason: item.reason || '',
      created_at: item.created_at || ''
    }));
  } catch (error) {
    console.error('Error getting inventory history:', error);
    return [];
  }
};

export const updateStock = async (
  productId: string,
  stockChange: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  reservationChange: number = 0,
  reason: string = 'Manual update',
  categoryId?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('safe_update_stock', {
      p_product_id: productId,
      p_stock_change: stockChange,
      p_color_variant_id: colorVariantId || null,
      p_size_variant_id: sizeVariantId || null,
      p_reservation_change: reservationChange,
      p_reason: reason
    });

    if (error) {
      console.error('Error updating stock:', error);
      return false;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating stock:', error);
    return false;
  }
};

export const reserveStock = async (productId: string, quantity: number): Promise<boolean> => {
  return updateStock(productId, 0, undefined, undefined, quantity, 'Stock reservation');
};

export const releaseStock = async (productId: string, quantity: number): Promise<boolean> => {
  return updateStock(productId, 0, undefined, undefined, -quantity, 'Stock release');
};

export const deductStock = async (productId: string, quantity: number): Promise<boolean> => {
  return updateStock(productId, -quantity, undefined, undefined, 0, 'Stock deduction');
};

export const restoreStock = async (productId: string, quantity: number): Promise<boolean> => {
  return updateStock(productId, quantity, undefined, undefined, 0, 'Stock restoration');
};

export const bulkUpdateStock = async (updates: any[]): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.rpc('bulk_update_inventory', {
      p_updates: updates
    });

    if (error) throw error;
    
    return {
      success: data?.[0]?.success_count > 0,
      message: `Updated ${data?.[0]?.success_count || 0} items, ${data?.[0]?.error_count || 0} errors`
    };
  } catch (error) {
    console.error('Bulk update error:', error);
    return { success: false, message: 'Bulk update failed' };
  }
};

export const setLowStockThreshold = async (inventoryId: string, threshold: number): Promise<boolean> => {
  const { error } = await supabase
    .from('product_inventory')
    .update({ low_stock_threshold: threshold })
    .eq('id', inventoryId);

  if (error) {
    console.error('Error setting threshold:', error);
    return false;
  }
  
  return true;
};

export const searchInventory = async (query: string, filters?: { categoryId?: string }): Promise<InventoryItem[]> => {
  let queryBuilder = supabase
    .from('product_inventory')
    .select('*')
    .or(`product_name.ilike.%${query}%,sku.ilike.%${query}%,color_name.ilike.%${query}%,size_name.ilike.%${query}%`)
    .order('created_at', { ascending: true });

  if (filters?.categoryId) {
    queryBuilder = queryBuilder.eq('category_id', filters.categoryId);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;
  return data as InventoryItem[];
};

export const useInventoryRealtime = (channelName: string) => {
  const subscribe = (callback: (payload: any) => void) => {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_inventory'
      }, callback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { subscribe };
};

export const syncProductToInventory = async (productId: string): Promise<void> => {
  console.log('Syncing product to inventory:', productId);
  // Implementation for syncing product to inventory - placeholder for now
};
