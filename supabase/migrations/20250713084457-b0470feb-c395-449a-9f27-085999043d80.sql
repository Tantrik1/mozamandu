
-- Fix the customer_orders table to properly allow guest orders
ALTER TABLE public.customer_orders 
ALTER COLUMN user_id DROP NOT NULL;

-- Verify the constraint is removed
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'customer_orders' 
AND column_name = 'user_id';
