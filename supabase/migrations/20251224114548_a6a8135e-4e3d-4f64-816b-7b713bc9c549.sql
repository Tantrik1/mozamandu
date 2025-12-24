
-- Add missing columns and tables expected by components

-- Add discount_type to promocodes (component expects it)
ALTER TABLE public.promocodes ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed'));

-- Add missing columns to subcategories for tiered pricing
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS min_selling_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS max_selling_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS minimum_quantity INTEGER DEFAULT 1;

-- Create discount_tiers table for subcategory tiered pricing
CREATE TABLE IF NOT EXISTS public.discount_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE CASCADE NOT NULL,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  price_per_unit DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.discount_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view discount tiers" ON public.discount_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage discount tiers" ON public.discount_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add reviewer_name to product_reviews (component expects it)
ALTER TABLE public.product_reviews RENAME COLUMN customer_name TO reviewer_name;

-- Add link column to top_bar_text if not exists
ALTER TABLE public.top_bar_text ADD COLUMN IF NOT EXISTS link TEXT;

-- Create analytics_settings table
CREATE TABLE IF NOT EXISTS public.analytics_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_analytics_id TEXT,
  facebook_pixel_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view analytics settings" ON public.analytics_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage analytics settings" ON public.analytics_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create trigger for discount_tiers updated_at
CREATE TRIGGER update_discount_tiers_updated_at BEFORE UPDATE ON public.discount_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_analytics_settings_updated_at BEFORE UPDATE ON public.analytics_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
