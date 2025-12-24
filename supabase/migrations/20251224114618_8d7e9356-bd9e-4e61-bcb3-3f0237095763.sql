
-- Add status column to product_reviews expected by ReviewManagement
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
