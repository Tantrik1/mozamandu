
-- Add columns to track partial payments in orders table
ALTER TABLE public.orders 
ADD COLUMN paid_amount NUMERIC DEFAULT 0,
ADD COLUMN remaining_amount NUMERIC DEFAULT 0,
ADD COLUMN payment_percentage INTEGER DEFAULT 100;

-- Update existing orders to have proper values
UPDATE public.orders 
SET paid_amount = total_amount, 
    remaining_amount = 0, 
    payment_percentage = 100 
WHERE paid_amount IS NULL;

-- Make the columns non-nullable after setting default values
ALTER TABLE public.orders 
ALTER COLUMN paid_amount SET NOT NULL,
ALTER COLUMN remaining_amount SET NOT NULL,
ALTER COLUMN payment_percentage SET NOT NULL;
