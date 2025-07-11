
-- Drop the restrictive authenticated-only policies
DROP POLICY IF EXISTS "Allow reading active combos" ON public.combos;
DROP POLICY IF EXISTS "Allow reading combo subcategories" ON public.combo_subcategories;

-- Create new policies that allow public access to active combos
CREATE POLICY "Public can read active combos" ON public.combos
  FOR SELECT 
  USING (status = 'active');

-- Allow public access to combo_subcategories for active combos
CREATE POLICY "Public can read combo subcategories" ON public.combo_subcategories
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.combos 
      WHERE combos.id = combo_subcategories.combo_id 
      AND combos.status = 'active'
    )
  );
