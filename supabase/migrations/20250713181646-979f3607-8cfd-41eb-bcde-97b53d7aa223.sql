-- Drop all old triggers that use the incorrect status values
DROP TRIGGER IF EXISTS trigger_customer_order_stock_management ON customer_orders;
DROP TRIGGER IF EXISTS trigger_order_stock_management ON orders;

-- Now drop the old functions
DROP FUNCTION IF EXISTS handle_order_stock_reservation() CASCADE;
DROP FUNCTION IF EXISTS reserve_order_stock(uuid) CASCADE;
DROP FUNCTION IF EXISTS release_order_stock(uuid) CASCADE;
DROP FUNCTION IF EXISTS fulfill_order_stock(uuid) CASCADE;