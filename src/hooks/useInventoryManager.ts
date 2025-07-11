
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
      const { data, error } = await supabase.rpc('reserve_order_stock', {
        p_order_id: orderId
      });

      if (error) throw error;

      if (!data) {
        throw new Error('Failed to reserve stock for some items');
      }

      return data;
    } catch (error) {
      console.error('Error reserving stock:', error);
      throw error;
    }
  };

  const releaseStock = async (orderId: string) => {
    try {
      const { data, error } = await supabase.rpc('release_order_stock', {
        p_order_id: orderId
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error releasing stock:', error);
      throw error;
    }
  };

  const fulfillStock = async (orderId: string) => {
    try {
      const { data, error } = await supabase.rpc('fulfill_order_stock', {
        p_order_id: orderId
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fulfilling stock:', error);
      throw error;
    }
  };

  return {
    createInventoryRecord,
    updateStock,
    reserveStock,
    releaseStock,
    fulfillStock,
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
