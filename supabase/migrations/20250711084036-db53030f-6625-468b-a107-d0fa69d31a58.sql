
-- First, let's create inventory records for all existing products that don't have them
INSERT INTO product_inventory (
    sku,
    product_id,
    color_variant_id,
    size_variant_id,
    product_name,
    category_name,
    subcategory_name,
    color_name,
    size_name,
    stock_quantity,
    reserved_stock,
    available_stock,
    cost_price,
    selling_price
)
SELECT 
    CASE 
        WHEN cv.id IS NOT NULL AND sv.id IS NOT NULL THEN 
            -- Product with color and size variants
            UPPER(LEFT(REGEXP_REPLACE(p.name, '[^A-Za-z0-9]', '', 'g'), 8)) || '-' || 
            UPPER(LEFT(REGEXP_REPLACE(cv.color_name, '[^A-Za-z0-9]', '', 'g'), 3)) || '-' || 
            UPPER(LEFT(REGEXP_REPLACE(sv.size_name, '[^A-Za-z0-9]', '', 'g'), 2))
        WHEN cv.id IS NOT NULL THEN 
            -- Product with color variants only
            UPPER(LEFT(REGEXP_REPLACE(p.name, '[^A-Za-z0-9]', '', 'g'), 8)) || '-' || 
            UPPER(LEFT(REGEXP_REPLACE(cv.color_name, '[^A-Za-z0-9]', '', 'g'), 3))
        ELSE 
            -- Product without variants
            UPPER(LEFT(REGEXP_REPLACE(p.name, '[^A-Za-z0-9]', '', 'g'), 8))
    END || '-' || ROW_NUMBER() OVER (ORDER BY p.id, cv.id, sv.id) AS sku,
    p.id,
    cv.id,
    sv.id,
    p.name,
    cat.name,
    sub.name,
    cv.color_name,
    sv.size_name,
    100, -- stock_quantity
    0,   -- reserved_stock
    100, -- available_stock
    p.cost_price,
    p.selling_price
FROM products p
JOIN categories cat ON p.category_id = cat.id
JOIN subcategories sub ON p.subcategory_id = sub.id
LEFT JOIN color_variants cv ON p.id = cv.product_id AND p.has_color_variants = true
LEFT JOIN size_variants sv ON cv.id = sv.color_variant_id AND p.color_has_size_variants = true
WHERE NOT EXISTS (
    SELECT 1 FROM product_inventory pi 
    WHERE pi.product_id = p.id 
    AND (pi.color_variant_id = cv.id OR (pi.color_variant_id IS NULL AND cv.id IS NULL))
    AND (pi.size_variant_id = sv.id OR (pi.size_variant_id IS NULL AND sv.id IS NULL))
);

-- Update the available_stock calculated field trigger
CREATE OR REPLACE FUNCTION update_available_stock()
RETURNS TRIGGER AS $$
BEGIN
    NEW.available_stock := NEW.stock_quantity - NEW.reserved_stock;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update available_stock
DROP TRIGGER IF EXISTS trigger_update_available_stock ON product_inventory;
CREATE TRIGGER trigger_update_available_stock
    BEFORE INSERT OR UPDATE ON product_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_available_stock();

-- Add a trigger to automatically create inventory records when products/variants are created
CREATE OR REPLACE FUNCTION create_inventory_on_product_creation()
RETURNS TRIGGER AS $$
DECLARE
    cat_name TEXT;
    sub_name TEXT;
BEGIN
    -- Get category and subcategory names
    SELECT c.name, s.name INTO cat_name, sub_name
    FROM categories c
    JOIN subcategories s ON c.id = s.category_id
    WHERE c.id = NEW.category_id AND s.id = NEW.subcategory_id;
    
    -- Only create inventory for products without variants
    IF NEW.has_color_variants = false AND NEW.color_has_size_variants = false THEN
        INSERT INTO product_inventory (
            sku,
            product_id,
            product_name,
            category_name,
            subcategory_name,
            stock_quantity,
            reserved_stock,
            cost_price,
            selling_price
        ) VALUES (
            generate_product_sku(NEW.name),
            NEW.id,
            NEW.name,
            cat_name,
            sub_name,
            0, -- Will be updated when stock is added
            0,
            NEW.cost_price,
            NEW.selling_price
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new products
DROP TRIGGER IF EXISTS trigger_create_inventory_on_product ON products;
CREATE TRIGGER trigger_create_inventory_on_product
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION create_inventory_on_product_creation();

-- Add trigger for color variants
CREATE OR REPLACE FUNCTION create_inventory_on_color_variant_creation()
RETURNS TRIGGER AS $$
DECLARE
    product_rec RECORD;
    cat_name TEXT;
    sub_name TEXT;
BEGIN
    -- Get product and category info
    SELECT p.*, c.name as category_name, s.name as subcategory_name
    INTO product_rec
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN subcategories s ON p.subcategory_id = s.id
    WHERE p.id = NEW.product_id;
    
    -- Create inventory for color variant without sizes
    IF product_rec.color_has_size_variants = false THEN
        INSERT INTO product_inventory (
            sku,
            product_id,
            color_variant_id,
            product_name,
            category_name,
            subcategory_name,
            color_name,
            stock_quantity,
            reserved_stock,
            cost_price,
            selling_price
        ) VALUES (
            generate_product_sku(product_rec.name, NEW.color_name),
            NEW.product_id,
            NEW.id,
            product_rec.name,
            product_rec.category_name,
            product_rec.subcategory_name,
            NEW.color_name,
            0,
            0,
            product_rec.cost_price,
            product_rec.selling_price
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for color variants
DROP TRIGGER IF EXISTS trigger_create_inventory_on_color_variant ON color_variants;
CREATE TRIGGER trigger_create_inventory_on_color_variant
    AFTER INSERT ON color_variants
    FOR EACH ROW
    EXECUTE FUNCTION create_inventory_on_color_variant_creation();

-- Add trigger for size variants
CREATE OR REPLACE FUNCTION create_inventory_on_size_variant_creation()
RETURNS TRIGGER AS $$
DECLARE
    product_rec RECORD;
    color_rec RECORD;
BEGIN
    -- Get product and color variant info
    SELECT p.*, c.name as category_name, s.name as subcategory_name, cv.color_name
    INTO product_rec
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN subcategories s ON p.subcategory_id = s.id
    JOIN color_variants cv ON p.id = cv.product_id
    WHERE cv.id = NEW.color_variant_id;
    
    -- Create inventory for size variant
    INSERT INTO product_inventory (
        sku,
        product_id,
        color_variant_id,
        size_variant_id,
        product_name,
        category_name,
        subcategory_name,
        color_name,
        size_name,
        stock_quantity,
        reserved_stock,
        cost_price,
        selling_price
    ) VALUES (
        generate_product_sku(product_rec.name, product_rec.color_name, NEW.size_name),
        product_rec.id,
        NEW.color_variant_id,
        NEW.id,
        product_rec.name,
        product_rec.category_name,
        product_rec.subcategory_name,
        product_rec.color_name,
        NEW.size_name,
        0,
        0,
        product_rec.cost_price,
        product_rec.selling_price
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for size variants
DROP TRIGGER IF EXISTS trigger_create_inventory_on_size_variant ON size_variants;
CREATE TRIGGER trigger_create_inventory_on_size_variant
    AFTER INSERT ON size_variants
    FOR EACH ROW
    EXECUTE FUNCTION create_inventory_on_size_variant_creation();
