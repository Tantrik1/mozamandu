
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLowStockAlerts, type LowStockAlert } from '@/utils/inventoryManager';

export function useStockMonitoring(productId?: string) {
  const [stockAlerts, setStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockAlerts();
    
    // Set up real-time monitoring
    const channel = supabase
      .channel('inventory-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_inventory'
      }, () => {
        fetchStockAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId]);

  const fetchStockAlerts = async () => {
    try {
      setLoading(true);
      const alerts = await getLowStockAlerts();
      
      // Filter by product if specified
      const filteredAlerts = productId 
        ? alerts.filter(alert => alert.product_id === productId)
        : alerts;
      
      setStockAlerts(filteredAlerts);
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (alert: LowStockAlert) => {
    if (alert.available_stock === 0) return 'out_of_stock';
    if (alert.available_stock <= alert.low_stock_threshold) return 'low_stock';
    return 'in_stock';
  };

  const getCriticalAlerts = () => {
    return stockAlerts.filter(alert => alert.available_stock === 0);
  };

  const getLowStockItems = () => {
    return stockAlerts.filter(alert => 
      alert.available_stock > 0 && alert.available_stock <= alert.low_stock_threshold
    );
  };

  return {
    stockAlerts,
    loading,
    refresh: fetchStockAlerts,
    getStockStatus,
    getCriticalAlerts,
    getLowStockItems
  };
}
