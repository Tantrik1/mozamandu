import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDetailedProductStock, ProductStockSummary, getVariantStock, VariantStock } from '@/utils/stockCalculation';
import { useToast } from '@/hooks/use-toast';

export function useInventoryManager() {
  const { toast } = useToast();

  const createInventoryRecord = async (
    productId: string,
    productName: string,
    categoryName: string,
    subcategoryName: string,
    costPrice: number,
    sellingPrice?: number,
    colorVariantId?: string,
    sizeVariantId?: string,
    colorName?: string,
    sizeName?: string,
    initialStock: number = 0
  ) => {
    try {
      const { data: skuData, error: skuError } = await supabase.rpc('generate_product_sku', {
        p_product_name: productName,
        p_color_name: colorName || null,
        p_size_name: sizeName || null
      });

      if (skuError) throw skuError;

      const { data, error } = await supabase
        .from('product_inventory')
        .insert({
          sku: skuData,
          product_id: productId,
          color_variant_id: colorVariantId || null,
          size_variant_id: sizeVariantId || null,
          product_name: productName,
          category_name: categoryName,
          subcategory_name: subcategoryName,
          color_name: colorName || null,
          size_name: sizeName || null,
          stock_quantity: initialStock,
          cost_price: costPrice,
          selling_price: sellingPrice || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Inventory record created with SKU: ${skuData}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating inventory record:', error);
      toast({
        title: 'Error',
        description: 'Failed to create inventory record',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateStock = async (
    productId: string,
    stockChange: number,
    reason: string,
    colorVariantId?: string,
    sizeVariantId?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('safe_update_stock', {
        p_product_id: productId,
        p_stock_change: stockChange,
        p_color_variant_id: colorVariantId || null,
        p_size_variant_id: sizeVariantId || null,
        p_reservation_change: 0,
        p_reason: reason,
        p_transaction_type: 'adjust'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stock updated successfully',
      });

      return data;
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update stock',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const reserveStock = async (orderId: string, isCustomerOrder: boolean = true) => {
    try {
      console.log('🔒 Starting robust stock reservation for order:', orderId, 'isCustomerOrder:', isCustomerOrder);
      
      // Determine which tables to query based on order type
      const ordersTable = isCustomerOrder ? 'customer_orders' : 'orders';
      const orderItemDetailsTable = isCustomerOrder ? 'customer_order_item_details' : 'order_item_details';
      
      // Get order details for logging
      const { data: orderData, error: orderError } = await supabase
        .from(ordersTable)
        .select('order_number')
        .eq('id', orderId)
        .single();
      
      const orderNumber = orderData?.order_number || 'UNKNOWN';
      
      // Get all order items for this order
      const { data: orderItems, error: itemsError } = await supabase
        .from(orderItemDetailsTable)
        .select('product_inventory_id, sku, quantity, product_name')
        .eq('order_id', orderId);
      
      if (itemsError) {
        console.error('❌ Error fetching order items:', itemsError);
        throw itemsError;
      }
      
      if (!orderItems || orderItems.length === 0) {
        throw new Error('No order items found for reservation');
      }
      
      console.log('📋 Raw order items:', orderItems);
      
      // Group by product_inventory_id and sum quantities (handle multiple entries for same product)
      const groupedItems = orderItems.reduce((acc, item) => {
        const key = item.product_inventory_id;
        if (!acc[key]) {
          acc[key] = {
            product_inventory_id: item.product_inventory_id,
            sku: item.sku,
            product_name: item.product_name,
            total_quantity: 0
          };
        }
        acc[key].total_quantity += item.quantity;
        return acc;
      }, {} as Record<string, any>);
      
      const consolidatedItems = Object.values(groupedItems);
      console.log('📦 Consolidated items for reservation:', consolidatedItems);
      
      // Process each unique product_inventory_id
      for (const item of consolidatedItems) {
        console.log(`🔒 Processing reservation for SKU: ${item.sku}, Total Quantity: ${item.total_quantity}`);
        
        // Get current inventory state with detailed logging
        console.log(`🔍 Fetching inventory for ID: ${item.product_inventory_id}`);
        
        const { data: inventory, error: inventoryError } = await supabase
          .from('product_inventory')
          .select('id, stock_quantity, reserved_stock, available_stock, sku, product_name')
          .eq('id', item.product_inventory_id)
          .maybeSingle();
        
        if (inventoryError) {
          console.error(`❌ Error fetching inventory for ${item.sku}:`, inventoryError);
          throw new Error(`Failed to fetch inventory for ${item.sku}: ${inventoryError.message}`);
        }
        
        if (!inventory) {
          console.error(`❌ No inventory record found for ID: ${item.product_inventory_id}, SKU: ${item.sku}`);
          throw new Error(`Inventory record not found for ${item.sku} (ID: ${item.product_inventory_id})`);
        }
        
        console.log(`📊 Current inventory state for ${item.sku}:`, {
          id: inventory.id,
          sku: inventory.sku,
          stock_quantity: inventory.stock_quantity,
          reserved_stock: inventory.reserved_stock,
          available_stock: inventory.available_stock,
          requesting: item.total_quantity
        });
        
        // Validate available stock
        if (inventory.available_stock < item.total_quantity) {
          const errorMsg = `Insufficient stock for ${item.sku}. Available: ${inventory.available_stock}, Required: ${item.total_quantity}`;
          console.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        // Calculate new reserved stock
        const newReservedStock = inventory.reserved_stock + item.total_quantity;
        console.log(`📈 Updating reserved stock: ${inventory.reserved_stock} + ${item.total_quantity} = ${newReservedStock}`);
        
        // Perform the update with verification
        const { data: updateResult, error: updateError } = await supabase
          .from('product_inventory')
          .update({ 
            reserved_stock: newReservedStock,
            available_stock: Math.max(0, (inventory.stock_quantity || 0) - newReservedStock),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_inventory_id)
          .select('id, sku, stock_quantity, reserved_stock, available_stock');
        
        if (updateError) {
          console.error(`❌ Error updating inventory for ${item.sku}:`, updateError);
          throw new Error(`Failed to reserve stock for ${item.sku}: ${updateError.message}`);
        }
        
        if (!updateResult || updateResult.length === 0) {
          console.error(`❌ No rows updated for ${item.sku}`);
          throw new Error(`Failed to update inventory for ${item.sku} - no rows affected`);
        }
        
        const updatedInventory = updateResult[0];
        console.log(`✅ Successfully reserved stock for ${item.sku}:`, {
          previous_reserved: inventory.reserved_stock,
          new_reserved: updatedInventory.reserved_stock,
          quantity_reserved: item.total_quantity,
          new_available: updatedInventory.available_stock
        });
        
        // Log the transaction to inventory_transactions for audit trail
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert({
            inventory_id: item.product_inventory_id,
            transaction_type: 'reserve',
            quantity_change: 0, // Stock quantity doesn't change, only reservation
            order_id: orderId,
            order_number: orderNumber,
            reason: `Stock reservation at checkout - SKU: ${item.sku}, Qty: ${item.total_quantity}`,
            previous_stock: inventory.stock_quantity,
            previous_reserved: inventory.reserved_stock,
            new_stock: inventory.stock_quantity,
            new_reserved: newReservedStock
          });
        
        if (transactionError) {
          console.warn(`⚠️ Failed to log inventory transaction for ${item.sku}:`, transactionError);
          // Don't throw - transaction logging failure shouldn't block checkout
        } else {
          console.log(`📝 Inventory transaction logged for ${item.sku}`);
        }
        
        // Verify the update was correct
        if (updatedInventory.reserved_stock !== newReservedStock) {
          console.warn(`⚠️ Reservation mismatch for ${item.sku}: expected ${newReservedStock}, got ${updatedInventory.reserved_stock}`);
        }
      }
      
      // Final verification - check all reservations were applied
      console.log('🔍 Final verification of all reservations...');
      for (const item of consolidatedItems) {
        const { data: finalCheck } = await supabase
          .from('product_inventory')
          .select('id, sku, reserved_stock')
          .eq('id', item.product_inventory_id)
          .single();
        
        if (finalCheck) {
          console.log(`✅ Final verification for ${finalCheck.sku}: reserved_stock = ${finalCheck.reserved_stock}`);
        }
      }
      
      console.log('🎉 Stock reservation completed successfully for order:', orderId);
      return true;
      
    } catch (error) {
      console.error('❌ Error reserving stock:', error);
      throw error;
    }
  };

  const releaseStock = async (orderId: string, isCustomerOrder: boolean = true) => {
    try {
      console.log('🔓 Starting robust stock release for order:', orderId, 'isCustomerOrder:', isCustomerOrder);
      
      // Determine which table to query based on order type
      const orderItemDetailsTable = isCustomerOrder ? 'customer_order_item_details' : 'order_item_details';
      
      // Get all order items for this order
      const { data: orderItems, error: itemsError } = await supabase
        .from(orderItemDetailsTable)
        .select('product_inventory_id, sku, quantity, product_name')
        .eq('order_id', orderId);
      
      if (itemsError) {
        console.error('❌ Error fetching order items:', itemsError);
        throw itemsError;
      }
      
      if (!orderItems || orderItems.length === 0) {
        console.log('⚠️ No order items found for release');
        return true;
      }
      
      console.log('📋 Raw order items for release:', orderItems);
      
      // Group by product_inventory_id and sum quantities
      const groupedItems = orderItems.reduce((acc, item) => {
        const key = item.product_inventory_id;
        if (!acc[key]) {
          acc[key] = {
            product_inventory_id: item.product_inventory_id,
            sku: item.sku,
            product_name: item.product_name,
            total_quantity: 0
          };
        }
        acc[key].total_quantity += item.quantity;
        return acc;
      }, {} as Record<string, any>);
      
      const consolidatedItems = Object.values(groupedItems);
      console.log('📦 Consolidated items for release:', consolidatedItems);
      
      // Process each unique product_inventory_id
      for (const item of consolidatedItems) {
        console.log(`🔓 Processing release for SKU: ${item.sku}, Total Quantity: ${item.total_quantity}`);
        
        // Get current inventory state
        const { data: inventory, error: inventoryError } = await supabase
          .from('product_inventory')
          .select('id, stock_quantity, reserved_stock, sku, product_name')
          .eq('id', item.product_inventory_id)
          .maybeSingle();
        
        if (inventoryError) {
          console.error(`❌ Error fetching inventory for ${item.sku}:`, inventoryError);
          throw new Error(`Failed to fetch inventory for ${item.sku}: ${inventoryError.message}`);
        }
        
        if (!inventory) {
          console.warn(`⚠️ Inventory record not found for ${item.sku}, skipping`);
          continue;
        }
        
        console.log(`📊 Current inventory state for ${item.sku}:`, {
          reserved_stock: inventory.reserved_stock,
          releasing: item.total_quantity
        });
        
        // Calculate new reserved stock (don't go below 0)
        const newReservedStock = Math.max(0, inventory.reserved_stock - item.total_quantity);
        console.log(`📉 Updating reserved stock: ${inventory.reserved_stock} - ${item.total_quantity} = ${newReservedStock}`);
        
        const { data: updateResult, error: updateError } = await supabase
          .from('product_inventory')
          .update({ 
            reserved_stock: newReservedStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_inventory_id)
          .select('id, sku, stock_quantity, reserved_stock, available_stock');
        
        if (updateError) {
          console.error(`❌ Error updating inventory for ${item.sku}:`, updateError);
          throw new Error(`Failed to release stock for ${item.sku}: ${updateError.message}`);
        }
        
        if (updateResult && updateResult.length > 0) {
          const updatedInventory = updateResult[0];
          console.log(`✅ Successfully released stock for ${item.sku}:`, {
            previous_reserved: inventory.reserved_stock,
            new_reserved: updatedInventory.reserved_stock,
            quantity_released: item.total_quantity,
            new_available: updatedInventory.available_stock
          });
        }
      }
      
      console.log('🎉 Stock release completed successfully for order:', orderId);
      return true;
    } catch (error) {
      console.error('❌ Error releasing stock:', error);
      throw error;
    }
  };

  const fulfillStock = async (orderId: string, isCustomerOrder: boolean = true) => {
    try {
      console.log('📦 Starting robust stock fulfillment for order:', orderId, 'isCustomerOrder:', isCustomerOrder);
      
      // Determine which table to query based on order type
      const orderItemDetailsTable = isCustomerOrder ? 'customer_order_item_details' : 'order_item_details';
      
      // Get all order items for this order
      const { data: orderItems, error: itemsError } = await supabase
        .from(orderItemDetailsTable)
        .select('product_inventory_id, sku, quantity, product_name')
        .eq('order_id', orderId);
      
      if (itemsError) {
        console.error('❌ Error fetching order items:', itemsError);
        throw itemsError;
      }
      
      if (!orderItems || orderItems.length === 0) {
        console.log('⚠️ No order items found for fulfillment');
        return true;
      }
      
      console.log('📋 Raw order items for fulfillment:', orderItems);
      
      // Group by product_inventory_id and sum quantities
      const groupedItems = orderItems.reduce((acc, item) => {
        const key = item.product_inventory_id;
        if (!acc[key]) {
          acc[key] = {
            product_inventory_id: item.product_inventory_id,
            sku: item.sku,
            product_name: item.product_name,
            total_quantity: 0
          };
        }
        acc[key].total_quantity += item.quantity;
        return acc;
      }, {} as Record<string, any>);
      
      const consolidatedItems = Object.values(groupedItems);
      console.log('📦 Consolidated items for fulfillment:', consolidatedItems);
      
      // Process each unique product_inventory_id
      for (const item of consolidatedItems) {
        console.log(`📦 Processing fulfillment for SKU: ${item.sku}, Total Quantity: ${item.total_quantity}`);
        
        // Get current inventory state
        const { data: inventory, error: inventoryError } = await supabase
          .from('product_inventory')
          .select('id, stock_quantity, reserved_stock, sku, product_name')
          .eq('id', item.product_inventory_id)
          .maybeSingle();
        
        if (inventoryError) {
          console.error(`❌ Error fetching inventory for ${item.sku}:`, inventoryError);
          throw new Error(`Failed to fetch inventory for ${item.sku}: ${inventoryError.message}`);
        }
        
        if (!inventory) {
          console.warn(`⚠️ Inventory record not found for ${item.sku}, skipping`);
          continue;
        }
        
        console.log(`📊 Current inventory state for ${item.sku}:`, {
          stock_quantity: inventory.stock_quantity,
          reserved_stock: inventory.reserved_stock,
          fulfilling: item.total_quantity
        });
        
        // Calculate new stock levels (fulfill from both total stock and reserved stock)
        const actualFulfillQuantity = Math.min(item.total_quantity, inventory.reserved_stock);
        const newStockQuantity = Math.max(0, inventory.stock_quantity - actualFulfillQuantity);
        const newReservedStock = Math.max(0, inventory.reserved_stock - actualFulfillQuantity);
        
        console.log(`📉 Fulfillment calculations for ${item.sku}:`, {
          actualFulfillQuantity,
          newStockQuantity: `${inventory.stock_quantity} - ${actualFulfillQuantity} = ${newStockQuantity}`,
          newReservedStock: `${inventory.reserved_stock} - ${actualFulfillQuantity} = ${newReservedStock}`
        });
        
        const { data: updateResult, error: updateError } = await supabase
          .from('product_inventory')
          .update({ 
            stock_quantity: newStockQuantity,
            reserved_stock: newReservedStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_inventory_id)
          .select('id, sku, stock_quantity, reserved_stock, available_stock');
        
        if (updateError) {
          console.error(`❌ Error updating inventory for ${item.sku}:`, updateError);
          throw new Error(`Failed to fulfill stock for ${item.sku}: ${updateError.message}`);
        }
        
        if (updateResult && updateResult.length > 0) {
          const updatedInventory = updateResult[0];
          console.log(`✅ Successfully fulfilled stock for ${item.sku}:`, {
            previous_stock: inventory.stock_quantity,
            previous_reserved: inventory.reserved_stock,
            new_stock: updatedInventory.stock_quantity,
            new_reserved: updatedInventory.reserved_stock,
            quantity_fulfilled: actualFulfillQuantity,
            new_available: updatedInventory.available_stock
          });
        }
      }
      
      console.log('🎉 Stock fulfillment completed successfully for order:', orderId);
      return true;
    } catch (error) {
      console.error('❌ Error fulfilling stock:', error);
      throw error;
    }
  };

  // Enhanced function to get inventory record with duplicate handling
  const getInventoryRecord = async (
    productId: string,
    colorVariantId?: string,
    sizeVariantId?: string
  ) => {
    try {
      console.log('🔍 Getting inventory record for:', { 
        productId, 
        colorVariantId: colorVariantId || 'null', 
        sizeVariantId: sizeVariantId || 'null' 
      });
      
      // Build the query step by step with proper null handling
      let query = supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true);

      // Handle color variant - be very explicit about null handling
      if (colorVariantId && colorVariantId !== 'undefined' && colorVariantId !== 'null') {
        query = query.eq('color_variant_id', colorVariantId);
      } else {
        query = query.is('color_variant_id', null);
      }

      // Handle size variant - be very explicit about null handling
      if (sizeVariantId && sizeVariantId !== 'undefined' && sizeVariantId !== 'null') {
        query = query.eq('size_variant_id', sizeVariantId);
      } else {
        query = query.is('size_variant_id', null);
      }

      console.log('🔍 Executing inventory query...');
      
      // Use .select() instead of .maybeSingle() to handle multiple results
      const { data, error } = await query;

      if (error) {
        console.error('❌ Database error getting inventory record:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No inventory record found for the specified criteria');
        return null;
      }

      // Handle multiple records by selecting the best one
      let selectedRecord = data[0];
      
      if (data.length > 1) {
        console.warn('⚠️ Multiple inventory records found, selecting the best one:', data.length);
        
        // Priority selection logic:
        // 1. Record with highest available stock
        // 2. Record with most recent update
        // 3. Record with highest total stock
        selectedRecord = data.reduce((best, current) => {
          // Prefer record with higher available stock
          if (current.available_stock > best.available_stock) return current;
          if (current.available_stock < best.available_stock) return best;
          
          // If same available stock, prefer more recently updated
          if (new Date(current.updated_at) > new Date(best.updated_at)) return current;
          if (new Date(current.updated_at) < new Date(best.updated_at)) return best;
          
          // If same update time, prefer higher total stock
          if (current.stock_quantity > best.stock_quantity) return current;
          
          return best;
        });
        
        console.log('✅ Selected best inventory record:', {
          id: selectedRecord.id,
          sku: selectedRecord.sku,
          available_stock: selectedRecord.available_stock,
          reason: 'Highest available stock and most recent'
        });
      }

      console.log('✅ Inventory record found:', {
        id: selectedRecord.id,
        sku: selectedRecord.sku,
        available_stock: selectedRecord.available_stock,
        stock_quantity: selectedRecord.stock_quantity
      });
      
      return selectedRecord;
    } catch (error) {
      console.error('❌ Error getting inventory record:', error);
      return null;
    }
  };

  // Enhanced function to validate stock availability with better error reporting
  const validateStockAvailability = async (cartItems: any[]) => {
    try {
      console.log('🔍 Validating stock availability for', cartItems.length, 'items...');
      
      const validationResults = await Promise.all(
        cartItems.map(async (item, index) => {
          console.log(`🔍 Validating item ${index + 1}:`, {
            productName: item.productName,
            productId: item.productId,
            colorVariantId: item.colorVariantId || 'null',
            sizeVariantId: item.sizeVariantId || 'null',
            quantity: item.quantity
          });

          const inventoryRecord = await getInventoryRecord(
            item.productId,
            item.colorVariantId,
            item.sizeVariantId
          );
          
          if (!inventoryRecord) {
            console.error(`❌ No inventory record found for ${item.productName}`);
            return {
              item,
              valid: false,
              error: `No inventory record found for ${item.productName}. Please check if this product variant exists in inventory.`
            };
          }

          const available = inventoryRecord.available_stock || 0;
          const required = item.quantity;

          console.log(`📊 Stock check for ${item.productName}:`, {
            available,
            required,
            sufficient: available >= required
          });

          if (available < required) {
            return {
              item,
              valid: false,
              error: `Insufficient stock for ${item.productName}. Available: ${available}, Required: ${required}`
            };
          }

          return {
            item,
            valid: true,
            inventoryRecord
          };
        })
      );

      const invalidItems = validationResults.filter(result => !result.valid);
      
      if (invalidItems.length > 0) {
        const errorMessages = invalidItems.map(result => result.error).join('; ');
        console.error('❌ Stock validation failed:', errorMessages);
        throw new Error(`Stock validation failed: ${errorMessages}`);
      }

      console.log('✅ All items have sufficient stock');
      return validationResults.map(result => result.inventoryRecord);
    } catch (error) {
      console.error('❌ Stock validation failed:', error);
      throw error;
    }
  };

  return {
    createInventoryRecord,
    updateStock,
    reserveStock,
    releaseStock,
    fulfillStock,
    getInventoryRecord,
    validateStockAvailability,
  };
}

export function useProductStock(productId: string) {
  const [stock, setStock] = useState<ProductStockSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const stockData = await getDetailedProductStock(productId);
      setStock(stockData);
    } catch (error) {
      console.error('Error fetching product stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();

    // Set up real-time subscription
    const channel = supabase
      .channel('product-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_inventory',
          filter: `product_id=eq.${productId}`
        },
        () => {
          fetchStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId]);

  return { stock, loading, refetch: fetchStock };
}

export function useVariantStock(productId: string, colorVariantId?: string, sizeVariantId?: string) {
  const [stock, setStock] = useState<VariantStock | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const stockData = await getVariantStock(productId, colorVariantId, sizeVariantId);
      setStock(stockData);
    } catch (error) {
      console.error('Error fetching variant stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();

    // Set up real-time subscription
    const channel = supabase
      .channel('variant-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_inventory',
          filter: `product_id=eq.${productId}`
        },
        () => {
          fetchStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, colorVariantId, sizeVariantId]);

  return { stock, loading, refetch: fetchStock };
}
