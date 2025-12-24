
-- Add missing columns to product_reviews expected by ReviewManagement component
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS reviewer_email TEXT;

-- Add color_id to color_variants for the unique constraint on colors.name
ALTER TABLE public.color_variants ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES public.colors(id);

-- Add unique constraint on colors.name if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'colors_name_key'
  ) THEN
    ALTER TABLE public.colors ADD CONSTRAINT colors_name_key UNIQUE (name);
  END IF;
END $$;
