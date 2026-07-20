-- Fix search_path security issues for all database functions
-- This prevents potential schema injection attacks

-- Fix validate_pricing_breakdown
CREATE OR REPLACE FUNCTION public.validate_pricing_breakdown(breakdown jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    IF breakdown IS NULL THEN
        RETURN false;
    END IF;
    
    IF breakdown->>'pricingMode' IN ('combo', 'moq_discount', 'normal') THEN
        IF breakdown->'subcategoryPricing' IS NOT NULL AND 
           breakdown->'tieredSubtotal' IS NOT NULL AND
           breakdown->'finalTotal' IS NOT NULL THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$function$;

-- Fix increment_promocode_usage_universal
CREATE OR REPLACE FUNCTION public.increment_promocode_usage_universal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.promocode_used IS NOT NULL AND NEW.promocode_used != '' THEN
    UPDATE public.promocodes 
    SET used_count = COALESCE(used_count, 0) + 1 
    WHERE code = NEW.promocode_used;
    
    RAISE LOG 'Incremented usage count for promocode: %, Current count after increment: %', 
      NEW.promocode_used, 
      (SELECT used_count FROM promocodes WHERE code = NEW.promocode_used);
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix handle_customer_order_stock_changes
CREATE OR REPLACE FUNCTION public.handle_customer_order_stock_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    IF OLD.status != NEW.status AND NEW.status = 'payment_confirmed' THEN
        PERFORM reserve_order_stock_enhanced(NEW.id);
    END IF;
    
    IF OLD.status != NEW.status AND NEW.status = 'delivered' THEN
        PERFORM fulfill_order_stock_enhanced(NEW.id);
    END IF;
    
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
        PERFORM release_order_stock_enhanced(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Fix get_product_variants
CREATE OR REPLACE FUNCTION public.get_product_variants(p_product_id uuid)
 RETURNS TABLE(variant_id uuid, sku text, product_name text, color_name text, size_name text, stock_quantity integer, available_stock integer, price numeric, color_image_url text, color_hex text)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id as variant_id,
        pi.sku,
        pi.product_name,
        pi.color_name,
        pi.size_name,
        pi.stock_quantity,
        pi.available_stock,
        pi.selling_price as price,
        cv.image_url as color_image_url,
        c.hex_code as color_hex
    FROM product_inventory pi
    LEFT JOIN color_variants cv ON pi.color_variant_id = cv.id
    LEFT JOIN colors c ON cv.color_id = c.id
    WHERE pi.product_id = p_product_id 
    AND pi.is_active = true
    ORDER BY pi.color_name, pi.size_name;
END;
$function$;

-- Fix get_product_colors
CREATE OR REPLACE FUNCTION public.get_product_colors(p_product_id uuid)
 RETURNS TABLE(color_id uuid, color_name text, hex_code text, image_url text, total_stock integer)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        c.id as color_id,
        COALESCE(c.name, pi.color_name) as color_name,
        c.hex_code,
        cv.image_url,
        SUM(pi.available_stock)::INTEGER as total_stock
    FROM product_inventory pi
    LEFT JOIN color_variants cv ON pi.color_variant_id = cv.id
    LEFT JOIN colors c ON cv.color_id = c.id
    WHERE pi.product_id = p_product_id 
    AND pi.is_active = true
    GROUP BY c.id, c.name, pi.color_name, c.hex_code, cv.image_url
    HAVING SUM(pi.available_stock) > 0
    ORDER BY color_name;
END;
$function$;

-- Fix get_product_sizes
CREATE OR REPLACE FUNCTION public.get_product_sizes(p_product_id uuid, p_color_name text)
 RETURNS TABLE(size_id uuid, size_name text, size_code text, stock_quantity integer, available_stock integer, variant_id uuid, sku text)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as size_id,
        COALESCE(s.name, pi.size_name) as size_name,
        s.code as size_code,
        pi.stock_quantity,
        pi.available_stock,
        pi.id as variant_id,
        pi.sku
    FROM product_inventory pi
    LEFT JOIN size_variants sv ON pi.size_variant_id = sv.id
    LEFT JOIN sizes s ON sv.size_id = s.id
    WHERE pi.product_id = p_product_id 
    AND pi.color_name = p_color_name
    AND pi.is_active = true
    AND pi.available_stock > 0
    ORDER BY COALESCE(s.sort_order, 999), size_name;
END;
$function$;

-- Fix get_detailed_inventory_analytics
CREATE OR REPLACE FUNCTION public.get_detailed_inventory_analytics()
 RETURNS TABLE(metric_name text, metric_value numeric, description text)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        'total_products'::TEXT,
        COUNT(*)::NUMERIC,
        'Total number of inventory items'::TEXT
    FROM product_inventory
    
    UNION ALL
    
    SELECT 
        'active_products'::TEXT,
        COUNT(*)::NUMERIC,
        'Number of active inventory items'::TEXT
    FROM product_inventory
    WHERE is_active = true
    
    UNION ALL
    
    SELECT 
        'low_stock_items'::TEXT,
        COUNT(*)::NUMERIC,
        'Items with available stock at or below threshold'::TEXT
    FROM product_inventory
    WHERE available_stock <= COALESCE(low_stock_threshold, 10)
    
    UNION ALL
    
    SELECT 
        'out_of_stock_items'::TEXT,
        COUNT(*)::NUMERIC,
        'Items with zero available stock'::TEXT
    FROM product_inventory
    WHERE available_stock = 0
    
    UNION ALL
    
    SELECT 
        'total_stock_value'::TEXT,
        COALESCE(SUM(cost_price * stock_quantity), 0),
        'Total value of all stock at cost price'::TEXT
    FROM product_inventory
    
    UNION ALL
    
    SELECT 
        'total_available_value'::TEXT,
        COALESCE(SUM(cost_price * available_stock), 0),
        'Total value of available stock at cost price'::TEXT
    FROM product_inventory
    
    UNION ALL
    
    SELECT 
        'total_reserved_value'::TEXT,
        COALESCE(SUM(cost_price * reserved_stock), 0),
        'Total value of reserved stock at cost price'::TEXT
    FROM product_inventory
    
    UNION ALL
    
    SELECT 
        'average_stock_level'::TEXT,
        COALESCE(AVG(stock_quantity), 0),
        'Average stock quantity across all items'::TEXT
    FROM product_inventory
    
    UNION ALL
    
    SELECT 
        'stock_turnover_ratio'::TEXT,
        CASE 
            WHEN COALESCE(SUM(cost_price * stock_quantity), 0) > 0 
            THEN COALESCE(SUM(cost_price * available_stock), 0) / COALESCE(SUM(cost_price * stock_quantity), 1)
            ELSE 0 
        END,
        'Ratio of available stock to total stock by value'::TEXT
    FROM product_inventory;
END;
$function$;

-- Fix fulfill_order_stock_enhanced
CREATE OR REPLACE FUNCTION public.fulfill_order_stock_enhanced(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    order_item record;
    v_success boolean := true;
    v_inventory_id uuid;
    v_current_reserved integer;
    v_actual_release_qty integer;
BEGIN
    RAISE LOG 'Starting fulfill_order_stock_enhanced for order: %', p_order_id;
    
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
            RAISE LOG 'Processing fulfill for SKU: %, Quantity: %', order_item.sku, order_item.quantity;
            
            SELECT id, reserved_stock INTO v_inventory_id, v_current_reserved
            FROM product_inventory 
            WHERE id = order_item.product_inventory_id;
            
            IF v_inventory_id IS NOT NULL THEN
                v_actual_release_qty := LEAST(order_item.quantity, v_current_reserved);
                
                RAISE LOG 'Current reserved: %, Requested: %, Actual release: %', 
                    v_current_reserved, order_item.quantity, v_actual_release_qty;
                
                IF v_actual_release_qty > 0 THEN
                    PERFORM safe_update_stock(
                        (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                        -v_actual_release_qty,
                        (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        -v_actual_release_qty,
                        'Order fulfillment (delivered) - SKU: ' || order_item.sku || ' - Released: ' || v_actual_release_qty,
                        p_order_id,
                        order_item.order_number,
                        'fulfill'
                    );
                    
                    RAISE LOG 'Successfully fulfilled % units for SKU: %', v_actual_release_qty, order_item.sku;
                ELSE
                    RAISE LOG 'No reserved stock to fulfill for SKU: %', order_item.sku;
                END IF;
            ELSE
                RAISE LOG 'Inventory record not found for SKU: %', order_item.sku;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE WARNING 'Failed to fulfill stock for SKU %: %', order_item.sku, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'Completed fulfill_order_stock_enhanced for order: %, Success: %', p_order_id, v_success;
    RETURN v_success;
END;
$function$;

-- Fix release_order_stock_enhanced
CREATE OR REPLACE FUNCTION public.release_order_stock_enhanced(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    order_item record;
    v_success boolean := true;
    v_inventory_id uuid;
    v_current_reserved integer;
    v_actual_release_qty integer;
BEGIN
    RAISE LOG 'Starting release_order_stock_enhanced for order: %', p_order_id;
    
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
            RAISE LOG 'Processing release for SKU: %, Quantity: %', order_item.sku, order_item.quantity;
            
            SELECT id, reserved_stock INTO v_inventory_id, v_current_reserved
            FROM product_inventory 
            WHERE id = order_item.product_inventory_id;
            
            IF v_inventory_id IS NOT NULL THEN
                v_actual_release_qty := LEAST(order_item.quantity, v_current_reserved);
                
                RAISE LOG 'Current reserved: %, Requested: %, Actual release: %', 
                    v_current_reserved, order_item.quantity, v_actual_release_qty;
                
                IF v_actual_release_qty > 0 THEN
                    PERFORM safe_update_stock(
                        (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                        0,
                        (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        -v_actual_release_qty,
                        'Order stock release (cancelled) - SKU: ' || order_item.sku || ' - Released: ' || v_actual_release_qty,
                        p_order_id,
                        order_item.order_number,
                        'release'
                    );
                    
                    RAISE LOG 'Successfully released % units for SKU: %', v_actual_release_qty, order_item.sku;
                ELSE
                    RAISE LOG 'No reserved stock to release for SKU: %', order_item.sku;
                END IF;
            ELSE
                RAISE LOG 'Inventory record not found for SKU: %', order_item.sku;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE WARNING 'Failed to release stock for SKU %: %', order_item.sku, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'Completed release_order_stock_enhanced for order: %, Success: %', p_order_id, v_success;
    RETURN v_success;
END;
$function$;

-- Fix generate_product_sku
CREATE OR REPLACE FUNCTION public.generate_product_sku(p_product_name text, p_color_name text DEFAULT NULL::text, p_size_name text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    base_sku text;
    color_suffix text;
    size_suffix text;
    final_sku text;
    counter integer := 1;
BEGIN
    base_sku := UPPER(REGEXP_REPLACE(p_product_name, '[^A-Za-z0-9]', '', 'g'));
    
    IF LENGTH(base_sku) > 8 THEN
        base_sku := LEFT(base_sku, 8);
    END IF;
    
    IF p_color_name IS NOT NULL AND p_color_name != '' THEN
        color_suffix := '-' || UPPER(LEFT(REGEXP_REPLACE(p_color_name, '[^A-Za-z0-9]', '', 'g'), 3));
    ELSE
        color_suffix := '';
    END IF;
    
    IF p_size_name IS NOT NULL AND p_size_name != '' THEN
        size_suffix := '-' || UPPER(LEFT(REGEXP_REPLACE(p_size_name, '[^A-Za-z0-9]', '', 'g'), 2));
    ELSE
        size_suffix := '';
    END IF;
    
    final_sku := base_sku || color_suffix || size_suffix;
    
    WHILE EXISTS (SELECT 1 FROM product_inventory WHERE sku = final_sku) LOOP
        final_sku := base_sku || color_suffix || size_suffix || '-' || counter::text;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_sku;
END;
$function$;

-- Fix bulk_update_inventory
CREATE OR REPLACE FUNCTION public.bulk_update_inventory(p_updates jsonb)
 RETURNS TABLE(success_count integer, error_count integer, errors jsonb)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    update_item JSONB;
    success_count_val INTEGER := 0;
    error_count_val INTEGER := 0;
    errors_array JSONB := '[]'::JSONB;
    result BOOLEAN;
BEGIN
    FOR update_item IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        BEGIN
            result := safe_update_stock(
                (update_item->>'product_id')::UUID,
                (update_item->>'stock_change')::INTEGER,
                CASE WHEN update_item->>'color_variant_id' != 'null' THEN (update_item->>'color_variant_id')::UUID ELSE NULL END,
                CASE WHEN update_item->>'size_variant_id' != 'null' THEN (update_item->>'size_variant_id')::UUID ELSE NULL END,
                (update_item->>'reservation_change')::INTEGER,
                update_item->>'reason'
            );
            
            IF result THEN
                success_count_val := success_count_val + 1;
            ELSE
                error_count_val := error_count_val + 1;
                errors_array := errors_array || jsonb_build_object(
                    'product_id', update_item->>'product_id',
                    'error', 'Update failed'
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                error_count_val := error_count_val + 1;
                errors_array := errors_array || jsonb_build_object(
                    'product_id', update_item->>'product_id',
                    'error', SQLERRM
                );
        END;
    END LOOP;
    
    RETURN QUERY SELECT success_count_val, error_count_val, errors_array;
END;
$function$;

-- Fix export_inventory_data
CREATE OR REPLACE FUNCTION public.export_inventory_data(p_include_inactive boolean DEFAULT false)
 RETURNS TABLE(product_id uuid, sku text, product_name text, category_name text, subcategory_name text, color_name text, size_name text, stock_quantity integer, reserved_stock integer, available_stock integer, low_stock_threshold integer, cost_price numeric, selling_price numeric, stock_status text, last_updated timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pi.product_id,
        pi.sku,
        pi.product_name,
        pi.category_name,
        pi.subcategory_name,
        pi.color_name,
        pi.size_name,
        pi.stock_quantity,
        pi.reserved_stock,
        pi.available_stock,
        COALESCE(pi.low_stock_threshold, 10),
        pi.cost_price,
        pi.selling_price,
        CASE 
            WHEN pi.available_stock = 0 THEN 'Out of Stock'
            WHEN pi.available_stock <= COALESCE(pi.low_stock_threshold, 10) THEN 'Low Stock'
            ELSE 'In Stock'
        END,
        pi.updated_at
    FROM product_inventory pi
    WHERE p_include_inactive OR pi.is_active = true
    ORDER BY pi.category_name, pi.subcategory_name, pi.product_name, pi.color_name, pi.size_name;
END;
$function$;

-- Fix reserve_order_stock_enhanced
CREATE OR REPLACE FUNCTION public.reserve_order_stock_enhanced(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    order_item record;
    v_success boolean := true;
    v_inventory_id uuid;
    v_error_count integer := 0;
BEGIN
    RAISE LOG 'Starting reserve_order_stock_enhanced for order: %', p_order_id;
    
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
            
            SELECT id INTO v_inventory_id 
            FROM product_inventory 
            WHERE id = order_item.product_inventory_id;
            
            IF v_inventory_id IS NULL THEN
                RAISE LOG 'ERROR: Inventory record not found for inventory_id: %', order_item.product_inventory_id;
                v_success := false;
                v_error_count := v_error_count + 1;
            ELSE
                RAISE LOG 'Found inventory record: %', v_inventory_id;
                
                PERFORM safe_update_stock(
                    (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                    0,
                    (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                    order_item.quantity,
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

-- Fix increment_promocode_usage
CREATE OR REPLACE FUNCTION public.increment_promocode_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.promocode_used IS NOT NULL THEN
    UPDATE public.promocodes 
    SET used_count = used_count + 1 
    WHERE code = NEW.promocode_used;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix generate_order_number
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$function$;