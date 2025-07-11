
-- Ensure storage bucket exists for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create comprehensive storage policies
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND 
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images' AND 
    public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' AND 
    public.is_admin()
  );

-- Add RLS policies for all product-related tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin());

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view subcategories" ON public.subcategories;
CREATE POLICY "Anyone can view subcategories" ON public.subcategories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;
CREATE POLICY "Admins can manage subcategories" ON public.subcategories
  FOR ALL USING (public.is_admin());

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin());

ALTER TABLE public.color_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view color variants" ON public.color_variants;
CREATE POLICY "Anyone can view color variants" ON public.color_variants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage color variants" ON public.color_variants;
CREATE POLICY "Admins can manage color variants" ON public.color_variants
  FOR ALL USING (public.is_admin());

ALTER TABLE public.size_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view size variants" ON public.size_variants;
CREATE POLICY "Anyone can view size variants" ON public.size_variants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage size variants" ON public.size_variants;
CREATE POLICY "Admins can manage size variants" ON public.size_variants
  FOR ALL USING (public.is_admin());

-- Add missing foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add foreign key for color_variants -> products
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'color_variants_product_id_fkey'
    ) THEN
        ALTER TABLE public.color_variants 
        ADD CONSTRAINT color_variants_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for size_variants -> color_variants
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'size_variants_color_variant_id_fkey'
    ) THEN
        ALTER TABLE public.size_variants 
        ADD CONSTRAINT size_variants_color_variant_id_fkey 
        FOREIGN KEY (color_variant_id) REFERENCES public.color_variants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_color_variants_product_id ON public.color_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_size_variants_color_variant_id ON public.size_variants(color_variant_id);

-- Ensure proper data types and constraints
ALTER TABLE public.products 
ALTER COLUMN cost_price TYPE DECIMAL(10,2),
ALTER COLUMN selling_price TYPE DECIMAL(10,2);

ALTER TABLE public.subcategories 
ALTER COLUMN selling_price TYPE DECIMAL(10,2);

ALTER TABLE public.discount_tiers 
ALTER COLUMN discount_amount TYPE DECIMAL(10,2);
