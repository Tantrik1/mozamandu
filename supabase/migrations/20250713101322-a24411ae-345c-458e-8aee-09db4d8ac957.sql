
-- Remove unnecessary/duplicate tables
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_item_details CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Remove unnecessary columns from customer_order_items since we have detailed tracking in customer_order_item_details
-- We'll keep customer_order_items for basic compatibility but it's redundant

-- Fix the available_stock column to be a proper generated column
ALTER TABLE public.product_inventory 
DROP COLUMN IF EXISTS available_stock;

ALTER TABLE public.product_inventory 
ADD COLUMN available_stock INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_stock) STORED;

-- Add constraint to ensure reserved stock doesn't exceed total stock
ALTER TABLE public.product_inventory 
ADD CONSTRAINT check_reserved_not_exceed_stock 
CHECK (reserved_stock <= stock_quantity);

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_product_inventory_product_variants 
ON public.product_inventory(product_id, color_variant_id, size_variant_id);

CREATE INDEX IF NOT EXISTS idx_product_inventory_active_stock 
ON public.product_inventory(is_active, available_stock) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_customer_orders_status 
ON public.customer_orders(status, created_at);

-- Add proper trigger for order status changes to handle stock management
CREATE OR REPLACE FUNCTION public.handle_customer_order_status_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Log the status change for debugging
    RAISE LOG 'Order % status changed from % to %', NEW.id, COALESCE(OLD.status::text, 'NULL'), NEW.status;
    
    -- Reserve stock when order is created and payment is pending
    IF OLD IS NULL OR (OLD.status != NEW.status AND NEW.status = 'pending_payment') THEN
        RAISE LOG 'Reserving stock for new order %', NEW.id;
        PERFORM reserve_order_stock_enhanced(NEW.id);
    END IF;
    
    -- Additional reservation for payment confirmed (backup)
    IF OLD.status != NEW.status AND NEW.status = 'payment_confirmed' THEN
        RAISE LOG 'Confirming stock reservation for order %', NEW.id;
        PERFORM reserve_order_stock_enhanced(NEW.id);
    END IF;
    
    -- Fulfill stock when order is delivered
    IF OLD.status != NEW.status AND NEW.status = 'delivered' THEN
        RAISE LOG 'Fulfilling stock for order %', NEW.id;
        PERFORM fulfill_order_stock_enhanced(NEW.id);
    END IF;
    
    -- Release stock when order is cancelled
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
        RAISE LOG 'Releasing stock for order %', NEW.id;
        PERFORM release_order_stock_enhanced(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS handle_customer_order_stock_changes ON customer_orders;
CREATE TRIGGER handle_customer_order_stock_changes
    AFTER INSERT OR UPDATE ON customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_customer_order_status_changes();

-- Ensure realtime is enabled for inventory tracking
ALTER TABLE customer_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE product_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transactions;
