-- Create trigger for customer_orders status changes to handle stock operations
CREATE TRIGGER trigger_customer_order_stock_changes
  AFTER UPDATE OF status ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_customer_order_stock_changes();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_customer_order_stock_changes ON customer_orders IS 
'Handles stock operations when order status changes: reserve on payment_confirmed, fulfill on delivered, release on cancelled';