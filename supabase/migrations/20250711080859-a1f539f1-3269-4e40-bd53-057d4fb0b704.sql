
-- Create product_inventory table with individual SKUs for each variant
CREATE TABLE public.product_inventory (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sku text NOT NULL UNIQUE,
    product_id uuid NOT NULL,
    color_variant_id uuid,
    size_variant_id uuid,
    product_name text NOT NULL,
    category_name text,
    subcategory_name text,
    color_name text,
    size_name text,
    stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_stock integer NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock integer GENERATED ALWAYS AS (stock_quantity - reserved_stock) STORED,
    low_stock_threshold integer DEFAULT 10,
    cost_price numeric NOT NULL CHECK (cost_price >= 0),
    selling_price numeric CHECK (selling_price >= 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_inventory_pkey PRIMARY KEY (id),
    CONSTRAINT product_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT product_inventory_color_variant_id_fkey FOREIGN KEY (color_variant_id) REFERENCES public.color_variants(id) ON DELETE CASCADE,
    CONSTRAINT product_inventory_size_variant_id_fkey FOREIGN KEY (size_variant_id) REFERENCES public.size_variants(id) ON DELETE CASCADE,
    CONSTRAINT check_reserved_not_exceed_stock CHECK (reserved_stock <= stock_quantity)
);

-- Create indexes for better performance
CREATE INDEX idx_product_inventory_sku ON public.product_inventory(sku);
CREATE INDEX idx_product_inventory_product_id ON public.product_inventory(product_id);
CREATE INDEX idx_product_inventory_variants ON public.product_inventory(product_id, color_variant_id, size_variant_id);
CREATE INDEX idx_product_inventory_active_stock ON public.product_inventory(is_active, available_stock);

-- Create inventory_transactions table to track all stock movements
CREATE TABLE public.inventory_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    inventory_id uuid NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('reserve', 'release', 'fulfill', 'adjust', 'return')),
    quantity_change integer NOT NULL,
    order_id uuid,
    order_number text,
    reason text,
    previous_stock integer NOT NULL,
    previous_reserved integer NOT NULL,
    new_stock integer NOT NULL,
    new_reserved integer NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_transactions_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.product_inventory(id) ON DELETE CASCADE,
    CONSTRAINT inventory_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.customer_orders(id) ON DELETE SET NULL
);

-- Create index for transaction history queries
CREATE INDEX idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_order_id ON public.inventory_transactions(order_id);
CREATE INDEX idx_inventory_transactions_type_date ON public.inventory_transactions(transaction_type, created_at);

