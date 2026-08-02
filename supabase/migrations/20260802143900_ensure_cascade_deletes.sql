-- Ensure ON DELETE CASCADE on all product child table foreign keys
-- This migration is idempotent: it drops and re-adds constraints only if they exist,
-- and creates them if they don't.

-- 1. product_additional_images.product_id → products(id) ON DELETE CASCADE
-- This table may have been created directly in Supabase without a migration file.
DO $$
BEGIN
  -- Drop existing constraint if it exists (may lack CASCADE)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'product_additional_images'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'product_additional_images_product_id_fkey'
  ) THEN
    ALTER TABLE public.product_additional_images
      DROP CONSTRAINT product_additional_images_product_id_fkey;
  END IF;

  -- Re-add with ON DELETE CASCADE (only if the table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'product_additional_images'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.product_additional_images
      ADD CONSTRAINT product_additional_images_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. color_variants.product_id → products(id) ON DELETE CASCADE
-- The initial schema already has ON DELETE CASCADE, but let's ensure it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'color_variants'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'color_variants_product_id_fkey'
  ) THEN
    ALTER TABLE public.color_variants
      DROP CONSTRAINT color_variants_product_id_fkey;
  END IF;

  ALTER TABLE public.color_variants
    ADD CONSTRAINT color_variants_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END $$;

-- 3. product_reviews.product_id → products(id) ON DELETE CASCADE
-- Already set in the creation migration, but let's ensure it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'product_reviews'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'product_reviews_product_id_fkey'
  ) THEN
    ALTER TABLE public.product_reviews
      DROP CONSTRAINT product_reviews_product_id_fkey;
  END IF;

  ALTER TABLE public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END $$;
