
-- Add minimum_quantity_for_discount column to subcategories table
ALTER TABLE public.subcategories 
ADD COLUMN minimum_quantity_for_discount INTEGER DEFAULT 1 NOT NULL;

-- Add a check constraint to ensure the minimum quantity is at least 1
ALTER TABLE public.subcategories 
ADD CONSTRAINT check_minimum_quantity_positive 
CHECK (minimum_quantity_for_discount >= 1);
