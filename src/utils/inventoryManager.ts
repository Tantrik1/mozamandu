import { supabase } from '@/integrations/supabase/client';
import { LowStockAlert } from '@/types/admin';

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
    const orderStatus: 'pending_payment' = 'pending_payment';
    
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

export async function getInventoryAnalytics(): Promise<{
  total_items: number;
  active_items: number;
  total_available_stock: number;
  total_reserved_stock: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_value: number;
}> {
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
