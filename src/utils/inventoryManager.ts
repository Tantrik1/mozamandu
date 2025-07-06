import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Types for inventory management
export interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  color_name?: string | null;
  size_name?: string | null;
  size_code?: string | null;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  cost_price?: number | null;
  selling_price?: number | null;
  low_stock_threshold?: number | null;
  is_active: boolean;
  category_id?: string | null;
  subcategory_id?: string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  color_variant_id?: string | null;
  size_variant_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InventorySummary {
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  variant_count: number;
}

export interface StockValidationResult {
  isValid: boolean;
  availableStock: number;
  errorMessage?: string;
}

export interface CartStockValidationResult {
  isValid: boolean;
  errorMessages: string[];
  invalidItems: any[];
}

// Core inventory functions
export async function getProductInventory(productId: string): Promise<InventoryItem[]> {
  try {
    console.log('📦 Fetching inventory for product:', productId);
    
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('color_name', { ascending: true })
      .order('size_name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching product inventory:', error);
      throw error;
    }

    console.log('✅ Product inventory loaded:', data?.length || 0, 'items');
    return data || [];
  } catch (error) {
    console.error('❌ Error in getProductInventory:', error);
    throw error;
  }
}

export async function getInventorySummary(productId: string): Promise<InventorySummary> {
  try {
    const inventory = await getProductInventory(productId);
    
    const summary = inventory.reduce(
      (acc, item) => ({
        total_stock: acc.total_stock + item.stock_quantity,
        available_stock: acc.available_stock + item.available_stock,
        reserved_stock: acc.reserved_stock + item.reserved_stock,
        variant_count: acc.variant_count + 1,
      }),
      { total_stock: 0, available_stock: 0, reserved_stock: 0, variant_count: 0 }
    );

    return summary;
  } catch (error) {
    console.error('❌ Error calculating inventory summary:', error);
    return { total_stock: 0, available_stock: 0, reserved_stock: 0, variant_count: 0 };
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
    console.log('🔄 Getting real-time stock for:', { productId, productInventoryId });

    let query = supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock, is_active')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (productInventoryId) {
      query = query.eq('id', productInventoryId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('❌ Error getting real-time stock:', error);
      return null;
    }

    console.log('✅ Real-time stock retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in getRealTimeStock:', error);
    return null;
  }
}

export async function getVariantStockInfo(
  productId: string,
  productInventoryId?: string | null
): Promise<StockValidationResult> {
  try {
    console.log('🔍 Validating stock for:', { productId, productInventoryId });

    const stockData = await getRealTimeStock(productId, productInventoryId);

    if (!stockData) {
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: 'Product variant not found in inventory'
      };
    }

    if (!stockData.is_active) {
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: 'Product variant is not active'
      };
    }

    return {
      isValid: true,
      availableStock: stockData.available_stock
    };
  } catch (error) {
    console.error('❌ Error in getVariantStockInfo:', error);
    return {
      isValid: false,
      availableStock: 0,
      errorMessage: 'Error validating stock'
    };
  }
}

export async function validateStock(
  productId: string,
  productInventoryId: string | null = null,
  requestedQuantity: number
): Promise<StockValidationResult> {
  try {
    console.log('🔍 Validating stock request:', { productId, productInventoryId, requestedQuantity });

    const stockInfo = await getVariantStockInfo(productId, productInventoryId);

    if (!stockInfo.isValid) {
      return stockInfo;
    }

    if (stockInfo.availableStock < requestedQuantity) {
      return {
        isValid: false,
        availableStock: stockInfo.availableStock,
        errorMessage: `Only ${stockInfo.availableStock} units available, requested ${requestedQuantity}`
      };
    }

    return {
      isValid: true,
      availableStock: stockInfo.availableStock
    };
  } catch (error) {
    console.error('❌ Error validating stock:', error);
    return {
      isValid: false,
      availableStock: 0,
      errorMessage: 'Error validating stock availability'
    };
  }
}

export async function validateCartStock(cartItems: any[]): Promise<CartStockValidationResult> {
  try {
    console.log('🛒 Validating cart stock for', cartItems.length, 'items');

    const errorMessages: string[] = [];
    const invalidItems: any[] = [];

    for (const item of cartItems) {
      const validation = await validateStock(
        item.productId,
        item.productInventoryId,
        item.quantity
      );

      if (!validation.isValid) {
        errorMessages.push(`${item.productName}: ${validation.errorMessage}`);
        invalidItems.push({
          ...item,
          stockError: validation.errorMessage,
          availableStock: validation.availableStock
        });
      }
    }

    return {
      isValid: invalidItems.length === 0,
      errorMessages,
      invalidItems
    };
  } catch (error) {
    console.error('❌ Error validating cart stock:', error);
    return {
      isValid: false,
      errorMessages: ['Error validating cart stock'],
      invalidItems: []
    };
  }
}

