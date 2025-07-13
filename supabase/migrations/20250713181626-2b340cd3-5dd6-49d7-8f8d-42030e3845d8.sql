-- Drop the old trigger that uses incorrect status values
DROP TRIGGER IF EXISTS trigger_customer_order_stock_management ON customer_orders;

-- Also drop the old function that's no longer needed
DROP FUNCTION IF EXISTS handle_order_stock_reservation();
DROP FUNCTION IF EXISTS reserve_order_stock(uuid);
DROP FUNCTION IF EXISTS release_order_stock(uuid);
DROP FUNCTION IF EXISTS fulfill_order_stock(uuid);