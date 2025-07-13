
-- Fix customer_orders table to allow guest orders
ALTER TABLE public.customer_orders 
ALTER COLUMN user_id DROP NOT NULL;

-- Add missing product_inventory_id to order_items table
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_inventory_id uuid REFERENCES public.product_inventory(id);

-- Add SKU tracking to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS sku text;

-- Ensure all order detail tables have proper inventory tracking
-- (customer_order_item_details and order_item_details already have these fields)

-- Create trigger function for automatic stock validation during order creation
CREATE OR REPLACE FUNCTION public.validate_order_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    inventory_record RECORD;
    required_stock INTEGER;
BEGIN
    -- Get the inventory record
    SELECT pi.* INTO inventory_record
    FROM product_inventory pi
    WHERE pi.id = NEW.product_inventory_id;
    
    -- If no inventory record found, block the operation
    IF inventory_record IS NULL THEN
        RAISE EXCEPTION 'Product inventory record not found for ID: %', NEW.product_inventory_id;
    END IF;
    
    -- Check if enough stock is available
    required_stock := NEW.quantity;
    IF inventory_record.available_stock < required_stock THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Required: % for SKU: %', 
            inventory_record.available_stock, required_stock, inventory_record.sku;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply stock validation trigger to customer order item details
DROP TRIGGER IF EXISTS validate_customer_order_stock ON public.customer_order_item_details;
CREATE TRIGGER validate_customer_order_stock
    BEFORE INSERT ON public.customer_order_item_details
    FOR EACH ROW
    WHEN (NEW.product_inventory_id IS NOT NULL)
    EXECUTE FUNCTION public.validate_order_stock();

-- Apply stock validation trigger to regular order item details  
DROP TRIGGER IF EXISTS validate_order_stock_trigger ON public.order_item_details;
CREATE TRIGGER validate_order_stock_trigger
    BEFORE INSERT ON public.order_item_details
    FOR EACH ROW
    WHEN (NEW.product_inventory_id IS NOT NULL)
    EXECUTE FUNCTION public.validate_order_stock();

-- Create function to automatically populate inventory_id in order items
CREATE OR REPLACE FUNCTION public.auto_populate_inventory_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    inventory_id uuid;
BEGIN
    -- Try to find the inventory record for the product
    -- This is a fallback for cases where inventory_id isn't provided
    IF NEW.product_inventory_id IS NULL THEN
        SELECT pi.id INTO inventory_id
        FROM product_inventory pi
        WHERE pi.product_id = NEW.product_id
        AND pi.is_active = true
        LIMIT 1;  -- Get first available inventory record
        
        NEW.product_inventory_id := inventory_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply auto-population trigger to order_items
DROP TRIGGER IF EXISTS auto_populate_order_items_inventory ON public.order_items;
CREATE TRIGGER auto_populate_order_items_inventory
    BEFORE INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_populate_inventory_id();

-- Update the existing customer order stock management trigger to handle enhanced workflow
DROP TRIGGER IF EXISTS handle_customer_order_stock_changes ON public.customer_orders;
CREATE TRIGGER handle_customer_order_stock_changes
    AFTER UPDATE ON public.customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_customer_order_stock_changes();

-- Create enhanced function for order status tracking across all order types
CREATE OR REPLACE FUNCTION public.get_order_status_with_inventory(p_order_id uuid, p_is_customer_order boolean DEFAULT true)
RETURNS TABLE(
    order_id uuid,
    order_number text,
    status text,
    customer_name text,
    total_amount numeric,
    items jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_is_customer_order THEN
        RETURN QUERY
        SELECT 
            co.id as order_id,
            co.order_number,
            co.status::text,
            co.customer_name,
            co.total_amount,
            jsonb_agg(
                jsonb_build_object(
                    'product_name', coid.product_name,
                    'sku', coid.sku,
                    'quantity', coid.quantity,
                    'unit_price', coid.unit_price,
                    'total_price', coid.total_price,
                    'inventory_id', coid.product_inventory_id,
                    'available_stock', COALESCE(pi.available_stock, 0),
                    'reserved_stock', COALESCE(pi.reserved_stock, 0)
                )
            ) as items
        FROM customer_orders co
        JOIN customer_order_item_details coid ON co.id = coid.order_id
        LEFT JOIN product_inventory pi ON coid.product_inventory_id = pi.id
        WHERE co.id = p_order_id
        GROUP BY co.id, co.order_number, co.status, co.customer_name, co.total_amount;
    ELSE
        RETURN QUERY
        SELECT 
            o.id as order_id,
            o.order_number,
            o.status::text,
            o.customer_name,
            o.total_amount,
            jsonb_agg(
                jsonb_build_object(
                    'product_name', oid.product_name,
                    'sku', oid.sku,
                    'quantity', oid.quantity,
                    'unit_price', oid.unit_price,
                    'total_price', oid.total_price,
                    'inventory_id', oid.product_inventory_id,
                    'available_stock', COALESCE(pi.available_stock, 0),
                    'reserved_stock', COALESCE(pi.reserved_stock, 0)
                )
            ) as items
        FROM orders o
        JOIN order_item_details oid ON o.id = oid.order_id
        LEFT JOIN product_inventory pi ON oid.product_inventory_id = pi.id
        WHERE o.id = p_order_id
        GROUP BY o.id, o.order_number, o.status, o.customer_name, o.total_amount;
    END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_order_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_order_stock() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_populate_inventory_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_populate_inventory_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_order_status_with_inventory(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status_with_inventory(uuid, boolean) TO anon;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_product_inventory_id ON public.order_items(product_inventory_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_user_id_nullable ON public.customer_orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_orders_guest_orders ON public.customer_orders(id) WHERE user_id IS NULL;

-- Ensure proper constraints are in place
ALTER TABLE public.product_inventory 
ADD CONSTRAINT check_reserved_not_exceed_total 
CHECK (reserved_stock <= stock_quantity);

-- Update available_stock to be a generated column for consistency
ALTER TABLE public.product_inventory 
ALTER COLUMN available_stock SET DEFAULT (stock_quantity - reserved_stock);
