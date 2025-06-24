
-- Enable RLS on delivery_charges table if not already enabled
ALTER TABLE public.delivery_charges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to delivery charges" ON public.delivery_charges;
DROP POLICY IF EXISTS "Allow admin full access to delivery charges" ON public.delivery_charges;

-- Create a policy allowing everyone (including anonymous users) to read active delivery charges
-- This is needed for both authenticated and guest checkout
CREATE POLICY "Allow public read access to active delivery charges" 
ON public.delivery_charges 
FOR SELECT 
USING (is_active = true);

-- Create admin policy for full access (for authenticated admin users)
CREATE POLICY "Allow admin full access to delivery charges" 
ON public.delivery_charges 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
