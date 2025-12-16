-- Create product_reviews table for storing customer/guest reviews
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create reviews (guests and customers)
CREATE POLICY "Anyone can create reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.product_reviews
FOR SELECT
USING (status = 'approved');

-- Policy: Users can view their own reviews
CREATE POLICY "Users can view their own reviews"
ON public.product_reviews
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Policy: Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.product_reviews
FOR SELECT
USING (is_admin());

-- Policy: Admins can update reviews (for approval/rejection)
CREATE POLICY "Admins can update reviews"
ON public.product_reviews
FOR UPDATE
USING (is_admin());

-- Policy: Admins can delete reviews
CREATE POLICY "Admins can delete reviews"
ON public.product_reviews
FOR DELETE
USING (is_admin());

-- Create index for faster product lookups
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);

-- Create function to get product average rating
CREATE OR REPLACE FUNCTION public.get_product_rating(p_product_id uuid)
RETURNS TABLE(average_rating numeric, review_count integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(rating)::numeric, 1) as average_rating,
        COUNT(*)::integer as review_count
    FROM product_reviews
    WHERE product_id = p_product_id AND status = 'approved';
END;
$$;