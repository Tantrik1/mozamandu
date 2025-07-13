
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
        // Use direct query instead of RPC function for now to avoid TypeScript issues
        const { data, error } = await supabase
          .from('customer_orders')
          .select(`
            id,
            order_number,
            status,
            customer_order_item_details (
              product_name,
              sku,
              quantity,
              unit_price,
              total_price,
              product_inventory_id,
              product_inventory (
                available_stock,
                reserved_stock
              )
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        
        if (data) {
          // Transform data to match expected format
          const transformedData = {
            order_id: data.id,
            order_number: data.order_number,
            status: data.status,
            items: data.customer_order_item_details.map((item: any) => ({
              product_name: item.product_name,
              sku: item.sku,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              inventory_id: item.product_inventory_id,
              available_stock: item.product_inventory?.available_stock || 0,
              reserved_stock: item.product_inventory?.reserved_stock || 0
            }))
          };
          setOrderStatus(transformedData);
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
