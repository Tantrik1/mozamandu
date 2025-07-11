
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StockAlert {
  id: string;
  product_name: string;
  available_stock: number;
  low_stock_threshold: number;
  category_name: string;
  subcategory_name: string;
}

export function useStockMonitoring() {
  const [lowStockAlerts, setLowStockAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const checkLowStock = async () => {
    try {
      setLoading(true);
      // Mock data since inventory system is removed
      setLowStockAlerts([]);
    } catch (error) {
      console.error('Error checking low stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to check stock levels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLowStock();
  }, []);

  return {
    lowStockAlerts,
    loading,
    checkLowStock,
  };
}
