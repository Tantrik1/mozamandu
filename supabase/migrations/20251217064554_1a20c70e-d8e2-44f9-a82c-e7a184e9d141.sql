-- Add fabric and care fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS material_composition TEXT DEFAULT 'Premium quality fabric blend designed for comfort and durability.',
ADD COLUMN IF NOT EXISTS care_instructions TEXT[] DEFAULT ARRAY['Machine wash cold with similar colors', 'Do not bleach', 'Tumble dry low', 'Iron on low heat if needed'];