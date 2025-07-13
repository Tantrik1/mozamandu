
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InventoryRecord {
  id: string;
  sku: string;
  product_id: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  cost_price: number;
  selling_price?: number;
  is_active: boolean;
}

export function useEnhancedInventoryManager() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getInventoryRecord = async (
    productId: string,
    colorVariantId?: string,
    sizeVariantId?: string
  ): Promise<InventoryRecord | null> => {
    try {
      console.log('🔍 Fetching inventory record for:', { productId, colorVariantId, sizeVariantId });
      
      let query = supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (colorVariantId) {
        query = query.eq('color_variant_id', colorVariantId);
      } else {
        query = query.is('color_variant_id', null);
      }

      if (sizeVariantId) {
        query = query.eq('size_variant_id', sizeVariantId);
      } else {
        query = query.is('size_variant_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('❌ Error fetching inventory:', error);
        throw error;
      }

      console.log('📦 Inventory record found:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to get inventory record:', error);
      return null;
    }
  };

  const validateStockAvailability = async (
    productId: string,
    requestedQuantity: number,
    colorVariantId?: string,
    sizeVariantId?: string
  ): Promise<boolean> => {
    try {
      const record = await getInventoryRecord(productId, colorVariantId, sizeVariantId);
      
      if (!record) {
        console.warn('⚠️ No inventory record found');
        return false;
      }

      const isAvailable = record.available_stock >= requestedQuantity;
      console.log('🔍 Stock check:', {
        available: record.available_stock,
        requested: requestedQuantity,
        sufficient: isAvailable
      });

      return isAvailable;
    } catch (error) {
      console.error('❌ Stock validation failed:', error);
      return false;
    }
  };

  const reserveStock = async (
    inventoryId: string,
    quantity: number,
    orderId: string,
    reason: string = 'Stock reservation'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🔒 Reserving stock:', { inventoryId, quantity, orderId });

      // Get current inventory record
      const { data: inventory, error: fetchError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();

      if (fetchError || !inventory) {
        throw new Error('Inventory record not found');
      }

      // Use the safe_update_stock function
      const { error } = await supabase.rpc('safe_update_stock', {
        p_product_id: inventory.product_id,
        p_stock_change: 0, // No change to total stock
        p_color_variant_id: inventory.color_variant_id,
        p_size_variant_id: inventory.size_variant_id,
        p_reservation_change: quantity, // Reserve this quantity
        p_reason: reason,
        p_order_id: orderId,
        p_transaction_type: 'reserve'
      });

      if (error) {
        console.error('❌ Stock reservation failed:', error);
        throw new Error(`Failed to reserve stock: ${error.message}`);
      }

      console.log('✅ Stock reserved successfully');
      return true;
    } catch (error) {
      console.error('❌ Reserve stock error:', error);
      toast({
        title: 'Stock Reservation Failed',
        description: error instanceof Error ? error.message : 'Failed to reserve stock',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const releaseStock = async (
    inventoryId: string,
    quantity: number,
    orderId: string,
    reason: string = 'Stock release'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🔓 Releasing stock:', { inventoryId, quantity, orderId });

      // Get current inventory record
      const { data: inventory, error: fetchError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();

      if (fetchError || !inventory) {
        throw new Error('Inventory record not found');
      }

      // Use the safe_update_stock function
      const { error } = await supabase.rpc('safe_update_stock', {
        p_product_id: inventory.product_id,
        p_stock_change: 0, // No change to total stock
        p_color_variant_id: inventory.color_variant_id,
        p_size_variant_id: inventory.size_variant_id,
        p_reservation_change: -quantity, // Release this quantity
        p_reason: reason,
        p_order_id: orderId,
        p_transaction_type: 'release'
      });

      if (error) {
        console.error('❌ Stock release failed:', error);
        throw new Error(`Failed to release stock: ${error.message}`);
      }

      console.log('✅ Stock released successfully');
      return true;
    } catch (error) {
      console.error('❌ Release stock error:', error);
      toast({
        title: 'Stock Release Failed',
        description: error instanceof Error ? error.message : 'Failed to release stock',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fulfillStock = async (
    inventoryId: string,
    quantity: number,
    orderId: string,
    reason: string = 'Stock fulfillment'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('📦 Fulfilling stock:', { inventoryId, quantity, orderId });

      // Get current inventory record
      const { data: inventory, error: fetchError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();

      if (fetchError || !inventory) {
        throw new Error('Inventory record not found');
      }

      // Use the safe_update_stock function
      const { error } = await supabase.rpc('safe_update_stock', {
        p_product_id: inventory.product_id,
        p_stock_change: -quantity, // Reduce total stock
        p_color_variant_id: inventory.color_variant_id,
        p_size_variant_id: inventory.size_variant_id,
        p_reservation_change: -quantity, // Also release reservation
        p_reason: reason,
        p_order_id: orderId,
        p_transaction_type: 'fulfill'
      });

      if (error) {
        console.error('❌ Stock fulfillment failed:', error);
        throw new Error(`Failed to fulfill stock: ${error.message}`);
      }

      console.log('✅ Stock fulfilled successfully');
      return true;
    } catch (error) {
      console.error('❌ Fulfill stock error:', error);
      toast({
        title: 'Stock Fulfillment Failed',
        description: error instanceof Error ? error.message : 'Failed to fulfill stock',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (
    inventoryId: string,
    stockChange: number,
    reason: string = 'Manual stock adjustment'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('📝 Updating stock:', { inventoryId, stockChange, reason });

      // Get current inventory record
      const { data: inventory, error: fetchError } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();

      if (fetchError || !inventory) {
        throw new Error('Inventory record not found');
      }

      // Use the safe_update_stock function
      const { error } = await supabase.rpc('safe_update_stock', {
        p_product_id: inventory.product_id,
        p_stock_change: stockChange,
        p_color_variant_id: inventory.color_variant_id,
        p_size_variant_id: inventory.size_variant_id,
        p_reservation_change: 0, // No reservation change
        p_reason: reason,
        p_transaction_type: 'adjust'
      });

      if (error) {
        console.error('❌ Stock update failed:', error);
        throw new Error(`Failed to update stock: ${error.message}`);
      }

      console.log('✅ Stock updated successfully');
      toast({
        title: 'Stock Updated',
        description: 'Stock quantity has been updated successfully',
      });
      return true;
    } catch (error) {
      console.error('❌ Update stock error:', error);
      toast({
        title: 'Stock Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update stock',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getInventoryRecord,
    validateStockAvailability,
    reserveStock,
    releaseStock,
    fulfillStock,
    updateStock,
  };
}
