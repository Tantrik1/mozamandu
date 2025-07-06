import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  processCheckoutStock,
  handleOrderStatusUpdate,
  rollbackStockReservations
} from '@/utils/inventoryManager';

interface OrderItem {
  product_id: string;
  product_inventory_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderData {
  customer_name: string;
  customer_email: string;
  contact_number: string;
  delivery_address: string;
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  payment_method: string;
  promocode_used?: string;
  promocode_discount?: number;
  paid_amount: number;
  remaining_amount: number;
  payment_percentage: number;
  user_id?: string;
  items: OrderItem[];
}

export async function processOrder(orderData: OrderData) {
  try {
    console.log('Processing order:', orderData);

    // Step 1: Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        contact_number: orderData.contact_number,
        delivery_address: orderData.delivery_address,
        subtotal: orderData.subtotal,
        delivery_charge: orderData.delivery_charge,
        total_amount: orderData.total_amount,
        payment_method: orderData.payment_method,
        promocode_used: orderData.promocode_used,
        promocode_discount: orderData.promocode_discount || 0,
        paid_amount: orderData.paid_amount,
        remaining_amount: orderData.remaining_amount,
        payment_percentage: orderData.payment_percentage,
        user_id: orderData.user_id || null,
        status: 'pending_payment' as const,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error('Failed to create order');
    }

    console.log('Order created:', order);

    // Step 2: Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_inventory_id: item.product_inventory_id,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      throw new Error('Failed to create order items');
    }

    console.log('Order items created');

    // Step 3: Create detailed order items for pricing
    const detailedItems = orderData.items.map(item => ({
      order_id: order.id,
      product_name: `Product ${item.product_id}`, // You might want to fetch actual product name
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      pricing_mode: 'normal',
    }));

    const { error: detailsError } = await supabase
      .from('order_item_details')
      .insert(detailedItems);

    if (detailsError) {
      console.error('Error creating order item details:', detailsError);
      // This is not critical, so we don't throw
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    };

  } catch (error) {
    console.error('Error processing order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string, notes?: string) {
  try {
    console.log('Updating order status:', { orderId, newStatus, notes });

    const { error } = await supabase
      .from('orders')
      .update({
        status: newStatus as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }

    // Handle inventory updates based on status
    await handleOrderStatusUpdate(orderId, newStatus);

    return { success: true };

  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function cancelOrder(orderId: string, reason?: string) {
  try {
    console.log('Cancelling order:', { orderId, reason });

    // Update order status to cancelled
    const statusResult = await updateOrderStatus(orderId, 'cancelled', reason);
    
    if (!statusResult.success) {
      throw new Error('Failed to update order status to cancelled');
    }

    // Rollback stock reservations
    const rollbackSuccess = await rollbackStockReservations(orderId);
    
    if (!rollbackSuccess) {
      console.warn('Failed to rollback stock reservations for cancelled order:', orderId);
      // Don't throw error as the order is already cancelled
    }

    toast({
      title: 'Order Cancelled',
      description: 'The order has been cancelled and stock has been released.',
    });

    return { success: true };

  } catch (error) {
    console.error('Error cancelling order:', error);
    toast({
      title: 'Error',
      description: 'Failed to cancel order. Please try again.',
      variant: 'destructive',
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getOrderDetails(orderId: string) {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product_inventory (
            product_name,
            color_name,
            size_name,
            sku
          )
        ),
        order_item_details (*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order details:', orderError);
      throw new Error('Failed to fetch order details');
    }

    return { success: true, order };

  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getOrderHistory(userId?: string) {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product_inventory (
            product_name,
            color_name,
            size_name,
            sku
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching order history:', error);
      throw new Error('Failed to fetch order history');
    }

    return { success: true, orders: orders || [] };

  } catch (error) {
    console.error('Error in getOrderHistory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
