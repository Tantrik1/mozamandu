-- Fix the trigger to call the correct function name
DROP TRIGGER IF EXISTS handle_customer_order_stock_changes ON customer_orders;

-- Create the trigger with the correct function name
CREATE TRIGGER handle_customer_order_stock_changes
    AFTER UPDATE ON customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_customer_order_stock_changes();