-- Function to generate SKU automatically
CREATE OR REPLACE FUNCTION public.generate_product_sku(
    p_product_name text,
    p_color_name text DEFAULT NULL,
    p_size_name text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    base_sku text;
    color_suffix text;
    size_suffix text;
    final_sku text;
    counter integer := 1;
BEGIN
    -- Generate base SKU from product name
    base_sku := UPPER(REGEXP_REPLACE(p_product_name, '[^A-Za-z0-9]', '', 'g'));
    
    -- Limit base SKU to 8 characters
    IF LENGTH(base_sku) > 8 THEN
        base_sku := LEFT(base_sku, 8);
    END IF;
    
    -- Add color suffix if available
    IF p_color_name IS NOT NULL AND p_color_name != '' THEN
        color_suffix := '-' || UPPER(LEFT(REGEXP_REPLACE(p_color_name, '[^A-Za-z0-9]', '', 'g'), 3));
    ELSE
        color_suffix := '';
    END IF;
    
    -- Add size suffix if available
    IF p_size_name IS NOT NULL AND p_size_name != '' THEN
        size_suffix := '-' || UPPER(LEFT(REGEXP_REPLACE(p_size_name, '[^A-Za-z0-9]', '', 'g'), 2));
    ELSE
        size_suffix := '';
    END IF;
    
    -- Combine to create final SKU
    final_sku := base_sku || color_suffix || size_suffix;
    
    -- Ensure uniqueness by adding counter if needed
    WHILE EXISTS (SELECT 1 FROM product_inventory WHERE sku = final_sku) LOOP
        final_sku := base_sku || color_suffix || size_suffix || '-' || counter::text;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_sku;
END;
$$;

-- Function to safely update stock with transaction logging
CREATE OR REPLACE FUNCTION public.safe_update_stock(
    p_product_id uuid,
    p_stock_change integer,
    p_color_variant_id uuid DEFAULT NULL,
    p_size_variant_id uuid DEFAULT NULL,
    p_reservation_change integer DEFAULT 0,
    p_reason text DEFAULT NULL,
    p_order_id uuid DEFAULT NULL,
    p_order_number text DEFAULT NULL,
    p_transaction_type text DEFAULT 'adjust'
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_inventory_id uuid;
    v_current_stock integer;
    v_current_reserved integer;
    v_new_stock integer;
    v_new_reserved integer;
BEGIN
    -- Find the inventory record
    SELECT id, stock_quantity, reserved_stock
    INTO v_inventory_id, v_current_stock, v_current_reserved
    FROM product_inventory
    WHERE product_id = p_product_id
      AND (color_variant_id = p_color_variant_id OR (color_variant_id IS NULL AND p_color_variant_id IS NULL))
      AND (size_variant_id = p_size_variant_id OR (size_variant_id IS NULL AND p_size_variant_id IS NULL));
    
    IF v_inventory_id IS NULL THEN
        RAISE EXCEPTION 'Inventory record not found for product variant';
    END IF;
    
    -- Calculate new values
    v_new_stock := v_current_stock + p_stock_change;
    v_new_reserved := v_current_reserved + p_reservation_change;
    
    -- Validate constraints
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative. Current: %, Change: %', v_current_stock, p_stock_change;
    END IF;
    
    IF v_new_reserved < 0 THEN
        RAISE EXCEPTION 'Reserved stock cannot be negative. Current: %, Change: %', v_current_reserved, p_reservation_change;
    END IF;
    
    IF v_new_reserved > v_new_stock THEN
        RAISE EXCEPTION 'Reserved stock cannot exceed total stock. Stock: %, Reserved: %', v_new_stock, v_new_reserved;
    END IF;
    
    -- Update inventory
    UPDATE product_inventory
    SET 
        stock_quantity = v_new_stock,
        reserved_stock = v_new_reserved,
        updated_at = now()
    WHERE id = v_inventory_id;
    
    -- Log transaction
    INSERT INTO inventory_transactions (
        inventory_id,
        transaction_type,
        quantity_change,
        order_id,
        order_number,
        reason,
        previous_stock,
        previous_reserved,
        new_stock,
        new_reserved,
        created_by
    ) VALUES (
        v_inventory_id,
        p_transaction_type,
        p_stock_change,
        p_order_id,
        p_order_number,
        p_reason,
        v_current_stock,
        v_current_reserved,
        v_new_stock,
        v_new_reserved,
        auth.uid()
    );
    
    RETURN true;
END;
$$;

-- Function to reserve stock for orders
CREATE OR REPLACE FUNCTION public.reserve_order_stock(
    p_order_id uuid
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    order_item record;
    v_success boolean := true;
BEGIN
    -- Loop through all items in the order
    FOR order_item IN
        SELECT 
            coi.product_id,
            coi.quantity,
            co.order_number,
            p.name as product_name,
            cv.color_name,
            sv.size_name,
            cv.id as color_variant_id,
            sv.id as size_variant_id
        FROM customer_order_items coi
        JOIN customer_orders co ON coi.order_id = co.id
        JOIN products p ON coi.product_id = p.id
        LEFT JOIN color_variants cv ON p.has_color_variants AND cv.product_id = p.id
        LEFT JOIN size_variants sv ON cv.has_sizes AND sv.color_variant_id = cv.id
        WHERE coi.order_id = p_order_id
    LOOP
        BEGIN
            -- Reserve stock for this item
            PERFORM safe_update_stock(
                order_item.product_id,
                0, -- no stock change
                order_item.color_variant_id,
                order_item.size_variant_id,
                order_item.quantity, -- increase reserved stock
                'Order stock reservation',
                p_order_id,
                order_item.order_number,
                'reserve'
            );
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE NOTICE 'Failed to reserve stock for product %: %', order_item.product_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN v_success;
END;
$$;

-- Function to release reserved stock (for cancellations)
CREATE OR REPLACE FUNCTION public.release_order_stock(
    p_order_id uuid
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    order_item record;
    v_success boolean := true;
BEGIN
    -- Loop through all items in the order
    FOR order_item IN
        SELECT 
            coi.product_id,
            coi.quantity,
            co.order_number,
            p.name as product_name,
            cv.color_name,
            sv.size_name,
            cv.id as color_variant_id,
            sv.id as size_variant_id
        FROM customer_order_items coi
        JOIN customer_orders co ON coi.order_id = co.id
        JOIN products p ON coi.product_id = p.id
        LEFT JOIN color_variants cv ON p.has_color_variants AND cv.product_id = p.id
        LEFT JOIN size_variants sv ON cv.has_sizes AND sv.color_variant_id = cv.id
        WHERE coi.order_id = p_order_id
    LOOP
        BEGIN
            -- Release reserved stock for this item
            PERFORM safe_update_stock(
                order_item.product_id,
                0, -- no stock change
                order_item.color_variant_id,
                order_item.size_variant_id,
                -order_item.quantity, -- decrease reserved stock
                'Order stock release (cancellation)',
                p_order_id,
                order_item.order_number,
                'release'
            );
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE NOTICE 'Failed to release stock for product %: %', order_item.product_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN v_success;
END;
$$;

-- Function to fulfill order stock (after delivery)
CREATE OR REPLACE FUNCTION public.fulfill_order_stock(
    p_order_id uuid
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    order_item record;
    v_success boolean := true;
BEGIN
    -- Loop through all items in the order
    FOR order_item IN
        SELECT 
            coi.product_id,
            coi.quantity,
            co.order_number,
            p.name as product_name,
            cv.color_name,
            sv.size_name,
            cv.id as color_variant_id,
            sv.id as size_variant_id
        FROM customer_order_items coi
        JOIN customer_orders co ON coi.order_id = co.id
        JOIN products p ON coi.product_id = p.id
        LEFT JOIN color_variants cv ON p.has_color_variants AND cv.product_id = p.id
        LEFT JOIN size_variants sv ON cv.has_sizes AND sv.color_variant_id = cv.id
        WHERE coi.order_id = p_order_id
    LOOP
        BEGIN
            -- Fulfill stock (reduce both total and reserved)
            PERFORM safe_update_stock(
                order_item.product_id,
                -order_item.quantity, -- decrease total stock
                order_item.color_variant_id,
                order_item.size_variant_id,
                -order_item.quantity, -- decrease reserved stock
                'Order fulfillment (delivered)',
                p_order_id,
                order_item.order_number,
                'fulfill'
            );
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE NOTICE 'Failed to fulfill stock for product %: %', order_item.product_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN v_success;
END;
$$;

-- Trigger to automatically reserve stock when order is placed
CREATE OR REPLACE FUNCTION public.handle_order_stock_reservation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Reserve stock when order moves from any status to confirmed/processing
    IF OLD.status != NEW.status AND NEW.status IN ('confirmed', 'processing') THEN
        PERFORM reserve_order_stock(NEW.id);
    END IF;
    
    -- Fulfill stock when order is delivered
    IF OLD.status != NEW.status AND NEW.status = 'delivered' THEN
        PERFORM fulfill_order_stock(NEW.id);
    END IF;
    
    -- Release stock when order is cancelled
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
        PERFORM release_order_stock(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for customer orders
CREATE TRIGGER trigger_customer_order_stock_management
    AFTER UPDATE ON public.customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_stock_reservation();

-- Create trigger for regular orders (for guest checkout)
CREATE TRIGGER trigger_order_stock_management
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_stock_reservation();

-- RLS Policies for product_inventory
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active inventory" ON public.product_inventory
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage inventory" ON public.product_inventory
    FOR ALL USING (is_admin());

-- RLS Policies for inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all inventory transactions" ON public.inventory_transactions
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can create inventory transactions" ON public.inventory_transactions
    FOR INSERT WITH CHECK (is_admin());
