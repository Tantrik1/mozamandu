
-- First, let's see what policies already exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('combos', 'combo_subcategories');

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow admin full access to combos" ON public.combos;
DROP POLICY IF EXISTS "Allow admin full access to combo subcategories" ON public.combo_subcategories;

-- Enable RLS on both tables (if not already enabled)
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_subcategories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active combos (needed for customer cart functionality)
CREATE POLICY "Allow reading active combos" ON public.combos
  FOR SELECT 
  TO authenticated 
  USING (status = 'active');

-- Allow everyone to read combo_subcategories for active combos
CREATE POLICY "Allow reading combo subcategories" ON public.combo_subcategories
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.combos 
      WHERE combos.id = combo_subcategories.combo_id 
      AND combos.status = 'active'
    )
  );

-- Allow admins to manage combos
CREATE POLICY "Allow admin full access to combos" ON public.combos
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to manage combo subcategories
CREATE POLICY "Allow admin full access to combo subcategories" ON public.combo_subcategories
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
