-- Drop conflicting RLS policies on delivery_charges
DROP POLICY IF EXISTS "Allow admin full access to delivery charges" ON public.delivery_charges;
DROP POLICY IF EXISTS "Allow public read access to active delivery charges" ON public.delivery_charges;
DROP POLICY IF EXISTS "Anyone can view active delivery charges" ON public.delivery_charges;

-- Create proper PERMISSIVE policies for admins (full CRUD)
CREATE POLICY "Admins can view all delivery charges"
ON public.delivery_charges
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert delivery charges"
ON public.delivery_charges
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update delivery charges"
ON public.delivery_charges
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete delivery charges"
ON public.delivery_charges
FOR DELETE
USING (is_admin());

-- Allow public to view active delivery charges (for checkout)
CREATE POLICY "Public can view active delivery charges"
ON public.delivery_charges
FOR SELECT
USING (is_active = true);