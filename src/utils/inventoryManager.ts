
import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  color_variant_id?: string | null;
  size_variant_id?: string | null;
  product_name: string;
  color_name?: string | null;
  size_name?: string | null;
  size_code?: string | null;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  cost_price?: number | null;
  selling_price?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventorySummary {
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  variant_count: number;
}

export async function getProductInventory(productId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('product_inventory')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('color_name', { ascending: true })
    .order('size_name', { ascending: true });

  if (error) {
    console.error('Error fetching product inventory:', error);
    throw error;
  }

  return data || [];
}

export async function getInventorySummary(productId: string): Promise<InventorySummary> {
  const { data, error } = await supabase
    .rpc('get_product_inventory_summary', { product_uuid: productId });

  if (error) {
    console.error('Error fetching inventory summary:', error);
    throw error;
  }

  return data?.[0] || { total_stock: 0, available_stock: 0, reserved_stock: 0, variant_count: 0 };
}

export async function syncProductToInventory(productId: string): Promise<void> {
  console.log('Syncing product to inventory:', productId);
  
  try {
    const { data, error } = await supabase
      .rpc('migrate_to_product_inventory');

    if (error) {
      console.error('Error syncing to inventory:', error);
      throw error;
    }

    console.log('Inventory sync result:', data);
  } catch (error) {
    console.error('Error in syncProductToInventory:', error);
    throw error;
  }
}

export async function updateInventoryStock(
  inventoryId: string, 
  stockChange: number, 
  operationType: 'adjust' | 'reserve' = 'adjust'
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('update_inventory_stock', {
      inventory_id: inventoryId,
      stock_change: stockChange,
      operation_type: operationType
    });

  if (error) {
    console.error('Error updating inventory stock:', error);
    throw error;
  }

  return data || false;
}

export async function createInventoryItem(item: {
  product_id: string;
  color_variant_id?: string | null;
  size_variant_id?: string | null;
  product_name: string;
  color_name?: string | null;
  size_name?: string | null;
  size_code?: string | null;
  stock_quantity: number;
  cost_price?: number | null;
  selling_price?: number | null;
}): Promise<InventoryItem> {
  // Generate SKU
  const { data: skuData, error: skuError } = await supabase
    .rpc('generate_product_sku', {
      p_product_name: item.product_name,
      p_color_name: item.color_name,
      p_size_name: item.size_name
    });

  if (skuError) {
    console.error('Error generating SKU:', skuError);
    throw skuError;
  }

  const { data, error } = await supabase
    .from('product_inventory')
    .insert({
      ...item,
      sku: skuData
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }

  return data;
}

export async function deleteInventoryItem(inventoryId: string): Promise<void> {
  const { error } = await supabase
    .from('product_inventory')
    .delete()
    .eq('id', inventoryId);

  if (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}
