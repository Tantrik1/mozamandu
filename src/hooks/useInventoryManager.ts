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

  const reserveStock = async (orderId: string) => {
    try {
      console.log('🔒 Reserving stock using enhanced function for order:', orderId);
      const { data, error } = await supabase.rpc('reserve_order_stock_enhanced', {
        p_order_id: orderId
      });

      if (error) throw error;

      // The function returns a boolean: true for success, false for failure
      if (data === false) {
        throw new Error('Failed to reserve stock for some items');
      }

      console.log('✅ Stock reserved successfully for order:', orderId);
      return data;
    } catch (error) {
      console.error('❌ Error reserving stock:', error);
      throw error;
    }
  };

  const releaseStock = async (orderId: string) => {
    try {
      console.log('🔓 Releasing stock using enhanced function for order:', orderId);
      const { data, error } = await supabase.rpc('release_order_stock_enhanced', {
        p_order_id: orderId
      });

      if (error) throw error;

      console.log('✅ Stock released successfully for order:', orderId);
      return data;
    } catch (error) {
      console.error('❌ Error releasing stock:', error);
      throw error;
    }
  };

  const fulfillStock = async (orderId: string) => {
    try {
      console.log('📦 Fulfilling stock using enhanced function for order:', orderId);
      const { data, error } = await supabase.rpc('fulfill_order_stock_enhanced', {
        p_order_id: orderId
      });

      if (error) throw error;

      console.log('✅ Stock fulfilled successfully for order:', orderId);
      return data;
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
