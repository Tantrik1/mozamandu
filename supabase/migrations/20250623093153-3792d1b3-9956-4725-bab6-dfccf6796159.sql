
-- Remove usage_limit and maximum_discount_amount columns from promocodes table
ALTER TABLE public.promocodes 
DROP COLUMN IF EXISTS usage_limit,
DROP COLUMN IF EXISTS maximum_discount_amount;

-- Create combos table
CREATE TABLE public.combos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create combo_subcategories table (junction table for combo-subcategory relationships)
CREATE TABLE public.combo_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  min_units INTEGER NOT NULL CHECK (min_units > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  qr_code_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for combos (admin access)
CREATE POLICY "Allow read access to combos" ON public.combos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin full access to combos" ON public.combos FOR ALL TO authenticated USING (true);

-- Create policies for combo_subcategories (admin access)
CREATE POLICY "Allow read access to combo_subcategories" ON public.combo_subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin full access to combo_subcategories" ON public.combo_subcategories FOR ALL TO authenticated USING (true);

-- Create policies for payment_methods (admin access)
CREATE POLICY "Allow read access to payment_methods" ON public.payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin full access to payment_methods" ON public.payment_methods FOR ALL TO authenticated USING (true);

-- Add indexes for better performance
CREATE INDEX idx_combo_subcategories_combo_id ON public.combo_subcategories(combo_id);
CREATE INDEX idx_combo_subcategories_subcategory_id ON public.combo_subcategories(subcategory_id);
