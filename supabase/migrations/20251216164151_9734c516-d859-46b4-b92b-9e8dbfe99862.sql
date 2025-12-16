-- Fix the stock change trigger function to not double-reserve
-- Stock is already reserved at checkout, so payment_confirmed should NOT reserve again
CREATE OR REPLACE FUNCTION public.handle_customer_order_stock_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- NOTE: Stock is ALREADY reserved at checkout time via frontend code
    -- So we do NOT reserve again on payment_confirmed
    -- payment_confirmed status change is just for admin tracking
    
    -- On delivered: fulfill the stock (deduct from total and release reservation)
    IF OLD.status != NEW.status AND NEW.status = 'delivered' THEN
        RAISE LOG 'Order % status changed to delivered - fulfilling stock', NEW.id;
        PERFORM fulfill_order_stock_enhanced(NEW.id);
    END IF;
    
    -- On cancelled: release the reserved stock (make available again)
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
        RAISE LOG 'Order % status changed to cancelled - releasing stock', NEW.id;
        PERFORM release_order_stock_enhanced(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION handle_customer_order_stock_changes() IS 
'Handles stock changes on order status updates. Stock is reserved at checkout, fulfilled on delivered, released on cancelled.';