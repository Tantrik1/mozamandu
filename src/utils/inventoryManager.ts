
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

export interface InventorySummary {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

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

export const syncProductToInventory = async (productId: string): Promise<void> => {
  // Implementation for syncing product to inventory
  console.log('Syncing product to inventory:', productId);
};

export interface ProductStockSummary {
  totalStock: number;
  reservedStock: number;
  availableStock: number;
}

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
