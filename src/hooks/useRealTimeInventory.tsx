
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  InventoryItem, 
  subscribeToInventoryChanges, 
  subscribeToAllInventoryChanges,
  getRealTimeStock 
} from '@/utils/inventoryManager';

interface UseRealTimeInventoryProps {
  productId?: string;
  productInventoryId?: string;
  enableRealTime?: boolean;
}

export function useRealTimeInventory({
  productId,
  productInventoryId,
  enableRealTime = true
}: UseRealTimeInventoryProps = {}) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockData, setStockData] = useState<{
    stock_quantity: number;
    reserved_stock: number;
    available_stock: number;
    is_active: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch initial data
  const fetchStockData = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getRealTimeStock(productId, productInventoryId);
      setStockData(data);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  }, [productId, productInventoryId]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealTime || !productId) return;

    fetchStockData();

    let subscription: any;

    const setupSubscription = async () => {
      const unsubscribe = await subscribeToInventoryChanges(productId, (payload) => {
        console.log('Inventory change detected:', payload);
        setLastUpdate(new Date());
        
        // Filter for specific inventory item if provided
        if (productInventoryId && payload.new?.id !== productInventoryId) {
          return;
        }

        // Update stock data
        if (payload.eventType === 'UPDATE' && payload.new) {
          setStockData({
            stock_quantity: payload.new.stock_quantity,
            reserved_stock: payload.new.reserved_stock,
            available_stock: payload.new.available_stock,
            is_active: payload.new.is_active
          });
        } else if (payload.eventType === 'DELETE') {
          setStockData(null);
        }
      });

      subscription = { unsubscribe };
    };

    setupSubscription();

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [productId, productInventoryId, enableRealTime, fetchStockData]);

  return {
    stockData,
    loading,
    error,
    lastUpdate,
    refetch: fetchStockData
  };
}

// Hook for monitoring all inventory changes
export function useRealTimeInventoryMonitor(callback?: (payload: any) => void) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      const unsubscribe = await subscribeToAllInventoryChanges((payload) => {
        console.log('Global inventory change:', payload);
        setLastUpdate(new Date());
        callback?.(payload);
      });

      subscription = { unsubscribe };
    };

    setupSubscription();

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [callback]);

  return { lastUpdate };
}
