-- Remove the trigger that automatically reserves stock when payment is confirmed
-- This was causing stock reservations during pending->payment_confirmed transitions
DROP TRIGGER IF EXISTS handle_customer_order_stock_changes ON customer_orders;