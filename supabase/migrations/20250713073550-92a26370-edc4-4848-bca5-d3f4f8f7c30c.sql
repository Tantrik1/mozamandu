
-- Update the customer_order_item_details to ensure product_inventory_id is properly linked
-- and create better indexes for performance

-- Ensure we have proper indexes for inventory operations
CREATE INDEX IF NOT EXISTS idx_customer_order_item_details_product_inventory_id 
ON customer_order_item_details(product_inventory_id);

CREATE INDEX IF NOT EXISTS idx_customer_order_item_details_order_id_inventory 
ON customer_order_item_details(order_id, product_inventory_id);

-- Add trigger to automatically handle stock operations based on order status changes
CREATE OR REPLACE FUNCTION public.handle_customer_order_status_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Log the status change for debugging
    RAISE LOG 'Order % status changed from % to %', NEW.id, OLD.status, NEW.status;
    
    -- Reserve stock when payment is confirmed
    IF OLD.status != NEW.status AND NEW.status = 'payment_confirmed' THEN
        RAISE LOG 'Reserving stock for order %', NEW.id;
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
    AFTER UPDATE ON customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_customer_order_status_changes();

-- Add real-time updates for order status changes
ALTER TABLE customer_orders REPLICA IDENTITY FULL;
ALTER TABLE customer_order_item_details REPLICA IDENTITY FULL;
ALTER TABLE product_inventory REPLICA IDENTITY FULL;

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE customer_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_order_item_details;
ALTER PUBLICATION supabase_realtime ADD TABLE product_inventory;

-- Update RLS policies to ensure all user types can access order data appropriately
CREATE POLICY IF NOT EXISTS "All users can view order details" ON customer_order_item_details
    FOR SELECT USING (
        -- Admins can see everything
        is_admin() OR 
        -- Users can see their own orders
        EXISTS (
            SELECT 1 FROM customer_orders co 
            WHERE co.id = customer_order_item_details.order_id 
            AND co.user_id = auth.uid()
        ) OR
        -- Guest orders can be viewed by anyone (for order tracking)
        EXISTS (
            SELECT 1 FROM customer_orders co 
            WHERE co.id = customer_order_item_details.order_id 
            AND co.user_id IS NULL
        )
    );

-- Function to get order status with inventory details
CREATE OR REPLACE FUNCTION public.get_order_with_inventory_status(p_order_id uuid)
RETURNS TABLE(
    order_id uuid,
    order_number text,
    status text,
    items jsonb
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        co.id as order_id,
        co.order_number,
        co.status::text,
        jsonb_agg(
            jsonb_build_object(
                'product_name', coid.product_name,
                'sku', coid.sku,
                'quantity', coid.quantity,
                'unit_price', coid.unit_price,
                'total_price', coid.total_price,
                'inventory_id', coid.product_inventory_id,
                'available_stock', pi.available_stock,
                'reserved_stock', pi.reserved_stock
            )
        ) as items
    FROM customer_orders co
    JOIN customer_order_item_details coid ON co.id = coid.order_id
    LEFT JOIN product_inventory pi ON coid.product_inventory_id = pi.id
    WHERE co.id = p_order_id
    GROUP BY co.id, co.order_number, co.status;
END;
$function$;
