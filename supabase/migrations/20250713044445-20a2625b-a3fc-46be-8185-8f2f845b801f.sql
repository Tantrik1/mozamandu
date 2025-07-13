
-- First, let's ensure the customer_orders table can handle all the advanced pricing data
ALTER TABLE customer_orders 
ALTER COLUMN pricing_breakdown TYPE jsonb;

-- Add indexes for better performance on pricing breakdown queries
CREATE INDEX IF NOT EXISTS idx_customer_orders_pricing_breakdown ON customer_orders USING gin(pricing_breakdown);
CREATE INDEX IF NOT EXISTS idx_customer_orders_combo_applied ON customer_orders(combo_applied);

-- Ensure customer_order_item_details has all necessary fields for advanced pricing
ALTER TABLE customer_order_item_details 
ALTER COLUMN pricing_details TYPE jsonb;

-- Add indexes for inventory lookups
CREATE INDEX IF NOT EXISTS idx_customer_order_item_details_sku ON customer_order_item_details(sku);

-- Create a function to validate pricing breakdown structure
CREATE OR REPLACE FUNCTION validate_pricing_breakdown(breakdown jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if the breakdown has required fields
    IF breakdown IS NULL THEN
        RETURN false;
    END IF;
    
    -- Validate structure for different pricing modes
    IF breakdown->>'pricingMode' IN ('combo', 'moq_discount', 'normal') THEN
        -- Check for required fields
        IF breakdown->'subcategoryPricing' IS NOT NULL AND 
           breakdown->'tieredSubtotal' IS NOT NULL AND
           breakdown->'finalTotal' IS NOT NULL THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$;

-- Create enhanced function for stock fulfillment that works with new structure
CREATE OR REPLACE FUNCTION public.fulfill_order_stock_enhanced(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    order_item record;
    v_success boolean := true;
    v_inventory_id uuid;
BEGIN
    -- Loop through all items in the customer order
    FOR order_item IN
        SELECT 
            coid.product_inventory_id,
            coid.sku,
            coid.quantity,
            co.order_number,
            coid.product_name,
            coid.color_name,
            coid.size_name
        FROM customer_order_item_details coid
        JOIN customer_orders co ON coid.order_id = co.id
        WHERE coid.order_id = p_order_id
    LOOP
        BEGIN
            -- Get inventory record
            SELECT id INTO v_inventory_id 
            FROM product_inventory 
            WHERE id = order_item.product_inventory_id;
            
            IF v_inventory_id IS NOT NULL THEN
                -- Fulfill stock (reduce both total and reserved)
                PERFORM safe_update_stock(
                    (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                    -order_item.quantity, -- decrease total stock
                    (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    -order_item.quantity, -- decrease reserved stock
                    'Order fulfillment (delivered) - SKU: ' || order_item.sku,
                    p_order_id,
                    order_item.order_number,
                    'fulfill'
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE NOTICE 'Failed to fulfill stock for SKU %: %', order_item.sku, SQLERRM;
        END;
    END LOOP;
    
    RETURN v_success;
END;
$function$;

-- Update trigger to use enhanced functions
DROP TRIGGER IF EXISTS handle_customer_order_stock_changes ON customer_orders;

CREATE OR REPLACE FUNCTION public.handle_customer_order_stock_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Reserve stock when payment is confirmed
    IF OLD.status != NEW.status AND NEW.status = 'payment_confirmed' THEN
        PERFORM reserve_order_stock_enhanced(NEW.id);
    END IF;
    
    -- Fulfill stock when order is delivered
    IF OLD.status != NEW.status AND NEW.status = 'delivered' THEN
        PERFORM fulfill_order_stock_enhanced(NEW.id);
    END IF;
    
    -- Release stock when order is cancelled
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
        PERFORM release_order_stock_enhanced(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE TRIGGER handle_customer_order_stock_changes
    AFTER UPDATE ON customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_customer_order_stock_changes();
