
-- Add product_inventory_id to customer_order_item_details for better inventory tracking
ALTER TABLE customer_order_item_details 
ADD COLUMN product_inventory_id uuid REFERENCES product_inventory(id);

-- Add product_inventory_id to order_item_details for better inventory tracking  
ALTER TABLE order_item_details 
ADD COLUMN product_inventory_id uuid REFERENCES product_inventory(id);

-- Add SKU fields to both tables for easier tracking
ALTER TABLE customer_order_item_details 
ADD COLUMN sku text;

ALTER TABLE order_item_details 
ADD COLUMN sku text;

-- Create index for better performance on inventory lookups
CREATE INDEX idx_customer_order_item_details_inventory_id ON customer_order_item_details(product_inventory_id);
CREATE INDEX idx_order_item_details_inventory_id ON order_item_details(product_inventory_id);

-- Update the inventory reservation functions to work with the new structure
CREATE OR REPLACE FUNCTION public.reserve_order_stock_enhanced(p_order_id uuid)
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
                -- Reserve stock for this specific inventory item
                PERFORM safe_update_stock(
                    (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                    0, -- no stock change
                    (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    order_item.quantity, -- increase reserved stock
                    'Order stock reservation - SKU: ' || order_item.sku,
                    p_order_id,
                    order_item.order_number,
                    'reserve'
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE NOTICE 'Failed to reserve stock for SKU %: %', order_item.sku, SQLERRM;
        END;
    END LOOP;
    
    RETURN v_success;
END;
$function$;

-- Create similar function for regular orders
CREATE OR REPLACE FUNCTION public.release_order_stock_enhanced(p_order_id uuid)
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
                -- Release reserved stock for this specific inventory item
                PERFORM safe_update_stock(
                    (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                    0, -- no stock change
                    (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    -order_item.quantity, -- decrease reserved stock
                    'Order stock release - SKU: ' || order_item.sku,
                    p_order_id,
                    order_item.order_number,
                    'release'
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE NOTICE 'Failed to release stock for SKU %: %', order_item.sku, SQLERRM;
        END;
    END LOOP;
    
    RETURN v_success;
END;
$function$;