// Stock operation functions
export async function reserveStock(
  productInventoryId: string,
  quantity: number,
  orderId?: string
): Promise<boolean> {
  try {
    console.log('🔒 Reserving stock:', { productInventoryId, quantity, orderId });

    // Get current stock info
    const { data: currentStock, error: fetchError } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock')
      .eq('id', productInventoryId)
      .single();

    if (fetchError || !currentStock) {
      console.error('❌ Error fetching current stock:', fetchError);
      return false;
    }

    // Check if we have enough available stock
    if (currentStock.available_stock < quantity) {
      console.error('❌ Insufficient stock for reservation:', {
        available: currentStock.available_stock,
        requested: quantity
      });
      return false;
    }

    // Update reserved stock
    const newReservedStock = currentStock.reserved_stock + quantity;
    const newAvailableStock = currentStock.stock_quantity - newReservedStock;

    const { error: updateError } = await supabase
      .from('product_inventory')
      .update({
        reserved_stock: newReservedStock,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (updateError) {
      console.error('❌ Error updating reserved stock:', updateError);
      return false;
    }

    console.log('✅ Stock reserved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in reserveStock:', error);
    return false;
  }
}

export async function releaseStock(
  productInventoryId: string,
  quantity: number,
  reason: string = 'Stock released'
): Promise<boolean> {
  try {
    console.log('🔓 Releasing stock:', { productInventoryId, quantity, reason });

    // Get current stock info
    const { data: currentStock, error: fetchError } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock')
      .eq('id', productInventoryId)
      .single();

    if (fetchError || !currentStock) {
      console.error('❌ Error fetching current stock:', fetchError);
      return false;
    }

    // Calculate new values
    const newReservedStock = Math.max(0, currentStock.reserved_stock - quantity);
    const newAvailableStock = currentStock.stock_quantity - newReservedStock;

    const { error: updateError } = await supabase
      .from('product_inventory')
      .update({
        reserved_stock: newReservedStock,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (updateError) {
      console.error('❌ Error releasing stock:', updateError);
      return false;
    }

    console.log('✅ Stock released successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in releaseStock:', error);
    return false;
  }
}

export async function deductStock(
  productInventoryId: string,
  quantity: number,
  reason: string = 'Stock deducted'
): Promise<boolean> {
  try {
    console.log('➖ Deducting stock:', { productInventoryId, quantity, reason });

    // Get current stock info
    const { data: currentStock, error: fetchError } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock')
      .eq('id', productInventoryId)
      .single();

    if (fetchError || !currentStock) {
      console.error('❌ Error fetching current stock:', fetchError);
      return false;
    }

    // Calculate new values - deduct from both total and reserved stock
    const newStockQuantity = Math.max(0, currentStock.stock_quantity - quantity);
    const newReservedStock = Math.max(0, currentStock.reserved_stock - quantity);
    const newAvailableStock = newStockQuantity - newReservedStock;

    const { error: updateError } = await supabase
      .from('product_inventory')
      .update({
        stock_quantity: newStockQuantity,
        reserved_stock: newReservedStock,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (updateError) {
      console.error('❌ Error deducting stock:', updateError);
      return false;
    }

    console.log('✅ Stock deducted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in deductStock:', error);
    return false;
  }
}

export async function addStock(
  productInventoryId: string,
  quantity: number,
  reason: string = 'Stock added'
): Promise<boolean> {
  try {
    console.log('➕ Adding stock:', { productInventoryId, quantity, reason });

    // Get current stock info
    const { data: currentStock, error: fetchError } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock')
      .eq('id', productInventoryId)
      .single();

    if (fetchError || !currentStock) {
      console.error('❌ Error fetching current stock:', fetchError);
      return false;
    }

    // Calculate new values
    const newStockQuantity = currentStock.stock_quantity + quantity;
    const newAvailableStock = newStockQuantity - currentStock.reserved_stock;

    const { error: updateError } = await supabase
      .from('product_inventory')
      .update({
        stock_quantity: newStockQuantity,
        available_stock: newAvailableStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', productInventoryId);

    if (updateError) {
      console.error('❌ Error adding stock:', updateError);
      return false;
    }

    console.log('✅ Stock added successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in addStock:', error);
    return false;
  }
}

// Checkout processing functions
export async function processCheckoutStock(cartItems: any[], orderId: string): Promise<boolean> {
  try {
    console.log('🛍️ Processing checkout stock for order:', orderId);
    console.log('Cart items:', cartItems);

    // First validate all items have sufficient stock
    const validation = await validateCartStock(cartItems);
    if (!validation.isValid) {
      console.error('❌ Cart validation failed:', validation.errorMessages);
      return false;
    }

    // Reserve stock for each item
    for (const item of cartItems) {
      if (!item.productInventoryId) {
        console.error('❌ Missing productInventoryId for item:', item);
        continue;
      }

      const success = await reserveStock(
        item.productInventoryId,
        item.quantity,
        orderId
      );

      if (!success) {
        console.error('❌ Failed to reserve stock for item:', item);
        // Rollback previous reservations
        await rollbackStockReservations(cartItems, orderId);
        return false;
      }
    }

    console.log('✅ All stock reserved successfully for order:', orderId);
    return true;
  } catch (error) {
    console.error('❌ Error processing checkout stock:', error);
    return false;
  }
}

export async function rollbackStockReservations(cartItems: any[], orderId: string): Promise<void> {
  try {
    console.log('🔄 Rolling back stock reservations for order:', orderId);

    for (const item of cartItems) {
      if (item.productInventoryId) {
        await releaseStock(
          item.productInventoryId,
          item.quantity,
          `Rollback for order ${orderId}`
        );
      }
    }

    console.log('✅ Stock reservations rolled back');
  } catch (error) {
    console.error('❌ Error rolling back stock reservations:', error);
  }
}

// Order status change handlers
export async function handleOrderStatusUpdate(
  orderId: string,
  oldStatus: string,
  newStatus: string,
  orderItems: any[]
): Promise<boolean> {
  try {
    console.log('📋 Handling order status update:', { orderId, oldStatus, newStatus });

    switch (newStatus) {
      case 'confirmed':
        // Order confirmed - keep stock reserved
        console.log('Order confirmed - stock remains reserved');
        return true;

      case 'processing':
        // Order being processed - keep stock reserved
        console.log('Order processing - stock remains reserved');
        return true;

      case 'shipped':
      case 'delivered':
        // Order shipped/delivered - deduct stock from inventory
        return await finalizeStockDeduction(orderItems, orderId);

      case 'cancelled':
        // Order cancelled - release reserved stock
        return await releaseOrderStock(orderItems, orderId);

      case 'refunded':
        // Order refunded - add stock back if it was deducted
        if (oldStatus === 'delivered' || oldStatus === 'shipped') {
          return await restoreOrderStock(orderItems, orderId);
        }
        return await releaseOrderStock(orderItems, orderId);

      default:
        console.log('No stock action needed for status:', newStatus);
        return true;
    }
  } catch (error) {
    console.error('❌ Error handling order status update:', error);
    return false;
  }
}

async function finalizeStockDeduction(orderItems: any[], orderId: string): Promise<boolean> {
  try {
    console.log('✂️ Finalizing stock deduction for order:', orderId);

    for (const item of orderItems) {
      if (item.product_inventory_id) {
        const success = await deductStock(
          item.product_inventory_id,
          item.quantity,
          `Order delivered: ${orderId}`
        );

        if (!success) {
          console.error('❌ Failed to deduct stock for item:', item);
          return false;
        }
      }
    }

    console.log('✅ Stock deducted for delivered order');
    return true;
  } catch (error) {
    console.error('❌ Error finalizing stock deduction:', error);
    return false;
  }
}

async function releaseOrderStock(orderItems: any[], orderId: string): Promise<boolean> {
  try {
    console.log('🔓 Releasing stock for cancelled order:', orderId);

    for (const item of orderItems) {
      if (item.product_inventory_id) {
        const success = await releaseStock(
          item.product_inventory_id,
          item.quantity,
          `Order cancelled: ${orderId}`
        );

        if (!success) {
          console.error('❌ Failed to release stock for item:', item);
          return false;
        }
      }
    }

    console.log('✅ Stock released for cancelled order');
    return true;
  } catch (error) {
    console.error('❌ Error releasing order stock:', error);
    return false;
  }
}

async function restoreOrderStock(orderItems: any[], orderId: string): Promise<boolean> {
  try {
    console.log('🔄 Restoring stock for refunded order:', orderId);

    for (const item of orderItems) {
      if (item.product_inventory_id) {
        const success = await addStock(
          item.product_inventory_id,
          item.quantity,
          `Order refunded: ${orderId}`
        );

        if (!success) {
          console.error('❌ Failed to restore stock for item:', item);
          return false;
        }
      }
    }

    console.log('✅ Stock restored for refunded order');
    return true;
  } catch (error) {
    console.error('❌ Error restoring order stock:', error);
    return false;
  }
}

// Administrative functions
export async function syncProductToInventory(productId: string): Promise<boolean> {
  try {
    console.log('🔄 Syncing product to inventory:', productId);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        color_variants (
          id,
          color_name,
          has_sizes,
          size_variants (
            id,
            size_name,
            size_code
          )
        )
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('❌ Product not found:', productError);
      return false;
    }

    // Check if product has variants
    if (product.has_color_variants && product.color_variants?.length > 0) {
      // Handle color variants
      for (const colorVariant of product.color_variants) {
        if (colorVariant.has_sizes && colorVariant.size_variants?.length > 0) {
          // Handle size variants within color variants
          for (const sizeVariant of colorVariant.size_variants) {
            await createOrUpdateInventoryItem({
              product_id: productId,
              product_name: product.name,
              color_variant_id: colorVariant.id,
              color_name: colorVariant.color_name,
              size_variant_id: sizeVariant.id,
              size_name: sizeVariant.size_name,
              size_code: sizeVariant.size_code,
              stock_quantity: 0,
              cost_price: product.cost_price,
              selling_price: product.selling_price,
              category_id: product.category_id,
              subcategory_id: product.subcategory_id
            });
          }
        } else {
          // Color variant without sizes
          await createOrUpdateInventoryItem({
            product_id: productId,
            product_name: product.name,
            color_variant_id: colorVariant.id,
            color_name: colorVariant.color_name,
            size_variant_id: null,
            size_name: null,
            size_code: null,
            stock_quantity: 0,
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            category_id: product.category_id,
            subcategory_id: product.subcategory_id
          });
        }
      }
    } else {
      // Simple product without variants
      await createOrUpdateInventoryItem({
        product_id: productId,
        product_name: product.name,
        color_variant_id: null,
        color_name: null,
        size_variant_id: null,
        size_name: null,
        size_code: null,
        stock_quantity: 0,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id
      });
    }

    console.log('✅ Product synced to inventory successfully');
    return true;
  } catch (error) {
    console.error('❌ Error syncing product to inventory:', error);
    return false;
  }
}

async function createOrUpdateInventoryItem(itemData: any): Promise<boolean> {
  try {
    // Generate SKU
    const sku = generateSKU(itemData.product_name, itemData.color_name, itemData.size_name);

    // Check if item already exists
    const { data: existing } = await supabase
      .from('product_inventory')
      .select('id')
      .eq('product_id', itemData.product_id)
      .eq('color_variant_id', itemData.color_variant_id || null)
      .eq('size_variant_id', itemData.size_variant_id || null)
      .single();

    const inventoryItem = {
      ...itemData,
      sku,
      reserved_stock: 0,
      available_stock: itemData.stock_quantity,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Update existing item
      const { error } = await supabase
        .from('product_inventory')
        .update(inventoryItem)
        .eq('id', existing.id);

      if (error) {
        console.error('❌ Error updating inventory item:', error);
        return false;
      }
    } else {
      // Create new item
      inventoryItem.created_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('product_inventory')
        .insert(inventoryItem);

      if (error) {
        console.error('❌ Error creating inventory item:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error in createOrUpdateInventoryItem:', error);
    return false;
  }
}

function generateSKU(productName: string, colorName?: string | null, sizeName?: string | null): string {
  let sku = productName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 8);

  if (colorName) {
    sku += `-${colorName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3)}`;
  }

  if (sizeName) {
    sku += `-${sizeName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 2)}`;
  }

  // Add timestamp to ensure uniqueness
  sku += `-${Date.now().toString().slice(-4)}`;

  return sku;
}

export async function createInventoryItem(itemData: any): Promise<boolean> {
  try {
    return await createOrUpdateInventoryItem(itemData);
  } catch (error) {
    console.error('❌ Error creating inventory item:', error);
    return false;
  }
}

export async function deleteInventoryItem(inventoryId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting inventory item:', inventoryId);

    const { error } = await supabase
      .from('product_inventory')
      .delete()
      .eq('id', inventoryId);

    if (error) {
      console.error('❌ Error deleting inventory item:', error);
      return false;
    }

    console.log('✅ Inventory item deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in deleteInventoryItem:', error);
    return false;
  }
}

// Analytics and reporting functions
export async function getLowStockAlerts(threshold: number = 10): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('is_active', true)
      .lte('available_stock', threshold)
      .order('available_stock', { ascending: true });

    if (error) {
      console.error('❌ Error fetching low stock alerts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getLowStockAlerts:', error);
    return [];
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  try {
    const summary = await getInventorySummary(productId);
    return summary.available_stock;
  } catch (error) {
    console.error('❌ Error getting product stock summary:', error);
    return 0;
  }
}

export async function calculateTotalProductStock(productId: string): Promise<number> {
  return await getProductStockSummary(productId);
}

// Real-time subscription helpers
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

export function subscribeToAllInventoryChanges(callback: (payload: any) => void) {
  return supabase
    .channel('inventory-all')
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
