-- Add price-based discount column to discount_tiers (backward compatible)
ALTER TABLE public.discount_tiers
ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- Backfill discount_amount from existing discount_percentage (historically used to store amounts)
UPDATE public.discount_tiers
SET discount_amount = discount_percentage
WHERE discount_amount = 0 AND discount_percentage <> 0;