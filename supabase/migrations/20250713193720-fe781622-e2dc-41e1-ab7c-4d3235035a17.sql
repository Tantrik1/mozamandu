-- Enhanced logging for reserve_order_stock_enhanced function
CREATE OR REPLACE FUNCTION public.reserve_order_stock_enhanced(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    order_item record;
    v_success boolean := true;
    v_inventory_id uuid;
    v_error_count integer := 0;
BEGIN
    RAISE LOG 'Starting reserve_order_stock_enhanced for order: %', p_order_id;
    
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
            RAISE LOG 'Processing item: SKU=%, inventory_id=%, quantity=%', 
                order_item.sku, order_item.product_inventory_id, order_item.quantity;
            
            -- Get inventory record
            SELECT id INTO v_inventory_id 
            FROM product_inventory 
            WHERE id = order_item.product_inventory_id;
            
            IF v_inventory_id IS NULL THEN
                RAISE LOG 'ERROR: Inventory record not found for inventory_id: %', order_item.product_inventory_id;
                v_success := false;
                v_error_count := v_error_count + 1;
            ELSE
                RAISE LOG 'Found inventory record: %', v_inventory_id;
                
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
                
                RAISE LOG 'Successfully called safe_update_stock for SKU: %', order_item.sku;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                v_error_count := v_error_count + 1;
                RAISE LOG 'EXCEPTION in reserve_order_stock_enhanced for SKU %: % - %', 
                    order_item.sku, SQLSTATE, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'Completed reserve_order_stock_enhanced: success=%, errors=%', v_success, v_error_count;
    RETURN v_success;
END;
$function$;