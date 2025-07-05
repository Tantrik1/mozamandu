import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

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

export interface LowStockAlert {
  inventory_id: string;
  product_name: string;
  sku: string;
  color_name?: string | null;
  size_name?: string | null;
  available_stock: number;
  stock_quantity: number;
  reserved_stock: number;
}

export interface InventoryAnalytics {
  total_items: number;
  active_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_value: number;
  total_available_stock: number;
  total_reserved_stock: number;
}

// ============================================================================
// CORE INVENTORY FUNCTIONS
// ============================================================================

/**
 * Get all inventory items for a product
 */
export async function getProductInventory(productId: string): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('color_name')
      .order('size_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching product inventory:', error);
    throw error;
  }
}

/**
 * Get inventory summary for a product
 */
export async function getInventorySummary(productId: string): Promise<InventorySummary> {
  try {
    const { data, error } = await supabase
      .rpc('get_product_inventory_summary', { product_uuid: productId });

    if (error) throw error;
    return data?.[0] || {
      total_stock: 0,
      available_stock: 0,
      reserved_stock: 0,
      variant_count: 0
    };
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    throw error;
  }
}

/**
 * Sync a product to the inventory system
 */
export async function syncProductToInventory(productId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('sync_product_to_inventory', { product_uuid: productId });

    if (error) throw error;
    return data || 'Product synced successfully';
  } catch (error) {
    console.error('Error syncing product to inventory:', error);
    throw error;
  }
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(
  inventoryId: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .update(updates)
      .eq('id', inventoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(inventoryId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .delete()
      .eq('id', inventoryId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}

/**
 * Update stock quantity for an inventory item
 */
export async function updateInventoryStock(
  inventoryId: string,
  stockChange: number,
  operationType: 'adjust' | 'reserve' = 'adjust'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('update_inventory_stock', {
        inventory_id: inventoryId,
        stock_change: stockChange,
        operation_type: operationType
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating inventory stock:', error);
    throw error;
  }
}

// ============================================================================
// INVENTORY MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all inventory items with filtering
 */
export async function getAllInventoryItems(filters?: {
  search?: string;
  category?: string;
  subcategory?: string;
  stockStatus?: 'all' | 'in-stock' | 'low' | 'out';
  status?: 'all' | 'active' | 'inactive';
}): Promise<InventoryItem[]> {
  try {
    let query = supabase
      .from('product_inventory')
      .select(`
        *,
        product:products(
          name,
          category:categories(name),
          subcategory:subcategories(name)
        )
      `)
      .order('product_name')
      .order('color_name')
      .order('size_name');

    // Apply filters
    if (filters?.status === 'active') {
      query = query.eq('is_active', true);
    } else if (filters?.status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filteredData = data || [];

    // Apply client-side filters
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredData = filteredData.filter(item =>
        item.product_name.toLowerCase().includes(searchTerm) ||
        item.sku.toLowerCase().includes(searchTerm) ||
        (item.color_name && item.color_name.toLowerCase().includes(searchTerm)) ||
        (item.size_name && item.size_name.toLowerCase().includes(searchTerm))
      );
    }

    if (filters?.category) {
      filteredData = filteredData.filter(item =>
        item.product?.category?.name === filters.category
      );
    }

    if (filters?.subcategory) {
      filteredData = filteredData.filter(item =>
        item.product?.subcategory?.name === filters.subcategory
      );
    }

    if (filters?.stockStatus && filters.stockStatus !== 'all') {
      switch (filters.stockStatus) {
        case 'low':
          filteredData = filteredData.filter(item =>
            item.available_stock > 0 && item.available_stock <= 10
          );
          break;
        case 'out':
          filteredData = filteredData.filter(item => item.available_stock === 0);
          break;
        case 'in-stock':
          filteredData = filteredData.filter(item => item.available_stock > 0);
          break;
      }
    }

    return filteredData;
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
}

/**
 * Get low stock alerts
 */
export async function getLowStockAlerts(threshold: number = 10): Promise<LowStockAlert[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_low_stock_alerts', { threshold });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    throw error;
  }
}

/**
 * Get inventory analytics
 */
export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
  try {
    const { data, error } = await supabase
      .rpc('get_inventory_analytics');

    if (error) throw error;
    return data?.[0] || {
      total_items: 0,
      active_items: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      total_stock_value: 0,
      total_available_stock: 0,
      total_reserved_stock: 0
    };
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    throw error;
  }
}

// ============================================================================
// STOCK VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a product variant has sufficient stock
 */
export async function checkStockAvailability(
  productId: string,
  colorVariantId?: string,
  sizeVariantId?: string,
  quantity: number = 1
): Promise<{ available: boolean; availableStock: number; inventoryId?: string }> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('id, available_stock')
      .eq('product_id', productId)
      .eq('is_active', true)
      .eq('color_variant_id', colorVariantId || null)
      .eq('size_variant_id', sizeVariantId || null)
      .single();

    if (error) throw error;

    if (!data) {
      return { available: false, availableStock: 0 };
    }

    return {
      available: data.available_stock >= quantity,
      availableStock: data.available_stock,
      inventoryId: data.id
    };
  } catch (error) {
    console.error('Error checking stock availability:', error);
    return { available: false, availableStock: 0 };
  }
}

/**
 * Reserve stock for an order
 */
export async function reserveStock(
  inventoryId: string,
  quantity: number
): Promise<boolean> {
  try {
    return await updateInventoryStock(inventoryId, quantity, 'reserve');
  } catch (error) {
    console.error('Error reserving stock:', error);
    throw error;
  }
}

/**
 * Release reserved stock
 */
export async function releaseReservedStock(
  inventoryId: string,
  quantity: number
): Promise<boolean> {
  try {
    return await updateInventoryStock(inventoryId, -quantity, 'reserve');
  } catch (error) {
    console.error('Error releasing reserved stock:', error);
    throw error;
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to inventory changes for real-time updates
 */
export function subscribeToInventoryChanges(
  productId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`inventory-${productId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_inventory',
        filter: `product_id=eq.${productId}`
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to all inventory changes
 */
export function subscribeToAllInventoryChanges(
  callback: (payload: any) => void
) {
  return supabase
    .channel('inventory-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_inventory'
      },
      callback
    )
    .subscribe();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get stock status for display
 */
export function getStockStatus(availableStock: number) {
  if (availableStock === 0) {
    return { status: 'out', label: 'Out of Stock', color: 'destructive' };
  }
  if (availableStock <= 10) {
    return { status: 'low', label: 'Low Stock', color: 'secondary' };
  }
  return { status: 'in-stock', label: 'In Stock', color: 'default' };
}

/**
 * Format SKU for display
 */
export function formatSKU(sku: string): string {
  return sku.toUpperCase().replace(/_/g, '-');
}

/**
 * Calculate total value of inventory
 */
export function calculateInventoryValue(items: InventoryItem[]): number {
  return items.reduce((total, item) => {
    const costPrice = item.cost_price || 0;
    return total + (item.stock_quantity * costPrice);
  }, 0);
}

/**
 * Get variant display name
 */
export function getVariantDisplayName(item: InventoryItem): string {
  const parts = [];
  if (item.color_name) parts.push(item.color_name);
  if (item.size_name) parts.push(item.size_name);
  return parts.length > 0 ? parts.join(' - ') : 'Base Product';
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk update inventory items
 */
export async function bulkUpdateInventory(
  updates: Array<{ id: string; updates: Partial<InventoryItem> }>
): Promise<InventoryItem[]> {
  try {
    const promises = updates.map(({ id, updates }) =>
      updateInventoryItem(id, updates)
    );

    return await Promise.all(promises);
  } catch (error) {
    console.error('Error bulk updating inventory:', error);
    throw error;
  }
}

/**
 * Export inventory data
 */
export async function exportInventoryData(): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select(`
        *,
        product:products(
          name,
          category:categories(name),
          subcategory:subcategories(name)
        )
      `)
      .order('product_name')
      .order('color_name')
      .order('size_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error exporting inventory data:', error);
    throw error;
  }
}

// ============================================================================
// PRODUCT CREATION FUNCTIONS
// ============================================================================

/**
 * Create inventory items for a newly created product
 */
export async function createInventoryForProduct(
  productId: string,
  productName: string,
  costPrice: number,
  sellingPrice?: number
): Promise<void> {
  try {
    // First, get the product details to check if it has variants
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    if (!product.has_color_variants) {
      // Simple product without variants - create single inventory item
      const sku = await generateProductSKU(productName);

      await supabase
        .from('product_inventory')
        .insert({
          product_id: productId,
          sku,
          product_name: productName,
          stock_quantity: 0, // Start with 0 stock
          cost_price: costPrice,
          selling_price: sellingPrice || costPrice,
          is_active: true
        });
    } else {
      // Product has color variants - create inventory items for each variant
      const { data: colorVariants, error: colorError } = await supabase
        .from('color_variants')
        .select(`
          id,
          color_name,
          has_sizes,
          size_variants (
            id,
            size_name,
            size_code
          )
        `)
        .eq('product_id', productId);

      if (colorError) throw colorError;

      for (const colorVariant of colorVariants || []) {
        if (!colorVariant.has_sizes) {
          // Color variant without sizes
          const sku = await generateProductSKU(productName, colorVariant.color_name);

          await supabase
            .from('product_inventory')
            .insert({
              product_id: productId,
              color_variant_id: colorVariant.id,
              sku,
              product_name: productName,
              color_name: colorVariant.color_name,
              stock_quantity: 0,
              cost_price: costPrice,
              selling_price: sellingPrice || costPrice,
              is_active: true
            });
        } else {
          // Color variant with sizes
          for (const sizeVariant of colorVariant.size_variants || []) {
            const sku = await generateProductSKU(productName, colorVariant.color_name, sizeVariant.size_name);

            await supabase
              .from('product_inventory')
              .insert({
                product_id: productId,
                color_variant_id: colorVariant.id,
                size_variant_id: sizeVariant.id,
                sku,
                product_name: productName,
                color_name: colorVariant.color_name,
                size_name: sizeVariant.size_name,
                size_code: sizeVariant.size_code,
                stock_quantity: 0,
                cost_price: costPrice,
                selling_price: sellingPrice || costPrice,
                is_active: true
              });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error creating inventory for product:', error);
    throw error;
  }
}

/**
 * Generate a unique SKU for a product
 */
async function generateProductSKU(
  productName: string,
  colorName?: string,
  sizeName?: string
): Promise<string> {
  try {
    // Create base SKU
    let baseSKU = productName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Add color if present
    if (colorName) {
      const colorCode = colorName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      baseSKU += `_${colorCode}`;
    }

    // Add size if present
    if (sizeName) {
      const sizeCode = sizeName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      baseSKU += `_${sizeCode}`;
    }

    // Check if SKU already exists and add counter if needed
    let finalSKU = baseSKU;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from('product_inventory')
        .select('id')
        .eq('sku', finalSKU)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned - SKU is unique
        break;
      }

      if (error) throw error;

      // SKU exists, try with counter
      finalSKU = `${baseSKU}_${counter}`;
      counter++;
    }

    return finalSKU;
  } catch (error) {
    console.error('Error generating SKU:', error);
    // Fallback to timestamp-based SKU
    return `SKU_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
}
