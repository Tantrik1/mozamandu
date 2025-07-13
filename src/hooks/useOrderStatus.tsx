
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrderStatusData {
  order_id: string;
  order_number: string;
  status: string;
  items: any[];
}

export function useOrderStatus(orderId: string | null) {
  const [orderStatus, setOrderStatus] = useState<OrderStatusData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderStatus = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_order_with_inventory_status', {
          p_order_id: orderId
        });

        if (error) throw error;
        if (data && data.length > 0) {
          setOrderStatus(data[0]);
        }
      } catch (error) {
        console.error('Error fetching order status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();

    // Set up real-time subscription for order status changes
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('📡 Order status updated:', payload);
          // Refetch the order status when it changes
          fetchOrderStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_inventory'
        },
        (payload) => {
          console.log('📦 Inventory updated:', payload);
          // Refetch order status to get updated inventory info
          fetchOrderStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { orderStatus, loading };
}
