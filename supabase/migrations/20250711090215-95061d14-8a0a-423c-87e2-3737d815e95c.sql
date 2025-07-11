
-- Create reusable colors table
CREATE TABLE IF NOT EXISTS public.colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    hex_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reusable sizes table  
CREATE TABLE IF NOT EXISTS public.sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_variants view that combines existing data into SKU format
CREATE OR REPLACE VIEW public.product_variants AS
SELECT 
    pi.id,
    pi.sku,
    pi.product_id,
    cv.id as color_variant_id,
    sv.id as size_variant_id,
    pi.product_name,
    pi.color_name,
    pi.size_name,
    pi.stock_quantity,
    pi.reserved_stock,
    pi.available_stock,
    pi.cost_price,
    pi.selling_price,
    pi.low_stock_threshold,
    pi.is_active,
    cv.image_url as color_image_url,
    p.image_url as product_image_url,
    pi.created_at,
    pi.updated_at
FROM product_inventory pi
LEFT JOIN products p ON pi.product_id = p.id
LEFT JOIN color_variants cv ON pi.color_variant_id = cv.id
LEFT JOIN size_variants sv ON pi.size_variant_id = sv.id;

-- Add foreign key relationships to existing color_variants table to reference colors
ALTER TABLE public.color_variants 
ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES public.colors(id);

-- Add foreign key relationships to existing size_variants table to reference sizes  
ALTER TABLE public.size_variants
ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES public.sizes(id);

-- Insert default colors
INSERT INTO public.colors (name, hex_code) VALUES
('Black', '#000000'),
('White', '#FFFFFF'),
('Red', '#FF0000'),
('Blue', '#0000FF'),
('Green', '#008000'),
('Yellow', '#FFFF00'),
('Pink', '#FFC0CB'),
('Purple', '#800080'),
('Orange', '#FFA500'),
('Gray', '#808080'),
('Brown', '#A52A2A'),
('Navy', '#000080'),
('Maroon', '#800000'),
('Teal', '#008080'),
('Silver', '#C0C0C0')
ON CONFLICT (name) DO NOTHING;

-- Insert default sizes
INSERT INTO public.sizes (name, code, sort_order) VALUES
('Extra Small', 'XS', 1),
('Small', 'S', 2),
('Medium', 'M', 3),
('Large', 'L', 4),
('Extra Large', 'XL', 5),
('Double Extra Large', 'XXL', 6),
('Triple Extra Large', 'XXXL', 7),
('One Size', 'OS', 8)
ON CONFLICT (name) DO NOTHING;

-- Enhanced function to get product variants with full details
CREATE OR REPLACE FUNCTION get_product_variants(p_product_id UUID)
RETURNS TABLE (
    variant_id UUID,
    sku TEXT,
    product_name TEXT,
    color_name TEXT,
    size_name TEXT,
    stock_quantity INTEGER,
    available_stock INTEGER,
    price NUMERIC,
    color_image_url TEXT,
    color_hex TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get available colors for a product
CREATE OR REPLACE FUNCTION get_product_colors(p_product_id UUID)
RETURNS TABLE (
    color_id UUID,
    color_name TEXT,
    hex_code TEXT,
    image_url TEXT,
    total_stock INTEGER
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get available sizes for a product color
CREATE OR REPLACE FUNCTION get_product_sizes(p_product_id UUID, p_color_name TEXT)
RETURNS TABLE (
    size_id UUID,
    size_name TEXT,
    size_code TEXT,
    stock_quantity INTEGER,
    available_stock INTEGER,
    variant_id UUID,
    sku TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for colors
CREATE POLICY "Anyone can view active colors" ON public.colors
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage colors" ON public.colors
    FOR ALL USING (is_admin());

-- RLS Policies for sizes
CREATE POLICY "Anyone can view active sizes" ON public.sizes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage sizes" ON public.sizes
    FOR ALL USING (is_admin());
