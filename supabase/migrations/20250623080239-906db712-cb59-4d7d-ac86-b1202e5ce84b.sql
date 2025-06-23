
-- Create discount_tiers table to support multiple discount stages
CREATE TABLE IF NOT EXISTS public.discount_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER, -- NULL means no upper limit
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints to ensure logical quantity ranges
ALTER TABLE public.discount_tiers 
ADD CONSTRAINT check_quantity_range 
CHECK (min_quantity > 0 AND (max_quantity IS NULL OR max_quantity >= min_quantity));

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_discount_tiers_subcategory_quantity 
ON public.discount_tiers(subcategory_id, min_quantity, max_quantity);

-- Enable RLS on discount_tiers
ALTER TABLE public.discount_tiers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for discount_tiers
DROP POLICY IF EXISTS "Anyone can view discount tiers" ON public.discount_tiers;
CREATE POLICY "Anyone can view discount tiers" ON public.discount_tiers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage discount tiers" ON public.discount_tiers;
CREATE POLICY "Admins can manage discount tiers" ON public.discount_tiers
  FOR ALL USING (public.is_admin());

-- Remove old discount fields from subcategories as they're now handled by tiers
ALTER TABLE public.subcategories 
DROP COLUMN IF EXISTS discount_amount,
DROP COLUMN IF EXISTS minimum_quantity_for_discount;
