
-- Align database with existing component expectations

-- PROMO_CODES: The component expects 'promocodes' table with different column names
-- Rename promo_codes to promocodes and adjust columns
ALTER TABLE public.promo_codes RENAME TO promocodes;

-- Add missing columns expected by component
ALTER TABLE public.promocodes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.promocodes RENAME COLUMN discount_value TO discount_percentage;
ALTER TABLE public.promocodes RENAME COLUMN min_order_amount TO minimum_order_amount;

-- Create order_items and customer_order_items as views/aliases (component compatibility)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.customer_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.customer_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON public.customer_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customer_orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own order items" ON public.customer_order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.customer_orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage customer order items" ON public.customer_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create category-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view category images" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "Anyone can upload category images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-images');
CREATE POLICY "Admins can delete category images" ON storage.objects FOR DELETE USING (
  bucket_id = 'category-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Anyone can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Admins can delete product images" ON storage.objects FOR DELETE USING (
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create notice-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('notice-images', 'notice-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view notice images" ON storage.objects FOR SELECT USING (bucket_id = 'notice-images');
CREATE POLICY "Anyone can upload notice images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notice-images');
CREATE POLICY "Admins can delete notice images" ON storage.objects FOR DELETE USING (
  bucket_id = 'notice-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create subcategory-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('subcategory-images', 'subcategory-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view subcategory images" ON storage.objects FOR SELECT USING (bucket_id = 'subcategory-images');
CREATE POLICY "Anyone can upload subcategory images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'subcategory-images');
CREATE POLICY "Admins can delete subcategory images" ON storage.objects FOR DELETE USING (
  bucket_id = 'subcategory-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create color-variant-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('color-variant-images', 'color-variant-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view color variant images" ON storage.objects FOR SELECT USING (bucket_id = 'color-variant-images');
CREATE POLICY "Anyone can upload color variant images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'color-variant-images');
CREATE POLICY "Admins can delete color variant images" ON storage.objects FOR DELETE USING (
  bucket_id = 'color-variant-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
