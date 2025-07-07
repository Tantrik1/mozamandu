
import { supabase } from '@/integrations/supabase/client';

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
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  category_name: string;
  subcategory_name: string;
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

export const generateProductSKU = async (productName: string, colorName?: string, sizeName?: string): Promise<string> => {
  let baseSku = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);

  if (colorName) {
    baseSku += '-' + colorName.toUpperCase().substring(0, 3);
  }

  if (sizeName) {
    baseSku += '-' + sizeName.toUpperCase().substring(0, 2);
  }

  // Check for uniqueness
  let counter = 1;
  let finalSku = baseSku;
  
  while (true) {
    const { data } = await supabase
      .from('product_inventory')
      .select('id')
      .eq('sku', finalSku)
      .maybeSingle();
    
    if (!data) break;
    
    finalSku = `${baseSku}-${counter}`;
    counter++;
  }

  return finalSku;
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

// Additional functions for advanced inventory management
export const getInventoryOverview = async (): Promise<InventoryOverview[]> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(item => ({
    id: item.id,
    product_name: item.product_name,
    sku: item.sku,
    stock_quantity: item.stock_quantity,
    reserved_stock: item.reserved_stock,
    available_stock: item.available_stock,
    category_name: item.category_name || '',
    subcategory_name: item.subcategory_name || ''
  }));
};

export const getLowStockAlerts = async (): Promise<LowStockAlert[]> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('*')
    .lte('available_stock', supabase.rpc('COALESCE', ['low_stock_threshold', 10]))
    .order('available_stock', { ascending: true });

  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.sku,
    variant_name: item.color_name,
    size_name: item.size_name,
    available_stock: item.available_stock,
    low_stock_threshold: item.low_stock_threshold,
    stock_needed: Math.max(0, item.low_stock_threshold - item.available_stock),
    updated_at: item.updated_at
  }));
};

export const getInventoryAnalytics = async (): Promise<InventoryAnalytics> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('*');

  if (error) throw error;

  const analytics = data.reduce((acc, item) => {
    acc.total_items += 1;
    if (item.is_active) acc.active_items += 1;
    acc.total_available_stock += item.available_stock;
    acc.total_reserved_stock += item.reserved_stock;
    if (item.available_stock <= item.low_stock_threshold) acc.low_stock_items += 1;
    if (item.available_stock === 0) acc.out_of_stock_items += 1;
    acc.total_stock_value += (item.cost_price || 0) * item.stock_quantity;
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
};

export const getInventoryHistory = async (): Promise<InventoryChange[]> => {
  const { data, error } = await supabase
    .from('inventory_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    action_type: item.action_type,
    product_id: item.product_id || '',
    change_amount: item.change_amount || 0,
    reason: item.reason || '',
    created_at: item.created_at || ''
  }));
};

export const updateStock = async (
  productId: string,
  stockChange: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  reservationChange: number = 0,
  reason: string = 'Manual update'
): Promise<boolean> => {
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
      success: data.success_count > 0,
      message: `Updated ${data.success_count} items, ${data.error_count} errors`
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

export const searchInventory = async (query: string): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('*')
    .or(`product_name.ilike.%${query}%,sku.ilike.%${query}%,color_name.ilike.%${query}%,size_name.ilike.%${query}%`)
    .order('created_at', { ascending: true });

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
