
-- Fix RLS policies for promocodes table
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active promocodes" ON public.promocodes;
DROP POLICY IF EXISTS "Allow admin full access to promocodes" ON public.promocodes;

-- Create policy allowing everyone to read active promocodes
CREATE POLICY "Allow public read access to active promocodes" 
ON public.promocodes 
FOR SELECT 
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Create admin policy for full access to promocodes
CREATE POLICY "Allow admin full access to promocodes" 
ON public.promocodes 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fix RLS policies for payment methods table
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Allow admin full access to payment methods" ON public.payment_methods;

-- Create policy allowing everyone to read active payment methods
CREATE POLICY "Allow public read access to active payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (is_active = true);

-- Create admin policy for full access to payment methods
CREATE POLICY "Allow admin full access to payment methods" 
ON public.payment_methods 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
