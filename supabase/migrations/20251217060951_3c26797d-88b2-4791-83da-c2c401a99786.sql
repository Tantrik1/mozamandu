-- Add min and max selling price columns to subcategories
-- Rename existing selling_price to min_selling_price and add max_selling_price

-- First add the new column for max_selling_price
ALTER TABLE public.subcategories 
ADD COLUMN IF NOT EXISTS max_selling_price numeric;

-- Rename selling_price to min_selling_price for clarity
ALTER TABLE public.subcategories 
RENAME COLUMN selling_price TO min_selling_price;

-- Set max_selling_price equal to min_selling_price initially (admin can update later)
UPDATE public.subcategories 
SET max_selling_price = min_selling_price 
WHERE max_selling_price IS NULL;

-- Add a comment explaining the columns
COMMENT ON COLUMN public.subcategories.min_selling_price IS 'Minimum selling price for products in this subcategory (used as default when product has no selling_price)';
COMMENT ON COLUMN public.subcategories.max_selling_price IS 'Maximum selling price for products in this subcategory (used for price range display)';