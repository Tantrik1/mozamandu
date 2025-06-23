
-- Add minimum_quantity column to subcategories table
ALTER TABLE public.subcategories 
ADD COLUMN minimum_quantity integer NOT NULL DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN public.subcategories.minimum_quantity IS 'Minimum quantity of products from this subcategory required for checkout';
