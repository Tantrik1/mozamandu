
import { supabase } from '@/integrations/supabase/client';
import { 
  processCheckoutStock, 
  handleOrderStatusUpdate,
  rollbackStockReservations 
} from '@/utils/inventoryManager';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  id?: string;
  product_id: string;
  product_inventory_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ProcessOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export async function processGuestOrder(
  orderData: any,
  cartItems: any[]
): Promise<ProcessOrderResult> {
  try {
    console.log('🛍️ Processing guest order:', { orderData, cartItems });

    // Create order first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        user_id: null, // Guest order
        status: 'pending_payment'
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('❌ Error creating guest order:', orderError);
      return { success: false, error: 'Failed to create order' };
    }

    // Process stock operations
    const stockSuccess = await processCheckoutStock(cartItems, order.id);
    if (!stockSuccess) {
      console.error('❌ Stock processing failed for guest order');
      
      // Clean up order
      await supabase.from('orders').delete().eq('id', order.id);
      
      toast({
        title: 'Stock Error',
        description: 'Some items are no longer available. Please check your cart.',
        variant: 'destructive'
      });
      
      return { success: false, error: 'Stock processing failed' };
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_inventory_id: item.productInventoryId,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('❌ Error creating order items:', itemsError);
      
      // Rollback stock and order
      await rollbackStockReservations(cartItems, order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      
      return { success: false, error: 'Failed to create order items' };
    }

    console.log('✅ Guest order processed successfully:', order.id);
    return { success: true, orderId: order.id };

  } catch (error) {
    console.error('❌ Error processing guest order:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function processCustomerOrder(
  orderData: any,
  cartItems: any[],
  userId: string
): Promise<ProcessOrderResult> {
  try {
    console.log('👤 Processing customer order:', { orderData, cartItems, userId });

    // Create customer order
    const { data: order, error: orderError } = await supabase
      .from('customer_orders')
      .insert({
        ...orderData,
        user_id: userId,
        status: 'pending_payment'
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('❌ Error creating customer order:', orderError);
      return { success: false, error: 'Failed to create order' };
    }

    // Process stock operations
    const stockSuccess = await processCheckoutStock(cartItems, order.id);
    if (!stockSuccess) {
      console.error('❌ Stock processing failed for customer order');
      
      // Clean up order
      await supabase.from('customer_orders').delete().eq('id', order.id);
      
      toast({
        title: 'Stock Error',
        description: 'Some items are no longer available. Please check your cart.',
        variant: 'destructive'
      });
      
      return { success: false, error: 'Stock processing failed' };
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_inventory_id: item.productInventoryId,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('customer_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('❌ Error creating customer order items:', itemsError);
      
      // Rollback stock and order
      await rollbackStockReservations(cartItems, order.id);
      await supabase.from('customer_orders').delete().eq('id', order.id);
      
      return { success: false, error: 'Failed to create order items' };
    }

    console.log('✅ Customer order processed successfully:', order.id);
    return { success: true, orderId: order.id };

  } catch (error) {
    console.error('❌ Error processing customer order:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  isCustomerOrder: boolean = false
): Promise<boolean> {
  try {
    console.log('📋 Updating order status:', { orderId, newStatus, isCustomerOrder });

    const orderTable = isCustomerOrder ? 'customer_orders' : 'orders';
    const itemsTable = isCustomerOrder ? 'customer_order_items' : 'order_items';

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from(orderTable)
      .select('status')
      .eq('id', orderId)
      .single();

    if (fetchError || !currentOrder) {
      console.error('❌ Error fetching current order:', fetchError);
      return false;
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from(itemsTable)
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('❌ Error fetching order items:', itemsError);
      return false;
    }

    // Handle stock changes based on status transition
    const stockSuccess = await handleOrderStatusUpdate(
      orderId,
      currentOrder.status,
      newStatus,
      orderItems || []
    );

    if (!stockSuccess) {
      console.error('❌ Stock update failed for order status change');
      toast({
        title: 'Stock Error',
        description: 'Failed to update stock for order status change',
        variant: 'destructive'
      });
      return false;
    }

    // Update order status
    const { error: updateError } = await supabase
      .from(orderTable)
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Error updating order status:', updateError);
      return false;
    }

    console.log('✅ Order status updated successfully');
    return true;

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return false;
  }
}
