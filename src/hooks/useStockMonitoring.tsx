
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LowStockAlert } from '@/types/admin';

interface UseStockMonitoringOptions {
  threshold?: number;
  enableRealTime?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useStockMonitoring({
  threshold = 10,
  enableRealTime = true,
  refreshInterval = 30000, // 30 seconds
}: UseStockMonitoringOptions = {}) {
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchLowStockAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('product_inventory')
        .select('*')
        .lte('available_stock', threshold)
        .eq('is_active', true)
        .order('available_stock', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const alerts: LowStockAlert[] = (data || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        category_name: item.category_name || undefined,
        subcategory_name: item.subcategory_name || undefined,
        variant_name: item.color_name || undefined,
        size_name: item.size_name || undefined,
        sku: item.sku,
        color_name: item.color_name,
        stock_quantity: item.stock_quantity,
        reserved_stock: item.reserved_stock,
        available_stock: item.available_stock,
        low_stock_threshold: item.low_stock_threshold || threshold,
        stock_needed: Math.max(0, (item.low_stock_threshold || threshold) - item.available_stock),
        updated_at: item.updated_at,
      }));

      setLowStockAlerts(alerts);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching low stock alerts:', err);
      setError('Failed to fetch low stock alerts');
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  // Initial fetch
  useEffect(() => {
    fetchLowStockAlerts();
  }, [fetchLowStockAlerts]);

  // Periodic refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(fetchLowStockAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchLowStockAlerts, refreshInterval]);

  // Real-time updates
  useEffect(() => {
    if (!enableRealTime) return;

    const channel = supabase
      .channel('stock-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_inventory',
        },
        (payload) => {
          console.log('Stock change detected:', payload);
          
          // Refetch alerts when inventory changes
          fetchLowStockAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealTime, fetchLowStockAlerts]);

  const refreshAlerts = useCallback(() => {
    fetchLowStockAlerts();
  }, [fetchLowStockAlerts]);

  const getAlertsByProduct = useCallback((productId: string) => {
    return lowStockAlerts.filter(alert => alert.product_id === productId);
  }, [lowStockAlerts]);

  const getCriticalAlerts = useCallback((criticalThreshold: number = 5) => {
    return lowStockAlerts.filter(alert => (alert.available_stock || 0) <= criticalThreshold);
  }, [lowStockAlerts]);

  const getOutOfStockAlerts = useCallback(() => {
    return lowStockAlerts.filter(alert => (alert.available_stock || 0) === 0);
  }, [lowStockAlerts]);

  return {
    lowStockAlerts,
    loading,
    error,
    lastUpdate,
    refreshAlerts,
    getAlertsByProduct,
    getCriticalAlerts,
    getOutOfStockAlerts,
    alertCount: lowStockAlerts.length,
    criticalCount: getCriticalAlerts().length,
    outOfStockCount: getOutOfStockAlerts().length,
  };
}
